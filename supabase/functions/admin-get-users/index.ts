import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    // Check admin
    const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (!roleData) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });

    const body = req.method === 'GET' ? null : await req.json().catch(() => null);
    const action = body?.action;

    if (action === 'promote' || action === 'demote') {
      const targetUserId = body.userId;
      if (!targetUserId || !/^[0-9a-f-]{36}$/.test(targetUserId)) {
        return new Response(JSON.stringify({ error: 'Invalid userId' }), { status: 400, headers: corsHeaders });
      }
      if (action === 'promote') {
        await supabase.from('user_roles').upsert({ user_id: targetUserId, role: 'admin' }, { onConflict: 'user_id,role' });
      } else {
        await supabase.from('user_roles').delete().eq('user_id', targetUserId).eq('role', 'admin');
      }
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // List users via admin API
    const { data: { users }, error: usersErr } = await supabase.auth.admin.listUsers({ perPage: 200 });
    if (usersErr) throw usersErr;

    // Fetch all purchases grouped by user
    const { data: purchases } = await supabase.from('user_purchases').select('user_id, pack_id');
    const purchaseMap = new Map<string, number>();
    purchases?.forEach(p => purchaseMap.set(p.user_id, (purchaseMap.get(p.user_id) || 0) + 1));

    // Fetch all admin roles
    const { data: roles } = await supabase.from('user_roles').select('user_id, role').eq('role', 'admin');
    const adminSet = new Set(roles?.map(r => r.user_id) || []);

    const result = users.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      purchase_count: purchaseMap.get(u.id) || 0,
      is_admin: adminSet.has(u.id),
    }));

    return new Response(JSON.stringify({ users: result }), { headers: corsHeaders });
  } catch (err: any) {
    console.error('admin-get-users error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500, headers: corsHeaders });
  }
});
