import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { trackName, artist, features } = await req.json();

    const systemPrompt = `Você é um especialista em produção musical e bateria para worship/louvor.
Dado os dados de uma música do Spotify, sugira configurações para 8 pads de bateria.

Os 8 pads disponíveis são (nesta ordem):
1. kick - Bumbo
2. snare - Caixa  
3. hihat-closed - Hi-Hat Fechado
4. hihat-open - Hi-Hat Aberto
5. crash - Crash/Prato
6. clap - Palma
7. loop-rock - Loop Rock Beat (pad de loop)
8. loop-ballad - Loop Ballad (pad de loop)

Para cada pad, sugira:
- volume: 0-1 (ex: 0.7)
- eqLow: -12 a 12 dB
- eqMid: -12 a 12 dB  
- eqHigh: -12 a 12 dB
- reverb: 0-1
- delay: 0-1
- delayTime: 0.1-1.0 segundos
- pan: -1 (esquerda) a 1 (direita), 0 = centro

Também sugira:
- bpm: o BPM ideal
- timeSignature: "4/4", "3/4" ou "6/8"
- recommendedLoop: "loop-rock" ou "loop-ballad" (qual loop usar)
- description: breve descrição do estilo rítmico sugerido (max 2 frases)

Responda APENAS com JSON válido usando esta estrutura exata:
{
  "bpm": number,
  "timeSignature": string,
  "recommendedLoop": string,
  "description": string,
  "pads": {
    "kick": { "volume": number, "eqLow": number, "eqMid": number, "eqHigh": number, "reverb": number, "delay": number, "delayTime": number, "pan": number },
    ...para cada pad
  }
}`;

    const userPrompt = `Música: "${trackName}" de ${artist}

Dados do Spotify:
- Tempo/BPM: ${features?.tempo || "desconhecido"}
- Energia: ${features?.energy || "desconhecida"} (0-1)
- Danceability: ${features?.danceability || "desconhecida"} (0-1)
- Valence (positividade): ${features?.valence || "desconhecida"} (0-1)
- Acousticness: ${features?.acousticness || "desconhecida"} (0-1)
- Instrumentalness: ${features?.instrumentalness || "desconhecida"} (0-1)
- Loudness: ${features?.loudness || "desconhecida"} dB
- Key: ${features?.key ?? "desconhecida"}
- Mode: ${features?.mode === 1 ? "maior" : features?.mode === 0 ? "menor" : "desconhecido"}
- Time Signature: ${features?.time_signature || "desconhecido"}

Sugira as configurações ideais dos pads para reproduzir um acompanhamento rítmico similar a esta música.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    console.log("Calling Lovable AI Gateway...");
    const response = await fetch("https://ai-gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("AI Gateway error:", response.status, body);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in AI response:", content);
      throw new Error("Invalid AI response format");
    }

    const config = JSON.parse(jsonMatch[0]);
    console.log("Successfully generated pad config");
    
    return new Response(JSON.stringify({ config }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-pad-config error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
