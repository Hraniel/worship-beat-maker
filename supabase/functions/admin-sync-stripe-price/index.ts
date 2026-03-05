import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  console.log(`[ADMIN-SYNC-STRIPE-PRICE] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

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
    if (userError || !userData.user) throw new Error("Unauthorized");

    // Verify admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["admin", "ceo"])
      .maybeSingle();
    if (!roleData) throw new Error("Forbidden: admin only");

    const body = await req.json();
    const { type, id, price_cents, name, current_stripe_price_id, current_stripe_product_id, is_one_time } = body;

    if (!type || !id || price_cents === undefined || !name) {
      throw new Error("Missing required fields: type, id, price_cents, name");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    // ── Resolve or create Stripe Product ──────────────────────────────────────
    let productId: string = current_stripe_product_id ?? "";

    if (type === "pack") {
      if (!productId) {
        log("Creating new Stripe product for pack", { name, id });
        const product = await stripe.products.create({
          name,
          metadata: { pack_id: id, type: "pack" },
        });
        productId = product.id;
        log("Product created", { productId });
      }
    } else if (type === "plan") {
      // Plans use fixed product IDs (managed in tiers.ts / Stripe)
      if (!productId) throw new Error("product_id is required for plan sync");
    } else if (type === "lifetime") {
      // Lifetime uses fixed product ID
      if (!productId) throw new Error("product_id is required for lifetime sync");
    } else {
      throw new Error("Invalid type: must be 'pack', 'plan', or 'lifetime'");
    }

    // ── Create new Stripe Price ────────────────────────────────────────────────
    const priceParams: Stripe.PriceCreateParams = {
      product: productId,
      unit_amount: price_cents,
      currency: "brl",
    };

    // Only add recurring for subscription plans (not packs or lifetime)
    if (type === "plan" && !is_one_time) {
      priceParams.recurring = { interval: "month" };
    }

    log("Creating new Stripe price", { productId, price_cents, type });
    const newPrice = await stripe.prices.create(priceParams);
    log("Price created", { priceId: newPrice.id });

    // ── Archive old price (if any) ────────────────────────────────────────────
    if (current_stripe_price_id && current_stripe_price_id !== newPrice.id) {
      try {
        await stripe.prices.update(current_stripe_price_id, { active: false });
        log("Archived old price", { old: current_stripe_price_id });
      } catch (e) {
        log("Could not archive old price (may already be inactive)", { e });
      }
    }

    return new Response(
      JSON.stringify({ stripe_price_id: newPrice.id, stripe_product_id: productId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
