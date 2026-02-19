import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) =>
  console.log(`[CREATE-PACK-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("Unauthorized");
    const user = userData.user;
    log("User authenticated", { userId: user.id, email: user.email });

    const { packId } = await req.json();
    if (!packId) throw new Error("packId is required");

    // Fetch pack details
    const { data: pack, error: packErr } = await supabase
      .from("store_packs")
      .select("id, name, price_cents, is_available, stripe_price_id")
      .eq("id", packId)
      .single();

    if (packErr || !pack) throw new Error("Pack not found");
    if (!pack.is_available) throw new Error("Pack not available");
    if (!pack.price_cents || pack.price_cents === 0) throw new Error("Pack is free — use purchase-pack instead");
    if (!pack.stripe_price_id) throw new Error("Pack has no Stripe price configured. Please sync the price in the admin panel first.");

    // Check if already purchased
    const { data: existing } = await supabase
      .from("user_purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("pack_id", packId)
      .maybeSingle();
    if (existing) throw new Error("Pack already purchased");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    // Find or use existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    const origin = req.headers.get("origin") || "https://worship-beat-maker.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: pack.stripe_price_id as string, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/store/${packId}?payment_success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/store/${packId}`,
      metadata: {
        pack_id: packId,
        user_id: user.id,
      },
    });

    log("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
