import { supabase } from '@/integrations/supabase/client';
import type { HolyricsConfig } from '@/lib/performance-settings';

/**
 * Call Holyrics API action via edge function proxy.
 * Always uses the proxy to get real response feedback (avoids no-cors opaque responses).
 */
async function callHolyrics(
  host: string,
  token: string,
  action: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; status?: number; data?: any; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('holyrics-proxy', {
      body: { host, token, action, payload },
    });
    if (error) return { ok: false, error: error.message || 'Edge function error' };
    if (data?.error) return { ok: false, error: data.error };
    // Check if Holyrics actually accepted the request
    if (data?.ok === false) {
      return { ok: false, status: data.status, data: data.data, error: `Holyrics returned status ${data.status}` };
    }
    return { ok: true, status: data?.status, data: data?.data };
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
      const result = await callHolyrics(host, token, 'SetTextCommunicationPanel', { text: cueLabel });
      if (!result.ok) console.warn('[Holyrics] SetTextCommunicationPanel failed:', result.error, result.data);
    }

    if (targetScreen === 'front' || targetScreen === 'all') {
      const result = await callHolyrics(host, token, 'SetAlert', {
        text: cueLabel,
        show: true,
        display_ahead: true,
        close_after_seconds: displaySeconds,
      });
      if (!result.ok) console.warn('[Holyrics] SetAlert failed:', result.error, result.data);
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
): Promise<{ ok: boolean; error?: string; detail?: string }> {
  const h = host.trim();
  const t = token.trim();

  const result = await callHolyrics(h, t, 'SetAlert', {
    text: '✅ GloryPads conectado!',
    show: true,
    display_ahead: true,
    close_after_seconds: 3,
  });

  if (!result.ok) {
    return { ok: false, error: result.error, detail: JSON.stringify(result.data) };
  }
  return { ok: true };
}
