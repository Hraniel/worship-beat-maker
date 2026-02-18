import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

let cachedSpotifyToken: { token: string; expiresAt: number } | null = null;

async function getSpotifyToken(): Promise<string | null> {
  if (cachedSpotifyToken && Date.now() < cachedSpotifyToken.expiresAt) {
    return cachedSpotifyToken.token;
  }
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;

  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: "grant_type=client_credentials",
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  cachedSpotifyToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedSpotifyToken.token;
}

async function fetchSpotifyImage(token: string, name: string, artist: string): Promise<{ image: string | null; previewUrl: string | null; spotifyId: string | null }> {
  try {
    const q = encodeURIComponent(`${name} ${artist}`);
    const resp = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=3`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return { image: null, previewUrl: null, spotifyId: null };
    const data = await resp.json();
    const track = data.tracks?.items?.[0];
    if (!track) return { image: null, previewUrl: null, spotifyId: null };
    return {
      image: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || null,
      previewUrl: track.preview_url || null,
      spotifyId: track.id || null,
    };
  } catch {
    return { image: null, previewUrl: null, spotifyId: null };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json();
    if (!query?.trim()) {
      return new Response(JSON.stringify({ error: "Query é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY não configurado");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");

    // Step 1: Search the web for real BPM/Key data using Firecrawl
    const searchQuery = `${query.trim()} BPM tonalidade key`;
    console.log(`Searching Firecrawl for: "${searchQuery}"`);

    const firecrawlRes = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 8,
        scrapeOptions: {
          formats: ["markdown"],
        },
      }),
    });

    if (!firecrawlRes.ok) {
      const err = await firecrawlRes.text();
      console.error("Firecrawl error:", firecrawlRes.status, err);
      throw new Error(`Firecrawl error: ${firecrawlRes.status}`);
    }

    const firecrawlData = await firecrawlRes.json();
    const searchResults = firecrawlData.data || [];

    console.log(`Firecrawl returned ${searchResults.length} results`);

    if (searchResults.length === 0) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context from search results
    const context = searchResults.map((r: any, i: number) => {
      const content = r.markdown || r.content || "";
      const trimmed = content.substring(0, 1500);
      return `--- Fonte ${i + 1}: ${r.url || "desconhecida"} ---\n${r.title || ""}\n${trimmed}`;
    }).join("\n\n");

    // Step 2: Use Gemini to parse real data from search results
    const systemPrompt = `Você é um extrator de dados musicais especializado.
Você vai receber resultados de busca na web sobre músicas.
Sua tarefa é extrair SOMENTE dados REAIS encontrados nas fontes, nunca inventar.

Para cada música encontrada, extraia:
- name: nome correto da música (com acentos e maiúsculas corretos)
- artist: artista/banda principal
- bpm: BPM REAL (número inteiro) encontrado na fonte - NUNCA invente
- key: tonalidade REAL encontrada (ex: "G", "Am", "C", "F#m") - NUNCA invente
- mode: "major" ou "minor" baseado na tonalidade
- source: URL da fonte onde encontrou os dados

Se não encontrar BPM ou tonalidade reais nas fontes, deixe como null.
Retorne até 5 músicas únicas.

CRÍTICO: Responda SOMENTE com JSON válido, sem markdown, sem texto extra:
{"results": [{"name": "...", "artist": "...", "bpm": 120, "key": "G", "mode": "major", "source": "https://..."}]}`;

    const userPrompt = `Busca do usuário: "${query.trim()}"

Resultados encontrados na web:
${context}

Extraia os dados musicais reais (BPM e tonalidade) das fontes acima.`;

    // Step 2 + Step 3 in parallel: AI parsing and Spotify token fetch
    const [aiRes, spotifyToken] = await Promise.all([
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }),
      getSpotifyToken(),
    ]);

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const errBody = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errBody);
      throw new Error(`AI gateway error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    let content = aiData.choices?.[0]?.message?.content || "";

    // Strip markdown code fences
    content = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON in AI response:", content);
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const rawResults = (parsed.results || []).map((r: any) => ({
      name: typeof r.name === "string" ? r.name : "Desconhecida",
      artist: typeof r.artist === "string" ? r.artist : "Desconhecido",
      bpm: typeof r.bpm === "number" ? r.bpm : null,
      key: typeof r.key === "string" ? r.key : null,
      mode: typeof r.mode === "string" ? r.mode : "major",
      source: typeof r.source === "string" ? r.source : null,
    }));

    // Step 3: Enrich with Spotify album covers (parallel)
    let results = rawResults;
    if (spotifyToken && rawResults.length > 0) {
      const enriched = await Promise.all(
        rawResults.map(async (r: any) => {
          const spotify = await fetchSpotifyImage(spotifyToken, r.name, r.artist);
          return {
            ...r,
            albumCover: spotify.image,
            previewUrl: spotify.previewUrl,
            spotifyId: spotify.spotifyId,
          };
        })
      );
      results = enriched;
    } else {
      results = rawResults.map((r: any) => ({ ...r, albumCover: null, previewUrl: null, spotifyId: null }));
    }

    console.log(`music-search-ai: "${query}" → ${results.length} results with covers`);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("music-search-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido", results: [] }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
