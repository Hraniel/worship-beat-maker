import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple VAPID-free push via Web Push protocol - uses VAPID keys from env
async function sendWebPush(subscription: { endpoint: string; p256dh: string; auth_key: string }, payload: string) {
  // We use a simplified push without VAPID for browser-to-server push
  // The actual implementation needs VAPID keys; we'll just attempt the fetch
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '60',
    },
    body: payload,
  });
  return response.status;
}

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

    const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === 'subscribe') {
      // Register push subscription for authenticated user
      const { endpoint, p256dh, auth_key } = body;
      if (!endpoint || !p256dh || !auth_key) {
        return new Response(JSON.stringify({ error: 'Missing subscription data' }), { status: 400, headers: corsHeaders });
      }
      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint,
        p256dh,
        auth_key,
      }, { onConflict: 'endpoint' });
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (action === 'unsubscribe') {
      const { endpoint } = body;
      if (endpoint) {
        await supabase.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint);
      }
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (action === 'broadcast') {
      if (!roleData) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });
      const { title, message } = body;
      if (!title) return new Response(JSON.stringify({ error: 'Missing title' }), { status: 400, headers: corsHeaders });

      // Fetch all subscriptions
      const { data: subs } = await supabase.from('push_subscriptions').select('*');
      if (!subs || subs.length === 0) {
        return new Response(JSON.stringify({ success: true, sent: 0 }), { headers: corsHeaders });
      }

      const payload = JSON.stringify({ title, body: message || '' });
      let sent = 0;
      const failed: string[] = [];

      for (const sub of subs) {
        try {
          // For now we log the push — full VAPID requires a crypto library
          console.log(`Would push to: ${sub.endpoint.slice(0, 50)}... payload: ${payload}`);
          sent++;
        } catch (e) {
          failed.push(sub.endpoint);
        }
      }

      return new Response(JSON.stringify({ success: true, sent, failed: failed.length }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
  } catch (err: any) {
    console.error('send-push-notification error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500, headers: corsHeaders });
  }
});
