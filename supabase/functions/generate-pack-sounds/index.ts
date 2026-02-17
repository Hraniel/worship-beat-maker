import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Prompt builders per pack category ──────────────────────────────

function buildPrompt(soundName: string, packName: string): { prompt: string; duration: number; method: "elevenlabs" | "synth"; synthParams?: Record<string, number> } {
  const name = soundName.toLowerCase();

  // ── WORSHIP PADS (Strings / Warm) ──
  if (packName === "Worship Strings") {
    const note = soundName.replace("Strings ", "");
    return {
      method: "elevenlabs",
      duration: 8,
      prompt: `Sustained orchestral string ensemble pad in the key of ${note}, deep lush worship atmosphere, cathedral reverb, warm rich harmonics, cinematic ambient texture, no percussion, no melody, just a sustained beautiful string chord in ${note}`,
    };
  }

  if (packName === "Warm Pads") {
    const note = soundName.replace("Warm Pad ", "");
    return {
      method: "elevenlabs",
      duration: 8,
      prompt: `Warm analog synthesizer worship pad in the key of ${note}, soft lush detuned oscillators, deep reverb, ambient prayer atmosphere, sustained gentle chord, no drums, no melody, just a warm enveloping pad tone in ${note}`,
    };
  }

  // ── DRUMS DRY ──
  if (packName === "Worship Drums Dry") {
    if (name.includes("sub kick"))       return { method: "synth", duration: 700, prompt: "", synthParams: { freq: 35, decay: 0.7, punch: 1.0 } };
    if (name.includes("deep kick"))      return { method: "synth", duration: 600, prompt: "", synthParams: { freq: 50, decay: 0.55, punch: 0.85 } };
    if (name.includes("punchy kick"))    return { method: "synth", duration: 450, prompt: "", synthParams: { freq: 65, decay: 0.35, punch: 0.95 } };
    if (name.includes("tight kick"))     return { method: "synth", duration: 300, prompt: "", synthParams: { freq: 70, decay: 0.2, punch: 0.9 } };
    if (name.includes("snare tight"))    return { method: "synth", duration: 300, prompt: "", synthParams: { freq: 220, noise: 0.6, decay: 0.18 } };
    if (name.includes("snare fat"))      return { method: "synth", duration: 450, prompt: "", synthParams: { freq: 180, noise: 0.8, decay: 0.35 } };
    if (name.includes("snare rimshot"))  return { method: "synth", duration: 250, prompt: "", synthParams: { freq: 400, noise: 0.35, decay: 0.12 } };
    if (name.includes("snare brush"))    return { method: "synth", duration: 350, prompt: "", synthParams: { freq: 280, noise: 0.5, decay: 0.22 } };
    if (name.includes("clap dry"))       return { method: "synth", duration: 280, prompt: "", synthParams: { freq: 1200, noise: 0.9, decay: 0.18 } };
    if (name.includes("clap layered"))   return { method: "synth", duration: 320, prompt: "", synthParams: { freq: 1400, noise: 0.85, decay: 0.22 } };
    if (name.includes("hi-hat closed"))  return { method: "synth", duration: 80, prompt: "", synthParams: { freq: 7000, noise: 1, decay: 0.04 } };
    if (name.includes("hi-hat open"))    return { method: "synth", duration: 400, prompt: "", synthParams: { freq: 5500, noise: 1, decay: 0.3 } };
    if (name.includes("hi-hat pedal"))   return { method: "synth", duration: 60, prompt: "", synthParams: { freq: 6000, noise: 1, decay: 0.03 } };
    if (name.includes("crash"))          return { method: "synth", duration: 1800, prompt: "", synthParams: { freq: 4000, noise: 1, decay: 1.3 } };
    if (name.includes("ride bell"))      return { method: "synth", duration: 900, prompt: "", synthParams: { freq: 3200, noise: 0.3, decay: 0.65 } };
    if (name.includes("ride edge"))      return { method: "synth", duration: 1200, prompt: "", synthParams: { freq: 4500, noise: 0.8, decay: 0.85 } };
  }

  // ── DRUMS REVERB ──
  if (packName === "Worship Drums Reverb") {
    if (name.includes("sub kick"))       return { method: "elevenlabs", duration: 2, prompt: "Deep sub bass kick drum hit with massive hall reverb tail, worship drum sound, boomy and resonant, single hit" };
    if (name.includes("deep kick"))      return { method: "elevenlabs", duration: 2, prompt: "Deep kick drum hit with large hall reverb, worship style, warm and resonant, single hit" };
    if (name.includes("punchy kick"))    return { method: "elevenlabs", duration: 2, prompt: "Punchy kick drum hit with hall reverb, worship drum, tight attack with reverb tail, single hit" };
    if (name.includes("tight kick"))     return { method: "elevenlabs", duration: 2, prompt: "Tight kick drum hit with subtle room reverb, worship drum, controlled decay, single hit" };
    if (name.includes("snare tight"))    return { method: "elevenlabs", duration: 2, prompt: "Tight snare drum hit with large hall reverb, worship drum, crisp attack with long tail, single hit" };
    if (name.includes("snare fat"))      return { method: "elevenlabs", duration: 3, prompt: "Fat thick snare drum hit with massive cathedral reverb, worship drum, full body, single hit" };
    if (name.includes("snare rimshot"))  return { method: "elevenlabs", duration: 2, prompt: "Snare rimshot with plate reverb, worship drum, sharp crack with metallic tail, single hit" };
    if (name.includes("snare brush"))    return { method: "elevenlabs", duration: 2, prompt: "Brush snare hit with warm room reverb, worship drum, soft and intimate, single hit" };
    if (name.includes("clap reverb"))    return { method: "elevenlabs", duration: 2, prompt: "Hand clap with large hall reverb, worship percussion, single clap with long tail" };
    if (name.includes("clap hall"))      return { method: "elevenlabs", duration: 3, prompt: "Hand clap in massive cathedral hall, worship percussion, huge reverb, single clap" };
    if (name.includes("hi-hat closed"))  return { method: "elevenlabs", duration: 1, prompt: "Closed hi-hat with subtle room reverb, worship drum, crisp and short, single hit" };
    if (name.includes("hi-hat open"))    return { method: "elevenlabs", duration: 2, prompt: "Open hi-hat with room reverb, worship drum, sizzling with spatial decay, single hit" };
    if (name.includes("hi-hat pedal"))   return { method: "elevenlabs", duration: 1, prompt: "Hi-hat pedal click with room reverb, worship drum, very short and tight, single hit" };
    if (name.includes("crash"))          return { method: "elevenlabs", duration: 4, prompt: "Crash cymbal with cathedral reverb, worship drum, massive shimmer and long decay, single hit" };
    if (name.includes("ride bell"))      return { method: "elevenlabs", duration: 3, prompt: "Ride bell hit with hall reverb, worship drum, clear ping with reverberant tail, single hit" };
    if (name.includes("ride edge"))      return { method: "elevenlabs", duration: 3, prompt: "Ride edge hit with hall reverb, worship drum, washy and atmospheric, single hit" };
  }

  // ── PERCUSSION ──
  if (packName === "Worship Percussion") {
    if (name.includes("shaker dry"))       return { method: "synth", duration: 150, prompt: "", synthParams: { freq: 9000, noise: 1, decay: 0.08 } };
    if (name.includes("shaker reverb"))    return { method: "elevenlabs", duration: 1, prompt: "Shaker percussion hit with room reverb, worship atmosphere, single shake" };
    if (name.includes("tamborim dry"))     return { method: "synth", duration: 120, prompt: "", synthParams: { freq: 3500, noise: 0.6, decay: 0.06 } };
    if (name.includes("tamborim reverb")) return { method: "elevenlabs", duration: 1, prompt: "Tambourine hit with hall reverb, worship percussion, single jingle hit" };
    if (name.includes("finger snap dry")) return { method: "synth", duration: 100, prompt: "", synthParams: { freq: 2500, noise: 0.6, decay: 0.05 } };
    if (name.includes("finger snap reverb")) return { method: "elevenlabs", duration: 2, prompt: "Finger snap with large hall reverb, worship atmosphere, single crisp snap" };
    if (name.includes("conga open"))      return { method: "synth", duration: 400, prompt: "", synthParams: { freq: 200, decay: 0.35, punch: 0.5 } };
    if (name.includes("conga slap"))      return { method: "synth", duration: 200, prompt: "", synthParams: { freq: 350, noise: 0.4, decay: 0.12 } };
    if (name.includes("bongo hi"))        return { method: "synth", duration: 200, prompt: "", synthParams: { freq: 400, decay: 0.15, punch: 0.4 } };
    if (name.includes("bongo lo"))        return { method: "synth", duration: 250, prompt: "", synthParams: { freq: 280, decay: 0.2, punch: 0.4 } };
    if (name.includes("woodblock"))       return { method: "synth", duration: 100, prompt: "", synthParams: { freq: 1200, noise: 0.1, decay: 0.05 } };
    if (name.includes("triangle"))        return { method: "synth", duration: 600, prompt: "", synthParams: { freq: 4000, noise: 0.15, decay: 0.45 } };
  }

  // Fallback
  return { method: "elevenlabs", duration: 3, prompt: `${soundName} sound effect, single hit, clean recording` };
}

// ── Web Audio synthesis (WAV) ──────────────────────────────

function synthesizeDrumSound(params: Record<string, number>, durationMs: number, sampleRate = 44100): ArrayBuffer {
  const length = Math.floor((durationMs / 1000) * sampleRate);
  const buffer = new Float32Array(length);
  const freq = params.freq || 200;
  const decay = params.decay || 0.3;
  const noise = params.noise || 0;
  const punch = params.punch || 0;

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t / decay);
    const punchFreq = punch > 0 ? freq * (1 + punch * 4 * Math.exp(-t * 40)) : freq;
    let sample = Math.sin(2 * Math.PI * punchFreq * t) * env * (1 - noise);
    if (noise > 0) sample += (Math.random() * 2 - 1) * env * noise;
    sample = Math.tanh(sample * 1.5);
    buffer[i] = sample;
  }

  const wavBuffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(wavBuffer);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, length * 2, true);

  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    view.setInt16(44 + i * 2, s * 0x7fff, true);
  }
  return wavBuffer;
}

// ── Main handler ──────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !userData.user) throw new Error("Unauthorized");

    const { packId, limit } = await req.json();
    if (!packId) throw new Error("packId required");
    const maxSounds = limit || 5; // Process N sounds per call to avoid timeout

    // Fetch pack info
    const { data: pack, error: packErr } = await supabase
      .from("store_packs")
      .select("id, name")
      .eq("id", packId)
      .single();
    if (packErr || !pack) throw new Error(`Pack not found: ${packId}`);

    // Fetch sounds without file_path (not yet generated)
    const { data: sounds, error: soundsErr } = await supabase
      .from("pack_sounds")
      .select("*")
      .eq("pack_id", packId)
      .is("file_path", null)
      .order("sort_order")
      .limit(maxSounds);
    if (soundsErr) throw soundsErr;

    if (!sounds || sounds.length === 0) {
      return new Response(
        JSON.stringify({ pack_id: packId, pack_name: pack.name, total: 0, success: 0, message: "All sounds already generated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[GENERATE] Pack: ${pack.name} — ${sounds.length} sounds to generate`);

    const results: { name: string; status: string }[] = [];

    for (let i = 0; i < sounds.length; i++) {
      const sound = sounds[i];
      const config = buildPrompt(sound.name, pack.name);
      console.log(`[GENERATE] ${i + 1}/${sounds.length}: ${sound.name} (${config.method})`);

      try {
        let audioBuffer: ArrayBuffer;
        let contentType: string;
        let ext: string;

        if (config.method === "elevenlabs") {
          const elResponse = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
            method: "POST",
            headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({
              text: config.prompt,
              duration_seconds: config.duration,
              prompt_influence: 0.4,
            }),
          });

          if (!elResponse.ok) {
            const errText = await elResponse.text();
            throw new Error(`ElevenLabs ${elResponse.status}: ${errText}`);
          }
          audioBuffer = await elResponse.arrayBuffer();
          contentType = "audio/mpeg";
          ext = "mp3";
        } else {
          audioBuffer = synthesizeDrumSound(config.synthParams || {}, config.duration);
          contentType = "audio/wav";
          ext = "wav";
        }

        // Upload full sound to private bucket
        const fullPath = `${packId}/${sound.short_name}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("sound-packs")
          .upload(fullPath, audioBuffer, { contentType, upsert: true });
        if (uploadErr) throw uploadErr;

        // Upload preview to public bucket
        const previewPath = `${packId}/${sound.short_name}_preview.${ext}`;
        const { error: previewErr } = await supabase.storage
          .from("sound-previews")
          .upload(previewPath, audioBuffer, { contentType, upsert: true });
        if (previewErr) throw previewErr;

        // Update sound record with file paths
        await supabase
          .from("pack_sounds")
          .update({
            file_path: fullPath,
            preview_path: previewPath,
            duration_ms: config.method === "elevenlabs" ? config.duration * 1000 : config.duration,
          })
          .eq("id", sound.id);

        results.push({ name: sound.name, status: "ok" });
        console.log(`[GENERATE] ✓ ${sound.name}`);

        // Small delay between ElevenLabs calls to avoid rate limiting
        if (config.method === "elevenlabs" && i < sounds.length - 1) {
          await new Promise(r => setTimeout(r, 1500));
        }
      } catch (soundError) {
        const msg = soundError instanceof Error ? soundError.message : String(soundError);
        results.push({ name: sound.name, status: `error: ${msg}` });
        console.error(`[GENERATE] ✗ ${sound.name}: ${msg}`);
      }
    }

    const successCount = results.filter(r => r.status === "ok").length;
    console.log(`[GENERATE] Done: ${successCount}/${sounds.length}`);

    return new Response(
      JSON.stringify({ pack_id: packId, pack_name: pack.name, total: sounds.length, success: successCount, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[GENERATE] ERROR: ${msg}`);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
