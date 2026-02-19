import { supabase } from '@/integrations/supabase/client';

const PUSH_FUNCTION_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/send-push-notification`;

type PushReg = ServiceWorkerRegistration & { pushManager?: PushManager };

async function getAuthHeader(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token ? `Bearer ${data.session.access_token}` : null;
}

export async function isPushSupported(): Promise<boolean> {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function getPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

export async function requestPushPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export async function subscribeToPush(): Promise<boolean> {
  try {
    // Use the Workbox-generated SW (which already imports sw-push.js via importScripts)
    // Do NOT register sw-push.js separately — it causes SW conflicts
    const reg = (await navigator.serviceWorker.ready) as PushReg;
    if (!reg.pushManager) return false;

    const vapidPublicKey = 'BDcRX9mAmmCx-FyEKa1WMZGi1U1IJbSUeINDGhDxy30ZiiN0q84FpjfAeKhX4d1vLDeB8OURov_Xdk1foz6F5NM';
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as BufferSource,
    });

    const subJson = subscription.toJSON();
    const authHeader = await getAuthHeader();
    if (!authHeader) return false;

    const resp = await fetch(PUSH_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({
        action: 'subscribe',
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh,
        auth_key: subJson.keys?.auth,
      }),
    });

    return resp.ok;
  } catch (e) {
    console.warn('Push subscription failed:', e);
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const reg = (await navigator.serviceWorker.ready) as PushReg;
    if (!reg.pushManager) return true;
    const subscription = await reg.pushManager.getSubscription();
    if (!subscription) return true;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    const authHeader = await getAuthHeader();
    if (authHeader) {
      await fetch(PUSH_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({ action: 'unsubscribe', endpoint }),
      });
    }
    return true;
  } catch {
    return false;
  }
}

export async function broadcastPushNotification(title: string, message: string): Promise<{ sent: number; failed: number }> {
  const authHeader = await getAuthHeader();
  if (!authHeader) throw new Error('Not authenticated');

  const resp = await fetch(PUSH_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader },
    body: JSON.stringify({ action: 'broadcast', title, message }),
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Failed to broadcast');
  return { sent: data.sent || 0, failed: data.failed || 0 };
}

export async function isSubscribed(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) return false;
    const reg = (await navigator.serviceWorker.ready) as PushReg;
    if (!reg.pushManager) return false;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
