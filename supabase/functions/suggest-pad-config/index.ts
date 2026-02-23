import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const body = await req.json();
    const trackName = typeof body.trackName === "string" ? body.trackName.slice(0, 300) : "Unknown";
    const artist = typeof body.artist === "string" ? body.artist.slice(0, 300) : "Unknown";
    // BPM and Key are now pre-fetched from songbpm.com on the frontend
    const realBpm: number | null = typeof body.bpm === "number" ? body.bpm : null;
    const realKey: string | null = typeof body.key === "string" ? body.key : null;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const bpmInfo = realBpm
      ? `BPM REAL (fonte: songbpm.com): ${realBpm}. USE EXATAMENTE ESTE VALOR.`
      : `BPM: NÃO encontrado no songbpm.com. Use seu conhecimento musical para estimar com precisão.`;

    const keyInfo = realKey
      ? `TOM REAL (fonte: songbpm.com): ${realKey}. USE EXATAMENTE ESTE VALOR.`
      : `TOM: NÃO encontrado no songbpm.com. Use seu conhecimento musical para estimar com precisão.`;

    const systemPrompt = `Você é um especialista em produção musical e bateria para worship/louvor.
Dado os dados de uma música, sugira configurações para 8 pads de bateria que repliquem fielmente o estilo rítmico e sonoro da música.

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

CRÍTICO - BPM e TOM:
${bpmInfo}
${keyInfo}
Quando os valores reais estão fornecidos acima, você DEVE usá-los no JSON de resposta exatamente como informados. Não altere esses valores.
A tonalidade deve ser no formato: "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" seguido de "m" para menor. Ex: "Am", "D", "F#m"

Também sugira:
- bpm: o BPM exato (use o valor real fornecido acima quando disponível)
- key: a tonalidade exata (use o valor real fornecido acima quando disponível)
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
    "snare": { "volume": number, "eqLow": number, "eqMid": number, "eqHigh": number, "reverb": number, "delay": number, "delayTime": number, "pattern": number[] },
    "hihat-closed": { "volume": number, "eqLow": number, "eqMid": number, "eqHigh": number, "reverb": number, "delay": number, "delayTime": number, "pattern": number[] },
    "hihat-open": { "volume": number, "eqLow": number, "eqMid": number, "eqHigh": number, "reverb": number, "delay": number, "delayTime": number, "pattern": number[] },
    "crash": { "volume": number, "eqLow": number, "eqMid": number, "eqHigh": number, "reverb": number, "delay": number, "delayTime": number, "pattern": number[] },
    "clap": { "volume": number, "eqLow": number, "eqMid": number, "eqHigh": number, "reverb": number, "delay": number, "delayTime": number, "pattern": number[] },
    "loop-worship-1": { "volume": number, "eqLow": number, "eqMid": number, "eqHigh": number, "reverb": number, "delay": number, "delayTime": number, "pattern": [] },
    "loop-worship-2": { "volume": number, "eqLow": number, "eqMid": number, "eqHigh": number, "reverb": number, "delay": number, "delayTime": number, "pattern": [] }
  }
}`;

    const userPrompt = `Música: "${trackName}" de ${artist}

${realBpm ? `BPM CONFIRMADO pelo songbpm.com: ${realBpm}` : "BPM: use seu conhecimento musical."}
${realKey ? `TOM CONFIRMADO pelo songbpm.com: ${realKey}` : "TOM: use seu conhecimento musical."}

Sugira configurações de pads e padrões rítmicos que repliquem fielmente o acompanhamento de bateria desta música. Use EXATAMENTE os IDs de pad listados acima.`;

    // Call Lovable AI Gateway with GPT-5
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
      const errBody = await response.text();
      console.error("AI gateway error:", response.status, errBody);
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

    // Override BPM/key with real values if found
    if (realBpm) config.bpm = realBpm;
    if (realKey) config.key = realKey;

    return new Response(JSON.stringify({
      config,
      source: {
        bpm: realBpm ? "songbpm.com" : "ai",
        key: realKey ? "songbpm.com" : "ai",
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-pad-config error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
