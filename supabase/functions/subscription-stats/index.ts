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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const anonClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: authUser }, error: userErr } = await anonClient.auth.getUser(token);
    const userId = authUser?.id;
    if (userErr || !userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    // Check admin role
    const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', userId).in('role', ['admin', 'ceo']).maybeSingle();
    if (!roleData) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return new Response(JSON.stringify({ error: 'Stripe not configured' }), { status: 500, headers: corsHeaders });

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

    return new Response(JSON.stringify({ pro_count, master_count, total_mrr }), { headers: corsHeaders });
  } catch (err: any) {
    console.error('subscription-stats error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500, headers: corsHeaders });
  }
});
