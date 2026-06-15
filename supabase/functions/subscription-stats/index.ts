import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@18.5.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PRO_PRODUCT_ID = 'prod_Tz7nOBkWdUxb9Q';
const MASTER_PRODUCT_ID = 'prod_Tz7oenwSZLQFdS';
const PRO_PRICE = 9.99;
const MASTER_PRICE = 14.99;

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const anonClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: authUser }, error: userErr } = await anonClient.auth.getUser(token);
    const userId = authUser?.id;
    if (userErr || !userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
    }

    // Check admin role
    const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', userId).in('role', ['admin', 'ceo']).maybeSingle();
    if (!roleData) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: jsonHeaders });

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return new Response(JSON.stringify({ error: 'Stripe not configured' }), { status: 500, headers: jsonHeaders });

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });

    // Get CEO user IDs to exclude from stats
    const { data: ceoRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'ceo');
    const ceoUserIds = new Set((ceoRoles || []).map((r: any) => r.user_id));

    // Get CEO emails from auth.users
    const ceoEmails = new Set<string>();
    for (const uid of ceoUserIds) {
      const { data: { user: ceoUser } } = await supabase.auth.admin.getUserById(uid);
      if (ceoUser?.email) ceoEmails.add(ceoUser.email.toLowerCase());
    }

    // List active subscriptions (fetch up to 100)
    const subscriptions = await stripe.subscriptions.list({ status: 'active', limit: 100 });

    let pro_count = 0;
    let master_count = 0;

    for (const sub of subscriptions.data) {
      // Exclude CEO subscriptions
      const customerEmail = (sub.customer as any)?.email?.toLowerCase?.() ?? '';
      if (ceoEmails.has(customerEmail)) continue;

      // If customer is just an ID, fetch the customer to get email
      if (typeof sub.customer === 'string' && ceoEmails.size > 0) {
        try {
          const customer = await stripe.customers.retrieve(sub.customer);
          if ('email' in customer && customer.email && ceoEmails.has(customer.email.toLowerCase())) continue;
        } catch {}
      }

      const productId = sub.items.data[0]?.price?.product as string | undefined;
      if (productId === PRO_PRODUCT_ID) pro_count++;
      else if (productId === MASTER_PRODUCT_ID) master_count++;
    }

    const total_mrr = pro_count * PRO_PRICE + master_count * MASTER_PRICE;

    // Count lifetime purchases (one-time checkout sessions). Paginate through up to 1000.
    let lifetime_count = 0;
    let lifetime_revenue = 0;
    let cancelled_subs = 0;
    try {
      // Lifetime price from app_config
      const { data: cfg } = await supabase
        .from('app_config')
        .select('config_key, config_value')
        .in('config_key', ['lifetime_price_brl']);
      const lifetimePrice = parseFloat(
        cfg?.find((c: any) => c.config_key === 'lifetime_price_brl')?.config_value || '0'
      );

      let startingAfter: string | undefined = undefined;
      for (let page = 0; page < 10; page++) {
        const list: any = await stripe.checkout.sessions.list({
          status: 'complete',
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        });
        for (const s of list.data) {
          if (
            s.mode === 'payment' &&
            s.payment_status === 'paid' &&
            s.metadata?.purchase_type === 'lifetime'
          ) {
            const email = (s.customer_details?.email || s.customer_email || '').toLowerCase();
            if (email && ceoEmails.has(email)) continue;
            lifetime_count++;
            lifetime_revenue += (s.amount_total ?? 0) / 100 || lifetimePrice;
          }
        }
        if (!list.has_more) break;
        startingAfter = list.data[list.data.length - 1]?.id;
        if (!startingAfter) break;
      }
    } catch (e) {
      console.error('lifetime count error:', e);
    }

    // Count cancelled/inactive subscriptions in current month for context
    try {
      const monthAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
      const cancelled = await stripe.subscriptions.list({
        status: 'canceled',
        limit: 100,
        created: { gte: monthAgo },
      } as any);
      cancelled_subs = cancelled.data.length;
    } catch (e) {
      console.error('cancelled count error:', e);
    }

    return new Response(
      JSON.stringify({
        pro_count,
        master_count,
        lifetime_count,
        lifetime_revenue: Math.round(lifetime_revenue * 100) / 100,
        total_mrr,
        cancelled_last_30d: cancelled_subs,
      }),
      { headers: jsonHeaders }
    );
  } catch (err: any) {
    console.error('subscription-stats error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500, headers: jsonHeaders });
  }
});
