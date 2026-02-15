import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Spotify credentials not configured");

  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!resp.ok) throw new Error(`Spotify auth failed: ${resp.status}`);
  const data = await resp.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, trackId } = await req.json();
    const token = await getSpotifyToken();
    const headers = { Authorization: `Bearer ${token}` };

    // If trackId provided, get audio features
    if (trackId) {
      const [featuresResp, trackResp] = await Promise.all([
        fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, { headers }),
        fetch(`https://api.spotify.com/v1/tracks/${trackId}`, { headers }),
      ]);

      const features = featuresResp.ok ? await featuresResp.json() : null;
      const track = trackResp.ok ? await trackResp.json() : null;

      return new Response(JSON.stringify({ features, track }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Search tracks
    if (!query) {
      return new Response(JSON.stringify({ error: "query or trackId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchResp = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=8`,
      { headers }
    );

    if (!searchResp.ok) {
      const errText = await searchResp.text();
      console.error("Spotify search error:", searchResp.status, errText);
      return new Response(JSON.stringify({ error: "Spotify search failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchData = await searchResp.json();
    const tracks = searchData.tracks.items.map((t: any) => ({
      id: t.id,
      name: t.name,
      artist: t.artists.map((a: any) => a.name).join(", "),
      album: t.album.name,
      image: t.album.images?.[2]?.url || t.album.images?.[0]?.url,
      duration_ms: t.duration_ms,
    }));

    return new Response(JSON.stringify({ tracks }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("spotify-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
