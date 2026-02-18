import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const trackName = typeof body.trackName === "string" ? body.trackName.slice(0, 300) : "Unknown";
    const artist = typeof body.artist === "string" ? body.artist.slice(0, 300) : "Unknown";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um especialista em produção musical e bateria para worship/louvor.
Dado os dados de uma música do Spotify (incluindo análise de áudio real quando disponível), sugira configurações para 8 pads de bateria que repliquem fielmente o estilo rítmico e sonoro da música.

Os 8 pads disponíveis são (use EXATAMENTE estes IDs):
1. kick - Bumbo
2. snare - Caixa  
3. hihat-closed - Hi-Hat Fechado
4. hihat-open - Hi-Hat Aberto
5. crash - Crash/Prato
6. clap - Palma
7. loop-worship-1 - Worship Snap (pad de loop contínuo)
8. loop-worship-2 - Worship Flow (pad de loop contínuo)

Para cada pad, sugira:
- volume: 0-1 (ex: 0.7)
- eqLow: -12 a 12 dB (baseado nos timbres reais detectados)
- eqMid: -12 a 12 dB
- eqHigh: -12 a 12 dB
- reverb: 0-1 (baseado na reverberação detectada na análise)
- delay: 0-1
- delayTime: 0.1-1.0 segundos (sincronize com o BPM quando possível)

IMPORTANTE: NÃO inclua o campo "pan" nas configurações dos pads. O pan será sempre mantido no centro.

IMPORTANTE - Padrão Rítmico:
Para cada pad (exceto loops), inclua um campo "pattern" que é um array de 0s e 1s representando quais subdivisões do compasso o instrumento deve tocar.
- Para 4/4: use 16 subdivisões (semicolcheias). Ex: kick típico = [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]
- Para 3/4: use 12 subdivisões. 
- Para 6/8: use 12 subdivisões.
- Use valores entre 0 e 1 (0 = silêncio, 1 = toque forte, 0.5 = ghost note/toque suave)

Exemplos de padrões comuns em worship:
- Kick 4/4 básico: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]
- Snare em 2 e 4: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]
- Hi-hat em colcheias: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]
- Hi-hat aberto no "e" do 4: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0]

Para os pads de loop (loop-worship-1 e loop-worship-2), use pattern vazio [].

IMPORTANTE - BPM e TOM:
- Você DEVE usar seu conhecimento musical interno para determinar o BPM e o tom CORRETOS da música.
- NÃO invente valores. Para músicas conhecidas, você SABE o BPM e tom reais. USE ESSE CONHECIMENTO.
- Se não conhecer a música exata, analise o artista, gênero e estilo para dar a melhor estimativa possível.
- A tonalidade deve ser no formato: "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" seguido de "m" para menor. Ex: "Am", "D", "F#m"

Também sugira:
- bpm: o BPM correto da música (priorize dados reais, depois seu conhecimento)
- key: a tonalidade correta da música (ex: "C", "Am", "D#m")
- timeSignature: "4/4", "3/4" ou "6/8"
- recommendedLoop: "loop-worship-1" ou "loop-worship-2" (qual loop usar)
- description: breve descrição do estilo rítmico sugerido (max 2 frases)
- patternName: nome curto do padrão rítmico (ex: "Rock Worship", "Ballad Suave", "Driving 8ths")

Responda APENAS com JSON válido usando esta estrutura exata:
{
  "bpm": number,
  "key": string,
  "timeSignature": string,
  "recommendedLoop": string,
  "description": string,
  "patternName": string,
  "pads": {
    "kick": { "volume": number, "eqLow": number, "eqMid": number, "eqHigh": number, "reverb": number, "delay": number, "delayTime": number, "pattern": number[] },
    "snare": { ... },
    "hihat-closed": { ... },
    "hihat-open": { ... },
    "crash": { ... },
    "clap": { ... },
    "loop-worship-1": { "volume": number, "eqLow": number, "eqMid": number, "eqHigh": number, "reverb": number, "delay": number, "delayTime": number, "pattern": [] },
    "loop-worship-2": { "volume": number, "eqLow": number, "eqMid": number, "eqHigh": number, "reverb": number, "delay": number, "delayTime": number, "pattern": [] }
  }
}`;

    const userPrompt = `Música: "${trackName}" de ${artist}

Você PRECISA determinar o BPM e tom REAIS desta música usando seu conhecimento musical. Para músicas conhecidas, forneça os valores exatos. Sugira configurações de pads e padrões rítmicos que repliquem fielmente o acompanhamento de bateria desta música. Use EXATAMENTE os IDs de pad listados acima.`;

    // Call Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em instantes." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const body = await response.text();
      console.error("AI gateway error:", response.status, body);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in AI response:", content);
      throw new Error("Invalid AI response");
    }

    const config = JSON.parse(jsonMatch[0]);
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