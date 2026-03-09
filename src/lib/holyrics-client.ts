import { supabase } from '@/integrations/supabase/client';
import type { HolyricsConfig } from '@/lib/performance-settings';

/**
 * Detects whether a host string is a private/local network address.
 * Private hosts require direct fetch (works in Android WebView with allowMixedContent).
 * Public hosts (tunnels like Cloudflare/ngrok) go through the edge function proxy.
 */
function isPrivateHost(host: string): boolean {
  const hostname = host.split(':')[0] || '';
  return /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(hostname);
}

/**
 * Call Holyrics API action.
 * - Private IPs → direct fetch with `mode: 'no-cors'` (works in Android/Capacitor WebView)
 * - Public URLs (tunnels) → edge function proxy (works everywhere incl. PWA)
 */
async function callHolyrics(
  host: string,
  token: string,
  action: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const isLocal = isPrivateHost(host);

  if (isLocal) {
    // Direct call — works in Android WebView (allowMixedContent: true)
    const url = `http://${host}/api/${encodeURIComponent(action)}?token=${encodeURIComponent(token)}`;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
        mode: 'no-cors',
      });
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: msg };
    } finally {
      clearTimeout(timeout);
    }
  }

  // Public host (tunnel) → edge function proxy
  try {
    const { data, error } = await supabase.functions.invoke('holyrics-proxy', {
      body: { host, token, action, payload },
    });
    if (error) return { ok: false, error: error.message || 'Edge function error' };
    if (data?.error) return { ok: false, error: data.error };
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

/**
 * Send a cue to Holyrics based on config target screen.
 */
export async function sendToHolyrics(
  holyrics: HolyricsConfig,
  cueLabel: string,
  displaySeconds: number,
): Promise<void> {
  if (!holyrics.enabled || !holyrics.host || !holyrics.token) return;

  const host = holyrics.host.trim();
  const token = holyrics.token.trim();
  const targetScreen = holyrics.targetScreen || 'stage';

  try {
    if (targetScreen === 'stage' || targetScreen === 'all') {
      await callHolyrics(host, token, 'SetTextCommunicationPanel', { text: cueLabel });
    }

    if (targetScreen === 'front' || targetScreen === 'all') {
      await callHolyrics(host, token, 'SetAlert', {
        text: cueLabel,
        show: true,
        display_ahead: true,
        close_after_seconds: displaySeconds,
      });
    }
  } catch (err) {
    console.error('[Holyrics] Failed to send cue:', err);
  }
}

/**
 * Test connection to Holyrics. Returns a result with diagnostic info.
 */
export async function testHolyricsConnection(
  host: string,
  token: string,
): Promise<{ ok: boolean; isLocal: boolean; error?: string }> {
  const h = host.trim();
  const t = token.trim();
  const isLocal = isPrivateHost(h);

  const result = await callHolyrics(h, t, 'SetAlert', {
    text: '✅ GloryPads conectado!',
    show: true,
    display_ahead: true,
    close_after_seconds: 3,
  });

  return { ...result, isLocal };
}
