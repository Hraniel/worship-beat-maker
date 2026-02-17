import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
    logStep("User authenticated", { email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });

    // Retry Stripe customer lookup to handle intermittent API issues
    const customers = await retryAsync(() => stripe.customers.list({ email, limit: 1 }));
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ subscribed: false, product_id: null, subscription_end: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

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
