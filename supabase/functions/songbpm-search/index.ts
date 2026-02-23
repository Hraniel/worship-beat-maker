import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Parse key from songbpm.com markdown which uses unicode ♯/♭ symbols
function parseKey(markdown: string): { key: string; mode: string } | null {
  const keyBlockMatch = markdown.match(/Key[\s\S]{0,30}?([A-G][♯♭#b]?)(?:\/[A-G][♯♭#b]?)?\s*(major|minor|maj|min|m\b)?/i);
  if (!keyBlockMatch) return null;

  let note = keyBlockMatch[1];
  const modeRaw = keyBlockMatch[2] || "";

  // Convert unicode symbols
  note = note.replace(/♯/g, "#").replace(/♭/g, "b");

  const isMinor = modeRaw.toLowerCase().startsWith("min") ||
    /minor/i.test(markdown.slice(0, 1200));

  const mode = isMinor ? "minor" : "major";
  const key = isMinor ? `${note}m` : note;
  return { key, mode };
}

// Extract song name and artist from songbpm.com page markdown
function parseTrackInfo(markdown: string, url: string): { name: string; artist: string } {
  // Try to get from URL: /@artist-slug/track-slug or /@artist-slug/track-slug-id4chars
  const urlMatch = url.match(/songbpm\.com\/@([^/]+)\/([^/?#]+)/);
  let name = "";
  let artist = "";

  if (urlMatch) {
    // Convert slugs back to readable names
    // Strip trailing ID suffix: last segment of 4-5 chars preceded by a hyphen (e.g. -bxhq3)
    const toTitle = (slug: string) => {
      // Remove trailing short ID suffix like -bxhq3 (4-6 alphanumeric chars)
      const cleaned = slug.replace(/-[a-z0-9]{4,6}$/, "");
      return cleaned.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    };
    artist = toTitle(urlMatch[1]);
    name = toTitle(urlMatch[2]);
  }

  // Try to get from markdown heading (usually more accurate)
  // songbpm.com headings are typically: "# Song Name" or "## Song Name"
  const headingMatch = markdown.match(/^#{1,2}\s+(.+?)(?:\n|$)/m);
  if (headingMatch) {
    const headingName = headingMatch[1].trim();
    // Only use if it's not a generic site heading
    if (headingName && !headingName.toLowerCase().includes("songbpm") && headingName.length < 120) {
      name = headingName;
    }
  }

  // Try artist from markdown patterns found on songbpm.com pages
  const artistMatch = markdown.match(/(?:by|artist|artista)[:\s]+([^\n]+)/i);
  if (artistMatch) {
    artist = artistMatch[1].trim();
  }

  return { name: name || "Unknown", artist: artist || "Unknown" };
}

// Extract Spotify URL from page markdown
function parseSpotifyUrl(markdown: string): string | null {
  const match = markdown.match(/https?:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]+/);
  return match ? match[0] : null;
}

// Extract duration from page markdown
function parseDuration(markdown: string): string | null {
  const match = markdown.match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : null;
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query } = await req.json();
    if (!query?.trim()) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "FIRECRAWL_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Searching songbpm.com for: "${query}"`);

    // Step 1: Use Firecrawl Search to find matching pages on songbpm.com
    const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `site:songbpm.com ${query}`,
        limit: 5,
        scrapeOptions: {
          formats: ["markdown"],
          onlyMainContent: true,
        },
      }),
    });

    if (!searchResponse.ok) {
      const errText = await searchResponse.text();
      console.error("Firecrawl search error:", searchResponse.status, errText);
      return new Response(JSON.stringify({ error: "Search failed", results: [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchData = await searchResponse.json();
    const rawResults = searchData.data || [];

    console.log(`Found ${rawResults.length} raw results`);

    // Step 2: Filter for valid songbpm.com track URLs and parse data
    const results = [];

    for (const item of rawResults) {
      const url: string = item.url || "";
      // Only include URLs matching pattern /@artist/track
      if (!url.match(/songbpm\.com\/@[^/]+\/[^/?#]+/)) continue;

      const markdown: string = item.markdown || "";
      if (!markdown || markdown.length < 50) continue;

      // Parse BPM
      const bpmMatch = markdown.match(/(\d{2,3})\s*\n*\s*BPM/i);
      if (!bpmMatch) continue; // skip pages without BPM data
      const bpm = parseInt(bpmMatch[1]);

      // Parse Key
      const keyData = parseKey(markdown);

      // Parse track info
      const { name, artist } = parseTrackInfo(markdown, url);

      // Parse Spotify URL
      const spotifyUrl = parseSpotifyUrl(markdown);

      // Parse duration
      const duration = parseDuration(markdown);

      results.push({
        name,
        artist,
        bpm,
        key: keyData?.key || null,
        mode: keyData?.mode || "major",
        duration: duration || null,
        spotifyUrl: spotifyUrl || null,
        songbpmUrl: url,
      });

      if (results.length >= 3) break;
    }

    console.log(`Returning ${results.length} parsed results`);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("songbpm-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", results: [] }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
