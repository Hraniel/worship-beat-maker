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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

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

    const { ticketId, newStatus, adminMessage } = await req.json();

    if (!ticketId) {
      return new Response(JSON.stringify({ error: "ticketId é obrigatório" }), {
        status: 400,
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

    // Fetch app_url from landing_config (admin-configurable)
    const { data: appUrlConfig } = await adminClient
      .from("landing_config")
      .select("config_value")
      .eq("config_key", "app_url")
      .maybeSingle();

    const appUrl = appUrlConfig?.config_value || "https://worship-beat-maker.lovable.app";

    // Handle admin reply notification
    if (newStatus === "admin_reply" && adminMessage) {
      // Try to load admin_reply template, fallback to inline
      const { data: replyTemplate } = await adminClient
        .from("email_templates")
        .select("*")
        .eq("template_key", "ticket_admin_reply")
        .maybeSingle();

      let subject: string;
      let html: string;

      if (replyTemplate?.enabled) {
        subject = replyTemplate.subject
          .replace(/\{\{nome\}\}/g, ticket.full_name)
          .replace(/\{\{app_url\}\}/g, appUrl);
        html = replyTemplate.body_html
          .replace(/\{\{nome\}\}/g, ticket.full_name)
          .replace(/\{\{mensagem\}\}/g, adminMessage)
          .replace(/\{\{pergunta\}\}/g, ticket.question)
          .replace(/\{\{app_url\}\}/g, appUrl);
      } else {
        subject = `Glory Pads — Nova resposta no seu ticket de suporte`;
        html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #7c3aed;">Glory Pads — Suporte</h2>
            <p>Olá <strong>${ticket.full_name}</strong>,</p>
            <p>Nosso suporte respondeu ao seu ticket:</p>
            <div style="background: #f3f4f6; border-left: 4px solid #7c3aed; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
              <p style="margin: 0; white-space: pre-wrap;">${adminMessage}</p>
            </div>
            <p style="color: #6b7280; font-size: 14px;"><strong>Sua pergunta original:</strong> ${ticket.question}</p>
            <p>Acesse <a href="${appUrl}/my-tickets" style="color: #7c3aed;">Meus Tickets</a> para responder.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #9ca3af; font-size: 12px;">Glory Pads — Feito com amor para adoradores.</p>
          </div>
        `;
      }

      const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
      const { error: sendError } = await resend.emails.send({
        from: "Glory Pads <support@glorypads.com>",
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
    }

    // Handle status change emails (existing logic)
    if (!newStatus) {
      return new Response(JSON.stringify({ error: "newStatus é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const statusLabels: Record<string, string> = {
      received: "Recebido",
      in_progress: "Em Andamento",
      done: "Finalizado",
    };

    const replacePlaceholders = (text: string) =>
      text
        .replace(/\{\{nome\}\}/g, ticket.full_name)
        .replace(/\{\{status\}\}/g, statusLabels[newStatus] || newStatus)
        .replace(/\{\{pergunta\}\}/g, ticket.question)
        .replace(/\{\{app_url\}\}/g, appUrl);

    const subject = replacePlaceholders(template.subject);
    const html = replacePlaceholders(template.body_html);

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const { error: sendError } = await resend.emails.send({
      from: "Glory Pads <support@glorypads.com>",
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
