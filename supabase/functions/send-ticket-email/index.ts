import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Verify admin role using service role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { ticketId, newStatus } = await req.json();

    if (!ticketId || !newStatus) {
      return new Response(JSON.stringify({ error: "ticketId e newStatus são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map status to template key
    const templateKeyMap: Record<string, string> = {
      received: "ticket_received",
      in_progress: "ticket_in_progress",
      done: "ticket_done",
    };

    const templateKey = templateKeyMap[newStatus];
    if (!templateKey) {
      return new Response(JSON.stringify({ error: "Status inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch template
    const { data: template } = await adminClient
      .from("email_templates")
      .select("*")
      .eq("template_key", templateKey)
      .maybeSingle();

    if (!template || !template.enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "Template desativado ou não encontrado" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch ticket
    const { data: ticket } = await adminClient
      .from("support_tickets")
      .select("*")
      .eq("id", ticketId)
      .maybeSingle();

    if (!ticket) {
      return new Response(JSON.stringify({ error: "Ticket não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Status labels
    const statusLabels: Record<string, string> = {
      received: "Recebido",
      in_progress: "Em Andamento",
      done: "Finalizado",
    };

    const appUrl = "https://worship-beat-maker.lovable.app";

    // Replace variables in template
    const replacePlaceholders = (text: string) =>
      text
        .replace(/\{\{nome\}\}/g, ticket.full_name)
        .replace(/\{\{status\}\}/g, statusLabels[newStatus] || newStatus)
        .replace(/\{\{pergunta\}\}/g, ticket.question)
        .replace(/\{\{app_url\}\}/g, appUrl);

    const subject = replacePlaceholders(template.subject);
    const html = replacePlaceholders(template.body_html);

    // Send email via Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const { error: sendError } = await resend.emails.send({
      from: "Glory Pads <onboarding@resend.dev>",
      to: [ticket.email],
      subject,
      html,
    });

    if (sendError) {
      console.error("Resend error:", sendError);
      return new Response(JSON.stringify({ error: "Erro ao enviar email", detail: sendError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-ticket-email error:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
