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
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Missing email" }),
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

    await resend.emails.send({
      from: "Glory Pads <support@glorypads.com>",
      to: [email],
      subject: "Bem-vindo ao Glory Pads! 🎶",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; padding: 40px 24px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: 700; color: #1a1a2e; margin: 0 0 8px 0;">Bem-vindo ao Glory Pads!</h1>
            <p style="font-size: 15px; color: #6b7280; margin: 0;">Sua conta foi criada com sucesso.</p>
          </div>
          <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="font-size: 14px; color: #374151; line-height: 1.6; margin: 0;">
              Estamos muito felizes em ter você conosco! O Glory Pads foi criado por músicos de louvor, para músicos de louvor. 
              Explore os pads, configure suas setlists e leve seu momento de worship a outro nível.
            </p>
          </div>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="https://worship-beat-maker.lovable.app/app" style="display: inline-block; background: #1a1a2e; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 32px; border-radius: 10px; text-decoration: none;">
              Acessar o App
            </a>
          </div>
          <p style="font-size: 13px; color: #9ca3af; text-align: center; margin: 0;">
            Qualquer dúvida, estamos aqui para ajudar!
          </p>
          <div style="text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #d1d5db; margin: 0;">Glory Pads — Seus pads de worship na palma da mão</p>
          </div>
        </div>
      `,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Welcome email error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
