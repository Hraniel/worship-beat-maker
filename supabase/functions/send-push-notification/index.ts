import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendNotification, deserializeVapidKeys } from 'npm:web-push-browser@^1.4.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VAPID_PUBLIC_KEY = 'BEmai4sVQ5smKOntl650q-VuF3KJqyZFjAwxsEfMAHADK2YkLtA853gCVvCnjKOmSoRJMVumw5pcJVU8RhGTomo';

// ── Convert PKCS8 base64url to raw 32-byte base64url ──────────────────────
// The VapidGenerator exports the private key in PKCS8 format.
// web-push-browser expects the raw 32-byte d value in base64url.
function base64UrlToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function uint8ArrayToBase64Url(arr: Uint8Array): string {
  let str = '';
  arr.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function pkcs8ToRawPrivateKey(pkcs8Base64Url: string): Promise<string> {
  const pkcs8Bytes = base64UrlToUint8Array(pkcs8Base64Url);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8Bytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign']
  );
  const jwk = await crypto.subtle.exportKey('jwk', key);
  // jwk.d is the raw private key in base64url format
  return jwk.d!;
}

// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { data: roleData } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // ── Subscribe ────────────────────────────────────────────────────────────
    if (action === 'subscribe') {
      const { endpoint, p256dh, auth_key } = body;
      if (!endpoint || !p256dh || !auth_key) {
        return new Response(JSON.stringify({ error: 'Missing subscription data' }), { status: 400, headers: corsHeaders });
      }
      await supabaseAdmin.from('push_subscriptions').upsert(
        { user_id: user.id, endpoint, p256dh, auth_key },
        { onConflict: 'endpoint' }
      );
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ── Unsubscribe ──────────────────────────────────────────────────────────
    if (action === 'unsubscribe') {
      const { endpoint } = body;
      if (endpoint) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint);
      }
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ── Broadcast (admin only) ───────────────────────────────────────────────
    if (action === 'broadcast') {
      if (!roleData) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });

      const vapidPrivateKeyPkcs8 = Deno.env.get('VAPID_PRIVATE_KEY');
      if (!vapidPrivateKeyPkcs8) {
        return new Response(JSON.stringify({ error: 'VAPID_PRIVATE_KEY not configured' }), { status: 500, headers: corsHeaders });
      }

      const { title, message, target_user_id, url } = body;
      if (!title) return new Response(JSON.stringify({ error: 'Missing title' }), { status: 400, headers: corsHeaders });

      // Convert PKCS8 private key to raw base64url format
      const rawPrivateKey = await pkcs8ToRawPrivateKey(vapidPrivateKeyPkcs8);

      // Deserialize VAPID keys for web-push-browser
      const vapidKeys = await deserializeVapidKeys({
        publicKey: VAPID_PUBLIC_KEY,
        privateKey: rawPrivateKey,
      });

      // Fetch subscriptions (all or specific user)
      let query = supabaseAdmin.from('push_subscriptions').select('*');
      if (target_user_id) query = query.eq('user_id', target_user_id);
      const { data: subs } = await query;

      if (!subs || subs.length === 0) {
        return new Response(JSON.stringify({ success: true, sent: 0, failed: 0 }), { headers: corsHeaders });
      }

      const payload = JSON.stringify({
        title,
        body: message || '',
        icon: '/pwa-icon-192.png',
        badge: '/pwa-icon-192.png',
        tag: 'glory-pads-notification',
        url: url || '/',
      });

      let sent = 0;
      let failed = 0;
      const expiredEndpoints: string[] = [];

      console.log(`[PUSH] Sending to ${subs.length} subscription(s)...`);

      const results = await Promise.allSettled(
        subs.map(async (sub) => {
          try {
            const pushSub = {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth_key,
              },
            };

            const res = await sendNotification(vapidKeys, pushSub, payload, {
              contactInformation: 'mailto:admin@glorypads.app',
              ttl: 86400,
            });

            return { ok: res.ok, status: res.status, endpoint: sub.endpoint };
          } catch (e: any) {
            return { ok: false, status: e?.statusCode || 0, error: e?.message, endpoint: sub.endpoint };
          }
        })
      );

      results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          const r = result.value;
          if (r.ok) {
            sent++;
            console.log(`[PUSH] ✓ Sent to ${r.endpoint.slice(0, 60)}... status=${r.status}`);
          } else {
            failed++;
            console.error(`[PUSH] ✗ Failed ${r.endpoint.slice(0, 60)}... status=${r.status} error=${r.error || ''}`);
            if (r.status === 410 || r.status === 404) {
              expiredEndpoints.push(r.endpoint);
              console.log(`[PUSH] Removing expired subscription (${r.status})`);
            }
          }
        } else {
          failed++;
          console.error(`[PUSH] ✗ Promise rejected for sub[${i}]:`, result.reason);
        }
      });

      // Clean up expired subscriptions
      if (expiredEndpoints.length > 0) {
        await supabaseAdmin.from('push_subscriptions').delete().in('endpoint', expiredEndpoints);
      }

      return new Response(JSON.stringify({ success: true, sent, failed }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
  } catch (err: any) {
    console.error('send-push-notification error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500, headers: corsHeaders });
  }
});
