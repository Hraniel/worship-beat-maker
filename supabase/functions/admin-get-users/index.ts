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

    // ── Role management ─────────────────────────────────────────────────────────
    if (['promote', 'demote', 'promote-moderator', 'demote-moderator', 'remove-roles'].includes(action)) {
      const targetUserId = body.userId;
      if (!targetUserId || !/^[0-9a-f-]{36}$/.test(targetUserId)) {
        return new Response(JSON.stringify({ error: 'Invalid userId' }), { status: 400, headers: corsHeaders });
      }
      if (action === 'promote') {
        await supabase.from('user_roles').upsert({ user_id: targetUserId, role: 'admin' }, { onConflict: 'user_id,role' });
      } else if (action === 'demote') {
        await supabase.from('user_roles').delete().eq('user_id', targetUserId).eq('role', 'admin');
      } else if (action === 'promote-moderator') {
        await supabase.from('user_roles').upsert({ user_id: targetUserId, role: 'moderator' }, { onConflict: 'user_id,role' });
      } else if (action === 'demote-moderator') {
        await supabase.from('user_roles').delete().eq('user_id', targetUserId).eq('role', 'moderator');
      } else if (action === 'remove-roles') {
        await supabase.from('user_roles').delete().eq('user_id', targetUserId);
      }
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ── Delete user ──────────────────────────────────────────────────────────────
    if (action === 'delete-user') {
      const targetUserId = body.userId;
      if (!targetUserId || !/^[0-9a-f-]{36}$/.test(targetUserId)) {
        return new Response(JSON.stringify({ error: 'Invalid userId' }), { status: 400, headers: corsHeaders });
      }
      const { error } = await supabase.auth.admin.deleteUser(targetUserId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ── Resend verification email ────────────────────────────────────────────────
    if (action === 'resend-verification') {
      const { email } = body;
      if (!email || typeof email !== 'string' || email.length > 320) {
        return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400, headers: corsHeaders });
      }
      // Use generateLink with type signup to trigger email resend
      const { error } = await supabase.auth.admin.generateLink({
        type: 'signup',
        email: email.trim().toLowerCase(),
      });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ── Update credentials (email or password) ───────────────────────────────────
    if (action === 'update-credentials') {
      const targetUserId = body.userId;
      const newEmail = body.email;
      const newPassword = body.password;
      if (!targetUserId || !/^[0-9a-f-]{36}$/.test(targetUserId)) {
        return new Response(JSON.stringify({ error: 'Invalid userId' }), { status: 400, headers: corsHeaders });
      }
      const updates: Record<string, string> = {};
      if (newEmail && typeof newEmail === 'string' && newEmail.length <= 320) updates.email = newEmail.trim().toLowerCase();
      if (newPassword && typeof newPassword === 'string' && newPassword.length >= 6 && newPassword.length <= 128) updates.password = newPassword;
      if (Object.keys(updates).length === 0) {
        return new Response(JSON.stringify({ error: 'No valid updates' }), { status: 400, headers: corsHeaders });
      }
      // Must use service role client (already initialised as `supabase`) for admin operations
      const { error } = await supabase.auth.admin.updateUserById(targetUserId, updates);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ── Ban user ─────────────────────────────────────────────────────────────────
    if (action === 'ban-user') {
      const { userId: targetUserId, email, banType, reason, days, ip } = body;
      if (!targetUserId || !/^[0-9a-f-]{36}$/.test(targetUserId)) {
        return new Response(JSON.stringify({ error: 'Invalid userId' }), { status: 400, headers: corsHeaders });
      }
      if (!reason || typeof reason !== 'string' || reason.length > 500) {
        return new Response(JSON.stringify({ error: 'Invalid reason' }), { status: 400, headers: corsHeaders });
      }
      const expiresAt = banType === 'temporary' && days && days > 0
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
        : null;
      
      await supabase.from('user_bans').insert({
        user_id: targetUserId,
        email: email || '',
        ip_address: ip || null,
        reason,
        banned_by: user.id,
        ban_type: banType || 'permanent',
        expires_at: expiresAt,
      });

      // Also ban in Supabase Auth (disable user)
      await supabase.auth.admin.updateUserById(targetUserId, { ban_duration: banType === 'temporary' && days ? `${days * 24}h` : '876000h' });

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ── Grant free tier ──────────────────────────────────────────────────────────
    if (action === 'grant-tier') {
      const { userId: targetUserId, tier, note } = body;
      if (!targetUserId || !/^[0-9a-f-]{36}$/.test(targetUserId)) {
        return new Response(JSON.stringify({ error: 'Invalid userId' }), { status: 400, headers: corsHeaders });
      }
      if (!['pro', 'master'].includes(tier)) {
        return new Response(JSON.stringify({ error: 'Invalid tier' }), { status: 400, headers: corsHeaders });
      }
      await supabase.from('granted_tiers').upsert({
        user_id: targetUserId,
        tier,
        granted_by: user.id,
        note: note || null,
      }, { onConflict: 'user_id' });
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ── Revoke free tier ──────────────────────────────────────────────────────────
    if (action === 'revoke-tier') {
      const targetUserId = body.userId;
      if (!targetUserId || !/^[0-9a-f-]{36}$/.test(targetUserId)) {
        return new Response(JSON.stringify({ error: 'Invalid userId' }), { status: 400, headers: corsHeaders });
      }
      await supabase.from('granted_tiers').delete().eq('user_id', targetUserId);
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ── List users ───────────────────────────────────────────────────────────────
    const { data: { users: authUsers }, error: usersErr } = await supabase.auth.admin.listUsers({ perPage: 200 });
    if (usersErr) throw usersErr;

    // Fetch all purchases grouped by user
    const { data: purchases } = await supabase.from('user_purchases').select('user_id, pack_id');
    const purchaseMap = new Map<string, number>();
    purchases?.forEach(p => purchaseMap.set(p.user_id, (purchaseMap.get(p.user_id) || 0) + 1));

    // Fetch all roles (admin + moderator)
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    const adminSet = new Set(roles?.filter(r => r.role === 'admin').map(r => r.user_id) || []);
    const modSet = new Set(roles?.filter(r => r.role === 'moderator').map(r => r.user_id) || []);

    // Fetch bans
    const { data: bans } = await supabase.from('user_bans').select('user_id, expires_at');
    const banMap = new Map<string, string | null>();
    bans?.forEach(b => banMap.set(b.user_id, b.expires_at));

    // Fetch granted tiers
    const { data: grants } = await supabase.from('granted_tiers').select('user_id, tier');
    const grantMap = new Map<string, string>();
    grants?.forEach(g => grantMap.set(g.user_id, g.tier));

    const result = authUsers.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      purchase_count: purchaseMap.get(u.id) || 0,
      is_admin: adminSet.has(u.id),
      is_moderator: modSet.has(u.id),
      is_banned: banMap.has(u.id),
      ban_expires_at: banMap.get(u.id) ?? null,
      granted_tier: grantMap.get(u.id) ?? null,
      ip: (u as any).last_sign_in_ip ?? (u as any).confirmed_at ? null : null,
    }));

    return new Response(JSON.stringify({ users: result }), { headers: corsHeaders });
  } catch (err: any) {
    console.error('admin-get-users error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500, headers: corsHeaders });
  }
});
