import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@18.5.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MIGRATE-SUBSCRIPTIONS] ${step}${d}`);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Auth check — admin/ceo only
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).in('role', ['admin', 'ceo']).maybeSingle();
    if (!roleData) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });

    const { action, source_product_id, target_price_id, proration_behavior } = await req.json();

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return new Response(JSON.stringify({ error: 'Stripe not configured' }), { status: 500, headers: corsHeaders });
    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });

    // ACTION: preview — count how many subs would be migrated
    if (action === 'preview') {
      logStep('Preview migration', { source_product_id });
      let count = 0;
      let hasMore = true;
      let startingAfter: string | undefined;

      while (hasMore) {
        const params: any = { status: 'active', limit: 100 };
        if (startingAfter) params.starting_after = startingAfter;
        const subs = await stripe.subscriptions.list(params);

        for (const sub of subs.data) {
          const prodId = sub.items.data[0]?.price?.product as string | undefined;
          if (prodId === source_product_id) count++;
        }

        hasMore = subs.has_more;
        if (subs.data.length > 0) startingAfter = subs.data[subs.data.length - 1].id;
      }

      return new Response(JSON.stringify({ count }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ACTION: migrate — update all subscriptions
    if (action === 'migrate') {
      if (!source_product_id || !target_price_id) {
        return new Response(JSON.stringify({ error: 'Missing source_product_id or target_price_id' }), { status: 400, headers: corsHeaders });
      }

      logStep('Starting migration', { source_product_id, target_price_id, proration_behavior });

      let migrated = 0;
      let failed = 0;
      const errors: string[] = [];
      let hasMore = true;
      let startingAfter: string | undefined;

      while (hasMore) {
        const params: any = { status: 'active', limit: 100 };
        if (startingAfter) params.starting_after = startingAfter;
        const subs = await stripe.subscriptions.list(params);

        for (const sub of subs.data) {
          const prodId = sub.items.data[0]?.price?.product as string | undefined;
          if (prodId !== source_product_id) continue;

          try {
            const itemId = sub.items.data[0].id;
            await stripe.subscriptions.update(sub.id, {
              items: [{ id: itemId, price: target_price_id }],
              proration_behavior: proration_behavior || 'create_prorations',
            });
            migrated++;
            logStep('Migrated subscription', { subId: sub.id });
          } catch (err: any) {
            failed++;
            const msg = `${sub.id}: ${err.message || String(err)}`;
            errors.push(msg);
            logStep('Failed to migrate', { subId: sub.id, error: err.message });
          }
        }

        hasMore = subs.has_more;
        if (subs.data.length > 0) startingAfter = subs.data[subs.data.length - 1].id;
      }

      logStep('Migration complete', { migrated, failed });

      return new Response(JSON.stringify({ migrated, failed, errors: errors.slice(0, 10) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: corsHeaders });
  } catch (err: any) {
    logStep('ERROR', { message: err.message || String(err) });
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500, headers: corsHeaders });
  }
});
