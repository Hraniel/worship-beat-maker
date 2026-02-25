import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VAPID_PUBLIC_KEY = 'BDcRX9mAmmCx-FyEKa1WMZGi1U1IJbSUeINDGhDxy30ZiiN0q84FpjfAeKhX4d1vLDeB8OURov_Xdk1foz6F5NM';

// ── Base64url helpers ──────────────────────────────────────────────────
function base64UrlToUint8Array(base64url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const b64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function uint8ArrayToBase64Url(arr: Uint8Array): string {
  let binary = '';
  for (const byte of arr) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ── Import VAPID keys ──────────────────────────────────────────────────
async function importVapidKeys(publicKeyB64: string, privateKeyPkcs8B64: string) {
  const pubBytes = base64UrlToUint8Array(publicKeyB64);
  const privBytes = base64UrlToUint8Array(privateKeyPkcs8B64);

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  return { publicKey: pubBytes, privateKey };
}

// ── Create JWT for VAPID ───────────────────────────────────────────────
async function createVapidJwt(audience: string, subject: string, privateKey: CryptoKey): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: subject };

  const enc = new TextEncoder();
  const headerB64 = uint8ArrayToBase64Url(enc.encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(enc.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    enc.encode(unsignedToken)
  );

  // Convert DER signature to raw r||s (64 bytes)
  const sigBytes = new Uint8Array(signature);
  let r: Uint8Array, s: Uint8Array;

  if (sigBytes.length === 64) {
    r = sigBytes.slice(0, 32);
    s = sigBytes.slice(32);
  } else {
    // DER format
    const rLen = sigBytes[3];
    const rStart = 4;
    const rBytes = sigBytes.slice(rStart, rStart + rLen);
    const sLen = sigBytes[rStart + rLen + 1];
    const sStart = rStart + rLen + 2;
    const sBytes = sigBytes.slice(sStart, sStart + sLen);

    r = new Uint8Array(32);
    s = new Uint8Array(32);
    r.set(rBytes.length > 32 ? rBytes.slice(rBytes.length - 32) : rBytes, 32 - Math.min(rBytes.length, 32));
    s.set(sBytes.length > 32 ? sBytes.slice(sBytes.length - 32) : sBytes, 32 - Math.min(sBytes.length, 32));
  }

  const rawSig = new Uint8Array(64);
  rawSig.set(r, 0);
  rawSig.set(s, 32);

  return `${unsignedToken}.${uint8ArrayToBase64Url(rawSig)}`;
}

// ── Encrypt payload (RFC 8291 aes128gcm) ───────────────────────────────
async function encryptPayload(
  p256dhB64: string,
  authB64: string,
  payloadStr: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const userPublicKeyBytes = base64UrlToUint8Array(p256dhB64);
  const userAuthBytes = base64UrlToUint8Array(authB64);
  const payload = new TextEncoder().encode(payloadStr);

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', localKeyPair.publicKey)
  );

  // Import user's public key
  const userPublicKey = await crypto.subtle.importKey(
    'raw',
    userPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: userPublicKey },
      localKeyPair.privateKey,
      256
    )
  );

  // Salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF for auth_info -> PRK
  const authInfoStr = 'WebPush: info\0';
  const authInfo = new Uint8Array(authInfoStr.length + userPublicKeyBytes.length + localPublicKeyRaw.length);
  const te = new TextEncoder();
  authInfo.set(te.encode(authInfoStr), 0);
  authInfo.set(userPublicKeyBytes, authInfoStr.length);
  authInfo.set(localPublicKeyRaw, authInfoStr.length + userPublicKeyBytes.length);

  const authHkdfKey = await crypto.subtle.importKey('raw', userAuthBytes, { name: 'HKDF' }, false, ['deriveBits']);
  const ikm = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: sharedSecret, info: authInfo },
      authHkdfKey,
      256
    )
  );

  // Derive CEK and nonce
  const cekInfo = te.encode('Content-Encoding: aes128gcm\0');
  const nonceInfo = te.encode('Content-Encoding: nonce\0');

  const prkKey = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits']);

  const cekBits = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt, info: cekInfo },
      prkKey,
      128
    )
  );

  const nonce = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo },
      prkKey,
      96
    )
  );

  // Pad payload (add delimiter byte 0x02 + no padding)
  const padded = new Uint8Array(payload.length + 1);
  padded.set(payload);
  padded[payload.length] = 2; // delimiter

  // Encrypt with AES-128-GCM
  const contentKey = await crypto.subtle.importKey('raw', cekBits, { name: 'AES-GCM' }, false, ['encrypt']);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      contentKey,
      padded
    )
  );

  // Build aes128gcm body: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + localPublicKeyRaw.length);
  header.set(salt, 0);
  header[16] = (rs >> 24) & 0xff;
  header[17] = (rs >> 16) & 0xff;
  header[18] = (rs >> 8) & 0xff;
  header[19] = rs & 0xff;
  header[20] = localPublicKeyRaw.length;
  header.set(localPublicKeyRaw, 21);

  const ciphertext = new Uint8Array(header.length + encrypted.length);
  ciphertext.set(header, 0);
  ciphertext.set(encrypted, header.length);

  return { ciphertext, salt, localPublicKey: localPublicKeyRaw };
}

// ── Send a single push notification ────────────────────────────────────
async function sendPushNotification(
  sub: { endpoint: string; p256dh: string; auth_key: string },
  payloadStr: string,
  vapidPublicKey: Uint8Array,
  vapidPrivateKey: CryptoKey
): Promise<{ ok: boolean; statusCode: number; error?: string }> {
  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const jwt = await createVapidJwt(audience, 'mailto:admin@glorypads.app', vapidPrivateKey);
  const vapidPubB64 = uint8ArrayToBase64Url(vapidPublicKey);

  const { ciphertext } = await encryptPayload(sub.p256dh, sub.auth_key, payloadStr);

  const resp = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'Content-Length': String(ciphertext.length),
      Authorization: `vapid t=${jwt}, k=${vapidPubB64}`,
      TTL: '86400',
      Urgency: 'normal',
    },
    body: ciphertext,
  });

  if (resp.status >= 200 && resp.status < 300) {
    return { ok: true, statusCode: resp.status };
  }

  const text = await resp.text().catch(() => '');
  return { ok: false, statusCode: resp.status, error: text };
}

// ── Main handler ───────────────────────────────────────────────────────
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

    const { data: roleData } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', user.id).in('role', ['admin', 'ceo']).maybeSingle();

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // ── Subscribe ──────────────────────────────────────────────────────
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

    // ── Unsubscribe ────────────────────────────────────────────────────
    if (action === 'unsubscribe') {
      const { endpoint } = body;
      if (endpoint) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint);
      }
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ── Broadcast (admin/ceo only) ─────────────────────────────────────
    if (action === 'broadcast') {
      if (!roleData) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });

      const vapidPrivateKeyPkcs8 = Deno.env.get('VAPID_PRIVATE_KEY');
      if (!vapidPrivateKeyPkcs8) {
        return new Response(JSON.stringify({ error: 'VAPID_PRIVATE_KEY not configured' }), { status: 500, headers: corsHeaders });
      }

      const { title, message, target_user_id, url } = body;
      if (!title) return new Response(JSON.stringify({ error: 'Missing title' }), { status: 400, headers: corsHeaders });

      const { publicKey: vapidPubKey, privateKey: vapidPrivKey } = await importVapidKeys(VAPID_PUBLIC_KEY, vapidPrivateKeyPkcs8);

      // Fetch subscriptions
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
            const result = await sendPushNotification(
              { endpoint: sub.endpoint, p256dh: sub.p256dh, auth_key: sub.auth_key },
              payload,
              vapidPubKey,
              vapidPrivKey
            );
            return result;
          } catch (e: any) {
            return { ok: false, statusCode: 0, error: e?.message, endpoint: sub.endpoint };
          }
        })
      );

      results.forEach((result, i) => {
        const endpoint = subs[i].endpoint;
        if (result.status === 'fulfilled') {
          const r = result.value;
          if (r.ok) {
            sent++;
            console.log(`[PUSH] ✓ Sent to ${endpoint.slice(0, 60)}...`);
          } else {
            failed++;
            console.error(`[PUSH] ✗ Failed ${endpoint.slice(0, 60)}... status=${r.statusCode} error=${r.error || ''}`);
            if (r.statusCode === 410 || r.statusCode === 404) {
              expiredEndpoints.push(endpoint);
            }
          }
        } else {
          failed++;
          console.error(`[PUSH] ✗ Promise rejected for sub[${i}]:`, result.reason);
        }
      });

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
