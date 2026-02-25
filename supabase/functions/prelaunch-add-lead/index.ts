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
      // List audiences and find or create "Glory Pads - Pré-lançamento"
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
