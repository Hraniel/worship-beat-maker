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

function renderKick(sampleRate: number): Float32Array {
  return synthHit({ freq: 50, decay: 0.3, punch: 0.9 }, 600, sampleRate);
}

function renderSnare(sampleRate: number): Float32Array {
  return synthHit({ freq: 280, decay: 0.2, noise: 0.4 }, 400, sampleRate);
}

function renderClap(sampleRate: number): Float32Array {
  // Clap: multiple short noise bursts layered
  const durationMs = 300;
  const length = Math.floor((durationMs / 1000) * sampleRate);
  const buf = new Float32Array(length);
  // 3 micro-bursts at slightly different offsets for "hand clap" feel
  const bursts = [0, 0.008, 0.018];
  for (const offset of bursts) {
    const startSample = Math.floor(offset * sampleRate);
    for (let i = startSample; i < length; i++) {
      const t = (i - startSample) / sampleRate;
      const env = Math.exp(-t / 0.08);
      buf[i] += (Math.random() * 2 - 1) * env * 0.5;
    }
  }
  // Bandpass-ish: apply a gentle high-pass by subtracting a smoothed version
  let prev = 0;
  for (let i = 0; i < length; i++) {
    const hp = buf[i] - prev;
    prev = buf[i];
    buf[i] = Math.tanh(hp * 2.5);
  }
  return buf;
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
  subsPerBar: number;
  hits: [number, "kick" | "snare" | "clap"][];
}

const PACK_44 = "ee6f328e-68da-4d34-8dcb-99fb9ed8953d";

// 16th-note grid: beat 1=0, 2=4, 2-and=6, 3=8, 3-and=10, 4=12, 4-and=14
// Bar 2 starts at 16

const loops: LoopDef[] = [
  {
    name: "Worship Pulse",
    shortName: "WLP1",
    packId: PACK_44,
    bpm: 120,
    bars: 2,
    subsPerBar: 16,
    hits: [
      [0, "kick"], [6, "kick"], [12, "kick"], [8, "snare"],
      [16, "kick"], [22, "kick"], [24, "clap"],
    ],
  },
  {
    name: "Worship Grace",
    shortName: "WLP2",
    packId: PACK_44,
    bpm: 120,
    bars: 2,
    subsPerBar: 16,
    hits: [
      [0, "kick"], [8, "clap"],
      [16, "kick"], [24, "kick"], [28, "snare"],
    ],
  },
  {
    name: "Worship Breath",
    shortName: "WLP3",
    packId: PACK_44,
    bpm: 120,
    bars: 2,
    subsPerBar: 16,
    hits: [
      [0, "kick"], [8, "kick"], [12, "snare"],
      [16, "kick"], [24, "clap"], [28, "kick"],
    ],
  },
  {
    name: "Worship Steady",
    shortName: "WLP4",
    packId: PACK_44,
    bpm: 120,
    bars: 2,
    subsPerBar: 16,
    hits: [
      [0, "kick"], [6, "kick"], [12, "clap"],
      [16, "kick"], [24, "snare"],
    ],
  },
  {
    name: "Worship Gentle",
    shortName: "WLP5",
    packId: PACK_44,
    bpm: 120,
    bars: 2,
    subsPerBar: 16,
    hits: [
      [0, "kick"], [10, "snare"], [12, "kick"],
      [16, "kick"], [20, "kick"], [28, "clap"],
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
    const clap = renderClap(sampleRate);

    const sampleMap: Record<string, Float32Array> = { kick, snare, clap };

    const results: { name: string; status: string }[] = [];

    for (const loop of loops) {
      try {
        console.log(`[LOOP] Generating: ${loop.name}`);

        let subDurationSec: number;
        if (loop.subsPerBar === 16) {
          subDurationSec = (60 / loop.bpm) / 4;
        } else {
          subDurationSec = (60 / loop.bpm) / 3;
        }

        const subSamples = Math.floor(subDurationSec * sampleRate);
        const totalSubs = loop.subsPerBar * loop.bars;
        const totalSamples = subSamples * totalSubs;
        const durationMs = Math.round((totalSamples / sampleRate) * 1000);

        // Build hit list
        const hitList = loop.hits.map(([sub, type]) => ({
          sample: sampleMap[type] ?? kick,
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
