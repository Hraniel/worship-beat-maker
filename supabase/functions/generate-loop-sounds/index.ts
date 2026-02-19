import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Drum synthesis ──────────────────────────────

function synthHit(
  params: { freq: number; decay: number; noise?: number; punch?: number },
  durationMs: number,
  sampleRate: number
): Float32Array {
  const length = Math.floor((durationMs / 1000) * sampleRate);
  const buf = new Float32Array(length);
  const { freq, decay, noise = 0, punch = 0 } = params;

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t / decay);
    const pFreq = punch > 0 ? freq * (1 + punch * 4 * Math.exp(-t * 40)) : freq;
    let s = Math.sin(2 * Math.PI * pFreq * t) * env * (1 - noise);
    if (noise > 0) s += (Math.random() * 2 - 1) * env * noise;
    buf[i] = Math.tanh(s * 1.5);
  }
  return buf;
}

// Pre-render kick and snare with reverb-like long decay
function renderKick(sampleRate: number): Float32Array {
  return synthHit({ freq: 50, decay: 0.3, punch: 0.9 }, 600, sampleRate);
}

function renderSnare(sampleRate: number): Float32Array {
  return synthHit({ freq: 280, decay: 0.2, noise: 0.4 }, 400, sampleRate);
}

// ── Mix hits into a timeline buffer ──────────────────────────────

function mixLoop(
  hits: { sample: Float32Array; offsetSamples: number }[],
  totalSamples: number
): Float32Array {
  const buf = new Float32Array(totalSamples);
  for (const hit of hits) {
    for (let i = 0; i < hit.sample.length; i++) {
      const pos = hit.offsetSamples + i;
      if (pos < totalSamples) {
        buf[pos] += hit.sample[i];
      }
    }
  }
  // Normalize
  let peak = 0;
  for (let i = 0; i < totalSamples; i++) {
    const abs = Math.abs(buf[i]);
    if (abs > peak) peak = abs;
  }
  if (peak > 1) {
    const scale = 0.95 / peak;
    for (let i = 0; i < totalSamples; i++) buf[i] *= scale;
  }
  return buf;
}

// ── WAV encoder ──────────────────────────────

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const length = samples.length;
  const wavBuf = new ArrayBuffer(44 + length * 2);
  const view = new DataView(wavBuf);
  const writeStr = (off: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
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
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s * 0x7fff, true);
  }
  return wavBuf;
}

// ── Loop definitions ──────────────────────────────

interface LoopDef {
  name: string;
  shortName: string;
  packId: string;
  bpm: number;
  bars: number;
  // subdivisions per bar (16 for 4/4 using 16th notes, 12 for 6/8 using 8th note triplets)
  subsPerBar: number;
  // hits: [subdivisionIndex, 'kick' | 'snare']
  hits: [number, "kick" | "snare"][];
}

const PACK_44 = "ee6f328e-68da-4d34-8dcb-99fb9ed8953d";
const PACK_68 = "bff34d03-ed9c-4fd0-98c0-ff0e2c8b13f8";

const loops: LoopDef[] = [
  {
    name: "Worship Snap 4/4",
    shortName: "WSP44",
    packId: PACK_44,
    bpm: 120,
    bars: 2,
    subsPerBar: 16, // 16th-note grid
    // Reference: kicks at 0, 6, 12 (bar 1) + snare at 24 (bar 2 beat 3)
    hits: [
      [0, "kick"], [6, "kick"], [12, "kick"],
      [24, "snare"],
    ],
  },
  {
    name: "Worship Snap 6/8",
    shortName: "WSP68",
    packId: PACK_68,
    bpm: 120,
    bars: 2,
    subsPerBar: 12, // 12 eighth-note subdivisions per bar in 6/8
    // 6/8 adapted: kick on 1 and 4 (subdivisions 0, 3) bar 1, kick on 1 bar 2, snare on 4 bar 2
    hits: [
      [0, "kick"], [3, "kick"],
      [12, "kick"], [15, "snare"],
    ],
  },
];

// ── Main handler ──────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const sampleRate = 44100;
    const kick = renderKick(sampleRate);
    const snare = renderSnare(sampleRate);

    const results: { name: string; status: string }[] = [];

    for (const loop of loops) {
      try {
        console.log(`[LOOP] Generating: ${loop.name}`);

        // Calculate subdivision duration in samples
        // For 4/4: 1 beat (quarter note) = 60/bpm seconds, 1 16th = beat/4
        // For 6/8: 1 dotted quarter = 60/bpm, 1 eighth = (60/bpm)/3
        let subDurationSec: number;
        if (loop.subsPerBar === 16) {
          // 4/4: subdivision = 16th note = (60/bpm) / 4
          subDurationSec = (60 / loop.bpm) / 4;
        } else {
          // 6/8: subdivision = 8th note, dotted quarter = 60/bpm
          // 6 eighth notes per bar, dotted quarter groups 3 eighths
          subDurationSec = (60 / loop.bpm) / 3;
        }

        const subSamples = Math.floor(subDurationSec * sampleRate);
        const totalSubs = loop.subsPerBar * loop.bars;
        const totalSamples = subSamples * totalSubs;
        const durationMs = Math.round((totalSamples / sampleRate) * 1000);

        // Build hit list
        const hitList = loop.hits.map(([sub, type]) => ({
          sample: type === "kick" ? kick : snare,
          offsetSamples: sub * subSamples,
        }));

        const mixed = mixLoop(hitList, totalSamples);
        const wavData = encodeWav(mixed, sampleRate);

        // Upload to both buckets
        const fileName = `${loop.shortName.toLowerCase()}.wav`;
        const fullPath = `${loop.packId}/${fileName}`;
        const previewPath = `${loop.packId}/${loop.shortName.toLowerCase()}_preview.wav`;

        const { error: upErr } = await supabase.storage
          .from("sound-packs")
          .upload(fullPath, wavData, { contentType: "audio/wav", upsert: true });
        if (upErr) throw upErr;

        const { error: prevErr } = await supabase.storage
          .from("sound-previews")
          .upload(previewPath, wavData, { contentType: "audio/wav", upsert: true });
        if (prevErr) throw prevErr;

        // Upsert into pack_sounds
        // Check if already exists
        const { data: existing } = await supabase
          .from("pack_sounds")
          .select("id")
          .eq("pack_id", loop.packId)
          .eq("short_name", loop.shortName)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("pack_sounds")
            .update({ file_path: fullPath, preview_path: previewPath, duration_ms: durationMs })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("pack_sounds")
            .insert({
              pack_id: loop.packId,
              name: loop.name,
              short_name: loop.shortName,
              category: "loop",
              file_path: fullPath,
              preview_path: previewPath,
              duration_ms: durationMs,
              sort_order: 0,
            });
        }

        results.push({ name: loop.name, status: "ok" });
        console.log(`[LOOP] ✓ ${loop.name} (${durationMs}ms)`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ name: loop.name, status: `error: ${msg}` });
        console.error(`[LOOP] ✗ ${loop.name}: ${msg}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[LOOP] ERROR: ${msg}`);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
