import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, full_name, phone } = await req.json();

    if (!email || !full_name) {
      return new Response(
        JSON.stringify({ error: "Missing email or full_name" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("RESEND_API_KEY not set");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(resendKey);

    // Try to get the audience ID from env, or create/find one
    let audienceId = Deno.env.get("RESEND_PRELAUNCH_AUDIENCE_ID");

    if (!audienceId) {
      const { data: audiences } = await resend.audiences.list();
      const existing = audiences?.data?.find(
        (a: any) => a.name === "Glory Pads - Pre-lancamento"
      );

      if (existing) {
        audienceId = existing.id;
      } else {
        const { data: newAudience } = await resend.audiences.create({
          name: "Glory Pads - Pre-lancamento",
        });
        audienceId = newAudience?.id;
      }
    }

    if (!audienceId) {
      console.error("Could not create or find audience");
      return new Response(
        JSON.stringify({ error: "Could not create audience" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Add contact to audience
    const { error: contactError } = await resend.contacts.create({
      audienceId,
      email,
      firstName: full_name.split(" ")[0],
      lastName: full_name.split(" ").slice(1).join(" ") || undefined,
      unsubscribed: false,
    });

    if (contactError) {
      console.error("Error adding contact:", contactError);
    }

    // Send confirmation email to the lead
    const firstName = full_name.split(" ")[0];
    try {
      await resend.emails.send({
        from: "Glory Pads <support@glorypads.com>",
        to: [email],
        subject: "Pré-cadastro confirmado! 🎉",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; padding: 40px 24px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-size: 24px; font-weight: 700; color: #1a1a2e; margin: 0 0 8px 0;">Olá, ${firstName}!</h1>
              <p style="font-size: 15px; color: #6b7280; margin: 0;">Seu pré-cadastro foi confirmado com sucesso.</p>
            </div>
            <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
              <p style="font-size: 14px; color: #374151; line-height: 1.6; margin: 0;">
                Você está na lista de espera do <strong>Glory Pads</strong>! Quando estivermos prontos para o lançamento, você será um dos primeiros a saber.
              </p>
            </div>
            <p style="font-size: 13px; color: #9ca3af; text-align: center; margin: 0;">
              Fique de olho no seu e-mail — boas notícias estão chegando!
            </p>
            <div style="text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 12px; color: #d1d5db; margin: 0;">Glory Pads — Seus pads de worship na palma da mão</p>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Error sending confirmation email:", emailErr);
      // Don't fail the whole request if email fails
    }

    return new Response(
      JSON.stringify({ success: true, audienceId }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Prelaunch lead error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
