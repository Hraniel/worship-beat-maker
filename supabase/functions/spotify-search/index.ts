import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

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
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    const { error: userError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Input validation
    const body = await req.json();
    const query = typeof body.query === "string" ? body.query.trim().slice(0, 200) : undefined;
    const trackId = typeof body.trackId === "string" && /^[a-zA-Z0-9]{1,50}$/.test(body.trackId) ? body.trackId : undefined;
    if (!query && !trackId) {
      return new Response(JSON.stringify({ error: "query or trackId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const spotifyToken = await getSpotifyToken();
    const headers = { Authorization: `Bearer ${spotifyToken}` };

    // If trackId provided, get audio features + audio analysis
    if (trackId) {
      const [featuresResp, trackResp, analysisResp] = await Promise.all([
        fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, { headers }),
        fetch(`https://api.spotify.com/v1/tracks/${trackId}`, { headers }),
        fetch(`https://api.spotify.com/v1/audio-analysis/${trackId}`, { headers }),
      ]);

      const features = featuresResp.ok ? await featuresResp.json() : null;
      const track = trackResp.ok ? await trackResp.json() : null;
      
      // Extract relevant analysis data (summarized to avoid huge payloads)
      let analysis = null;
      if (analysisResp.ok) {
        const fullAnalysis = await analysisResp.json();
        
        // Summarize sections (intro, verse, chorus, etc.)
        const sections = (fullAnalysis.sections || []).map((s: any) => ({
          start: Math.round(s.start * 10) / 10,
          duration: Math.round(s.duration * 10) / 10,
          loudness: Math.round(s.loudness * 10) / 10,
          tempo: Math.round(s.tempo * 10) / 10,
          key: s.key,
          mode: s.mode,
          time_signature: s.time_signature,
        }));
        
        // Summarize beats (first 32 beats for pattern detection)
        const beats = (fullAnalysis.beats || []).slice(0, 32).map((b: any) => ({
          start: Math.round(b.start * 1000) / 1000,
          duration: Math.round(b.duration * 1000) / 1000,
          confidence: Math.round(b.confidence * 100) / 100,
        }));
        
        // Summarize segments (first 50 for timbre/loudness analysis)
        const segments = (fullAnalysis.segments || []).slice(0, 50).map((s: any) => ({
          start: Math.round(s.start * 100) / 100,
          duration: Math.round(s.duration * 100) / 100,
          loudness_start: Math.round(s.loudness_start * 10) / 10,
          loudness_max: Math.round(s.loudness_max * 10) / 10,
          timbre: (s.timbre || []).slice(0, 6).map((t: number) => Math.round(t * 10) / 10),
          pitches: s.pitches,
        }));

        // Bars (first 16)
        const bars = (fullAnalysis.bars || []).slice(0, 16).map((b: any) => ({
          start: Math.round(b.start * 1000) / 1000,
          duration: Math.round(b.duration * 1000) / 1000,
          confidence: Math.round(b.confidence * 100) / 100,
        }));

        analysis = {
          sections,
          beats,
          segments,
          bars,
          track: fullAnalysis.track ? {
            duration: fullAnalysis.track.duration,
            tempo: fullAnalysis.track.tempo,
            tempo_confidence: fullAnalysis.track.tempo_confidence,
            time_signature: fullAnalysis.track.time_signature,
            time_signature_confidence: fullAnalysis.track.time_signature_confidence,
            key: fullAnalysis.track.key,
            key_confidence: fullAnalysis.track.key_confidence,
            mode: fullAnalysis.track.mode,
            mode_confidence: fullAnalysis.track.mode_confidence,
            loudness: fullAnalysis.track.loudness,
          } : null,
        };
      }

      return new Response(JSON.stringify({ features, track, analysis }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Search tracks (query already validated above)

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
      preview_url: t.preview_url || null,
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
