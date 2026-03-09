import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

async function retryAsync<T>(fn: () => Promise<T>, retries = 2, delay = 500): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries) throw err;
      logStep(`Retry ${i + 1}/${retries} after error`, { error: String(err) });
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
  throw new Error("Unreachable");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      logStep("No auth header");
      return new Response(JSON.stringify({ subscribed: false, product_id: null, subscription_end: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
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
      return new Response(JSON.stringify({ subscribed: false, product_id: null, subscription_end: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const email = userData.user.email;
    const userId = userData.user.id;
    logStep("User authenticated", { email, userId });

    // --- Check granted_tiers BEFORE Stripe ---
    const TIER_PRODUCT_MAP: Record<string, string> = {
      pro: "prod_Tz7nOBkWdUxb9Q",
      master: "prod_Tz7oenwSZLQFdS",
      lifetime: "prod_U5set4nFJ33JoH",
    };

    const { data: grantedRows, error: grantedError } = await supabaseClient
      .from("granted_tiers")
      .select("tier, expires_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!grantedError && grantedRows && grantedRows.length > 0) {
      const grant = grantedRows[0];
      const isValid = !grant.expires_at || new Date(grant.expires_at) > new Date();
      if (isValid && TIER_PRODUCT_MAP[grant.tier]) {
        logStep("Granted tier found and valid", { tier: grant.tier, expires_at: grant.expires_at });
        return new Response(JSON.stringify({
          subscribed: true,
          product_id: TIER_PRODUCT_MAP[grant.tier],
          subscription_end: grant.expires_at,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      logStep("Granted tier expired or unknown", { tier: grant.tier, expires_at: grant.expires_at });
    }

    // --- Fallback to Stripe ---
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });

    // Fetch payment config BEFORE using it
    const { data: lifetimeConfig } = await supabaseClient
      .from("app_config")
      .select("config_key, config_value")
      .in("config_key", ["payment_mode", "lifetime_stripe_product_id"]);

    const paymentMode = lifetimeConfig?.find((c: any) => c.config_key === "payment_mode")?.config_value;
    const lifetimeProductId = lifetimeConfig?.find((c: any) => c.config_key === "lifetime_stripe_product_id")?.config_value;

    // Retry Stripe customer lookup to handle intermittent API issues
    const customers = await retryAsync(() => stripe.customers.list({ email, limit: 1 }));
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");

      // Fallback: check recent checkout sessions by email for lifetime purchases
      if (paymentMode === "lifetime" && lifetimeProductId) {
        try {
          const sessions = await retryAsync(() =>
            stripe.checkout.sessions.list({ customer_email: email, status: "complete", limit: 20 })
          );
          const hasLifetime = sessions.data.some((s: any) =>
            s.mode === "payment" && s.metadata?.purchase_type === "lifetime" && s.payment_status === "paid"
          );
          if (hasLifetime) {
            logStep("Lifetime purchase found via session email fallback");
            return new Response(JSON.stringify({
              subscribed: true,
              product_id: lifetimeProductId,
              subscription_end: null,
              is_lifetime: true,
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            });
          }
        } catch (e) {
          logStep("Error in session email fallback", { error: String(e) });
        }
      }

      return new Response(JSON.stringify({ subscribed: false, product_id: null, subscription_end: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    if (paymentMode === "lifetime" && lifetimeProductId) {
      // Check for completed checkout sessions with this product
      try {
        const sessions = await retryAsync(() =>
          stripe.checkout.sessions.list({
            customer: customerId,
            status: "complete",
            limit: 100,
          })
        );

        const hasLifetime = sessions.data.some((s: any) => {
          return s.mode === "payment" && s.metadata?.purchase_type === "lifetime";
        });

        if (hasLifetime) {
          logStep("Lifetime purchase found");
          return new Response(JSON.stringify({
            subscribed: true,
            product_id: lifetimeProductId,
            subscription_end: null,
            is_lifetime: true,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      } catch (e) {
        logStep("Error checking lifetime sessions", { error: String(e) });
      }
    }

    // Retry subscription lookup too
    const subscriptions = await retryAsync(() => 
      stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 })
    );

    if (subscriptions.data.length === 0) {
      logStep("No active subscription");
      return new Response(JSON.stringify({ subscribed: false, product_id: null, subscription_end: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const sub = subscriptions.data[0];
    const productId = sub.items.data[0]?.price?.product as string;
    const periodEnd = sub.current_period_end;
    const subscriptionEnd = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
    logStep("Active subscription found", { productId, subscriptionEnd });

    return new Response(JSON.stringify({ subscribed: true, product_id: productId, subscription_end: subscriptionEnd }), {
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
