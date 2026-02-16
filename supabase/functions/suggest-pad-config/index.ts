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
    const features = body.features && typeof body.features === "object" ? body.features : {};
    const analysis = body.analysis && typeof body.analysis === "object" ? body.analysis : null;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um especialista em produção musical e bateria para worship/louvor.
Dado os dados de uma música do Spotify (incluindo análise de áudio real), sugira configurações para 8 pads de bateria que repliquem fielmente o estilo rítmico e sonoro da música.

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
- eqLow: -12 a 12 dB (baseado nos timbres reais detectados)
- eqMid: -12 a 12 dB
- eqHigh: -12 a 12 dB
- reverb: 0-1 (baseado na reverberação detectada na análise)
- delay: 0-1
- delayTime: 0.1-1.0 segundos (sincronize com o BPM quando possível)
- pan: -1 (esquerda) a 1 (direita), 0 = centro

IMPORTANTE - Padrão Rítmico:
Para cada pad, inclua também um campo "pattern" que é um array de 0s e 1s representando quais subdivisões do compasso o instrumento deve tocar.
- Para 4/4: use 16 subdivisões (semicolcheias). Ex: kick típico = [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]
- Para 3/4: use 12 subdivisões. 
- Para 6/8: use 12 subdivisões.
- Use valores entre 0 e 1 (0 = silêncio, 1 = toque forte, 0.5 = ghost note/toque suave)

Exemplos de padrões comuns em worship:
- Kick 4/4 básico: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]
- Snare em 2 e 4: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]
- Hi-hat em colcheias: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]
- Hi-hat aberto no "e" do 4: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0]

Analise os dados de áudio reais (seções, segmentos com timbre, batidas) para:
1. Detectar a intensidade e tipo de reverberação
2. Identificar a panoramização dos instrumentos
3. Replicar a equalização baseada nos timbres
4. Criar padrões rítmicos que se aproximem da bateria original

Também sugira:
- bpm: o BPM ideal (use o valor detectado na análise se disponível)
- timeSignature: "4/4", "3/4" ou "6/8"
- recommendedLoop: "loop-rock" ou "loop-ballad" (qual loop usar)
- description: breve descrição do estilo rítmico sugerido (max 2 frases)
- patternName: nome curto do padrão rítmico (ex: "Rock Worship", "Ballad Suave", "Driving 8ths")

Responda APENAS com JSON válido usando esta estrutura exata:
{
  "bpm": number,
  "key": string, // ex: "C", "D#m", "Gb", "Am" - tonalidade da música
  "timeSignature": string,
  "recommendedLoop": string,
  "description": string,
  "patternName": string,
  "pads": {
    "kick": { "volume": number, "eqLow": number, "eqMid": number, "eqHigh": number, "reverb": number, "delay": number, "delayTime": number, "pan": number, "pattern": number[] },
    "snare": { ... },
    "hihat-closed": { ... },
    "hihat-open": { ... },
    "crash": { ... },
    "clap": { ... },
    "loop-rock": { "volume": number, "eqLow": number, "eqMid": number, "eqHigh": number, "reverb": number, "delay": number, "delayTime": number, "pan": number, "pattern": [] },
    "loop-ballad": { "volume": number, "eqLow": number, "eqMid": number, "eqHigh": number, "reverb": number, "delay": number, "delayTime": number, "pan": number, "pattern": [] }
  }
}`;

    let userPrompt = `Música: "${trackName}" de ${artist}

Dados do Spotify Audio Features:
- Tempo/BPM: ${features?.tempo || "desconhecido"}
- Energia: ${features?.energy || "desconhecida"} (0-1)
- Danceability: ${features?.danceability || "desconhecida"} (0-1)
- Valence (positividade): ${features?.valence || "desconhecida"} (0-1)
- Acousticness: ${features?.acousticness || "desconhecida"} (0-1)
- Instrumentalness: ${features?.instrumentalness || "desconhecida"} (0-1)
- Loudness: ${features?.loudness || "desconhecida"} dB
- Key: ${features?.key ?? "desconhecida"}
- Mode: ${features?.mode === 1 ? "maior" : features?.mode === 0 ? "menor" : "desconhecido"}
- Time Signature: ${features?.time_signature || "desconhecido"}`;

    // Add real audio analysis data if available
    if (analysis) {
      if (analysis.track) {
        userPrompt += `\n\nAnálise de Áudio Real (Track):
- Tempo real: ${analysis.track.tempo} BPM (confiança: ${analysis.track.tempo_confidence})
- Compasso real: ${analysis.track.time_signature} (confiança: ${analysis.track.time_signature_confidence})
- Tonalidade: ${analysis.track.key} (confiança: ${analysis.track.key_confidence})
- Modo: ${analysis.track.mode === 1 ? "maior" : "menor"} (confiança: ${analysis.track.mode_confidence})
- Loudness geral: ${analysis.track.loudness} dB`;
      }

      if (analysis.sections?.length) {
        userPrompt += `\n\nSeções da Música (${analysis.sections.length} seções):`;
        for (const s of analysis.sections.slice(0, 8)) {
          userPrompt += `\n- ${s.start}s (${s.duration}s): loudness=${s.loudness}dB, tempo=${s.tempo}, key=${s.key}, sig=${s.time_signature}`;
        }
      }

      if (analysis.segments?.length) {
        // Compute average timbre values for the first segments
        const avgTimbre = [0, 0, 0, 0, 0, 0];
        let count = 0;
        for (const seg of analysis.segments) {
          if (seg.timbre) {
            for (let i = 0; i < 6; i++) avgTimbre[i] += seg.timbre[i] || 0;
            count++;
          }
        }
        if (count > 0) {
          for (let i = 0; i < 6; i++) avgTimbre[i] = Math.round(avgTimbre[i] / count * 10) / 10;
          userPrompt += `\n\nAnálise de Timbre (média dos primeiros ${count} segmentos):
- Timbre[0] (loudness/brilho): ${avgTimbre[0]}
- Timbre[1] (brilho/escuridão): ${avgTimbre[1]}
- Timbre[2] (flatness): ${avgTimbre[2]}
- Timbre[3] (ataque forte/suave): ${avgTimbre[3]}
- Timbre[4] (5th MFCC): ${avgTimbre[4]}
- Timbre[5] (6th MFCC): ${avgTimbre[5]}
Use estes valores para calibrar EQ e reverb dos pads.`;
        }

        // Loudness dynamics
        const loudnesses = analysis.segments.map((s: any) => s.loudness_max);
        const maxLoud = Math.max(...loudnesses);
        const minLoud = Math.min(...loudnesses);
        userPrompt += `\n- Dinâmica: ${minLoud}dB a ${maxLoud}dB (range: ${Math.round((maxLoud - minLoud) * 10) / 10}dB)`;
      }

      if (analysis.beats?.length) {
        const avgBeatDuration = analysis.beats.reduce((sum: number, b: any) => sum + b.duration, 0) / analysis.beats.length;
        userPrompt += `\n\nBatidas detectadas: ${analysis.beats.length} primeiras
- Duração média entre batidas: ${Math.round(avgBeatDuration * 1000)}ms
- BPM calculado pelas batidas: ${Math.round(60 / avgBeatDuration)}`;
      }

      if (analysis.bars?.length) {
        const avgBarDuration = analysis.bars.reduce((sum: number, b: any) => sum + b.duration, 0) / analysis.bars.length;
        userPrompt += `\n- Duração média do compasso: ${Math.round(avgBarDuration * 1000)}ms`;
      }
    }

    userPrompt += `\n\nCom base em TODOS estes dados reais, sugira configurações de pads e padrões rítmicos que repliquem fielmente o acompanhamento de bateria desta música.`;

    // Call Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
