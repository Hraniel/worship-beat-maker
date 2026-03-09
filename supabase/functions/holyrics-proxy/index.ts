import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("[holyrics-proxy] Request body:", JSON.stringify(body));
    const { host, token, action, payload } = body;

    if (!host || !token || !action) {
      return new Response(
        JSON.stringify({ error: "Missing host, token, or action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize host — allow IP:PORT, hostname:PORT, or full domain (tunnel URLs)
    const hostPattern = /^[\w.\-]+(:\d{1,5})?$/;
    if (!hostPattern.test(host)) {
      return new Response(
        JSON.stringify({ error: "Invalid host format. Use IP:PORT (e.g. 192.168.1.100:8091) or domain (e.g. my-tunnel.trycloudflare.com)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine protocol: use https for domains without port, http for IP:port
    const hasPort = /:\d+$/.test(host);
    const isPrivateIP = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host.split(':')[0]);
    const protocol = (hasPort || isPrivateIP) ? 'http' : 'https';

    const holyricsUrl = `${protocol}://${host}/api/${encodeURIComponent(action)}?token=${encodeURIComponent(token)}`;
    console.log("[holyrics-proxy] Calling:", holyricsUrl);

    const holyricsResponse = await fetch(holyricsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
      signal: AbortSignal.timeout(5000),
    });

    const text = await holyricsResponse.text();
    console.log("[holyrics-proxy] Response status:", holyricsResponse.status, "body:", text);

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      result = { raw: text };
    }

    return new Response(JSON.stringify({ ok: holyricsResponse.ok, status: holyricsResponse.status, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
