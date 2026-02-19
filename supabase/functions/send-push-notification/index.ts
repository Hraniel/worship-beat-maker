import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ── VAPID helpers (pure Deno/Web Crypto — no third-party library needed) ────

const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

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

async function buildVapidJwt(audience: string, privateKeyB64: string): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: 'mailto:admin@glorypads.app' };

  const enc = (obj: object) => uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(obj)));
  const sigInput = `${enc(header)}.${enc(payload)}`;

  // Import private key (PKCS8 raw base64url)
  const rawKey = base64UrlToUint8Array(privateKeyB64);
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    rawKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    new TextEncoder().encode(sigInput)
  );

  return `${sigInput}.${uint8ArrayToBase64Url(new Uint8Array(sig))}`;
}

/** Send a single Web Push notification */
async function sendWebPush(
  sub: { endpoint: string; p256dh: string; auth_key: string },
  payload: string,
  vapidPrivateKey: string
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const url = new URL(sub.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    const jwt = await buildVapidJwt(audience, vapidPrivateKey);

    // ── Encrypt payload with ECDH + AES-GCM (RFC 8291) ──────────────────────
    // Generate server ephemeral key pair
    const serverKeyPair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits']
    );

    const serverPublicKeyRaw = await crypto.subtle.exportKey('raw', serverKeyPair.publicKey);

    // Import client's P-256 public key
    const clientPublicKey = await crypto.subtle.importKey(
      'raw',
      base64UrlToUint8Array(sub.p256dh),
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );

    // ECDH shared secret
    const sharedSecret = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientPublicKey },
      serverKeyPair.privateKey,
      256
    );

    // Auth salt
    const authBytes = base64UrlToUint8Array(sub.auth_key);
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // HKDF PRK from auth
    const prk = await crypto.subtle.importKey('raw', sharedSecret, { name: 'HKDF' }, false, ['deriveBits']);

    const authInfo = new TextEncoder().encode('Content-Encoding: auth\0');
    const prkBytes = await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: authBytes, info: authInfo },
      prk,
      256
    );

    // CEK + NONCE via HKDF
    const serverPubBytes = new Uint8Array(serverPublicKeyRaw);
    const clientPubBytes = base64UrlToUint8Array(sub.p256dh);
    const context = new Uint8Array([
      ...new TextEncoder().encode('P-256\0'),
      0, 65, ...clientPubBytes,
      0, 65, ...serverPubBytes,
    ]);

    const prkKey = await crypto.subtle.importKey('raw', prkBytes, { name: 'HKDF' }, false, ['deriveBits']);

    const cekInfo = new Uint8Array([...new TextEncoder().encode('Content-Encoding: aesgcm\0'), ...context]);
    const cekBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: cekInfo }, prkKey, 128);

    const nonceInfo = new Uint8Array([...new TextEncoder().encode('Content-Encoding: nonce\0'), ...context]);
    const nonceBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo }, prkKey, 96);

    const cek = await crypto.subtle.importKey('raw', cekBits, { name: 'AES-GCM' }, false, ['encrypt']);

    const plaintext = new TextEncoder().encode(payload);
    const paddedPlain = new Uint8Array(2 + plaintext.length);
    paddedPlain.set(plaintext, 2); // 2 bytes padding length = 0

    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonceBits }, cek, paddedPlain);

    // Build encrypted body: salt(16) + rs(4) + keyidlen(1) + keyid + ciphertext
    const rs = new Uint8Array([0, 0, 16, 0]); // record size = 4096
    const keyid = serverPubBytes;
    const body = new Uint8Array([...salt, ...rs, keyid.length, ...keyid, ...new Uint8Array(ciphertext)]);

    const vapidPublicKeyB64 = VAPID_PUBLIC_KEY;

    const resp = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aesgcm',
        'Encryption': `salt=${uint8ArrayToBase64Url(salt)}`,
        'Crypto-Key': `dh=${uint8ArrayToBase64Url(serverPubBytes)};p256ecdsa=${vapidPublicKeyB64}`,
        'Authorization': `vapid t=${jwt},k=${vapidPublicKeyB64}`,
        'TTL': '86400',
      },
      body,
    });

    return { ok: resp.status < 300, status: resp.status };
  } catch (e: any) {
    console.error('sendWebPush error:', e.message);
    return { ok: false, error: e.message };
  }
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

      const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
      if (!vapidPrivateKey) {
        return new Response(JSON.stringify({ error: 'VAPID_PRIVATE_KEY not configured' }), { status: 500, headers: corsHeaders });
      }

      const { title, message, target_user_id, url } = body;
      if (!title) return new Response(JSON.stringify({ error: 'Missing title' }), { status: 400, headers: corsHeaders });

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

      const results = await Promise.allSettled(
        subs.map((sub) => sendWebPush(sub, payload, vapidPrivateKey))
      );

      results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          const r = result.value;
          if (r.ok) {
            sent++;
          } else {
            failed++;
            // 410 Gone = subscription expired, clean up
            if (r.status === 410 || r.status === 404) {
              expiredEndpoints.push(subs[i].endpoint);
            }
          }
        } else {
          failed++;
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
