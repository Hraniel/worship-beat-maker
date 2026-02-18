import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json();
    if (!query?.trim()) {
      return new Response(JSON.stringify({ error: "Query é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");

    const systemPrompt = `Você é um especialista em música gospel, worship e cristã contemporânea.
O usuário vai digitar o nome de uma música, artista ou parte de uma letra.
Você deve retornar uma lista de até 5 músicas que correspondam à busca, priorizando:
1. Músicas de worship/gospel/cristã brasileira e internacional
2. Músicas que o usuário provavelmente está procurando com base no contexto

Para cada música, forneça:
- name: nome correto da música (com acentos e maiúsculas corretos)
- artist: artista/banda principal
- bpm: BPM real ou mais provável da música (use seu conhecimento musical)
- key: tonalidade no formato "C", "C#", "Db", "D", "Am", "Em", etc.
- mode: "major" ou "minor"

CRÍTICO: Responda SOMENTE com JSON válido no formato:
{
  "results": [
    { "name": "Nome da Música", "artist": "Artista", "bpm": 120, "key": "G", "mode": "major" },
    ...
  ]
}

Não inclua explicações, texto extra ou markdown. Apenas o JSON.`;

    const userPrompt = `Buscar músicas: "${query.trim()}"`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const errBody = await response.text();
      console.error("AI gateway error:", response.status, errBody);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON in AI response:", content);
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const results = (parsed.results || []).map((r: any) => ({
      name: typeof r.name === "string" ? r.name : "Desconhecida",
      artist: typeof r.artist === "string" ? r.artist : "Desconhecido",
      bpm: typeof r.bpm === "number" ? r.bpm : null,
      key: typeof r.key === "string" ? r.key : null,
      mode: typeof r.mode === "string" ? r.mode : "major",
    }));

    console.log(`music-search-ai: "${query}" → ${results.length} results`);

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
