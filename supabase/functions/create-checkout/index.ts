import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      logStep("No auth header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) {
      logStep("Auth error", { error: userError?.message });
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const email = userData.user.email;
    logStep("User authenticated", { email });

    const body = await req.json();
    // Accept either a tier name (new, preferred) or a direct priceId (legacy fallback)
    const tier: string | undefined = body.tier;
    const legacyPriceId: string | undefined = body.priceId;

    let priceId: string;

    if (tier) {
      // Look up current stripe_price_id from plan_pricing DB
      logStep("Looking up stripe_price_id from DB", { tier });
      const { data: planData, error: planErr } = await supabaseClient
        .from("plan_pricing")
        .select("stripe_price_id")
        .eq("tier", tier)
        .maybeSingle();

      if (planErr || !planData?.stripe_price_id) {
        logStep("No stripe_price_id found in DB, tier not found", { tier, planErr });
        throw new Error(`No Stripe price configured for tier: ${tier}`);
      }
      priceId = planData.stripe_price_id;
      logStep("Resolved stripe_price_id from DB", { tier, priceId });
    } else if (legacyPriceId && /^price_[a-zA-Z0-9]{1,100}$/.test(legacyPriceId)) {
      // Legacy: frontend passed price_id directly
      priceId = legacyPriceId;
      logStep("Using legacy priceId from request", { priceId });
    } else {
      logStep("Invalid or missing tier/priceId");
      throw new Error("A valid tier or priceId is required");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    } else {
      logStep("No existing customer, will create via checkout");
    }

    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/[^/]*$/, "") || "https://worship-beat-maker.lovable.app";
    logStep("Using origin", { origin });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/app`,
      cancel_url: `${origin}/app`,
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
