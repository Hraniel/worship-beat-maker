import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Sound definitions for each pack
const PACK_DEFINITIONS: Record<
  string,
  {
    name: string;
    description: string;
    category: string;
    icon_name: string;
    color: string;
    tag?: string;
    sounds: {
      name: string;
      short_name: string;
      category: string;
      prompt: string;
      duration: number;
      method: "elevenlabs" | "synth";
      synthParams?: Record<string, number>;
    }[];
  }
> = {
  "worship-essentials": {
    name: "Worship Essentials",
    description:
      "Kicks, snares e hi-hats otimizados para louvor contemporâneo.",
    category: "Drums",
    icon_name: "drum",
    color: "bg-rose-500",
    tag: "Popular",
    sounds: [
      { name: "Worship Kick", short_name: "WKK", category: "drums", prompt: "", duration: 500, method: "synth", synthParams: { freq: 60, decay: 0.5, punch: 0.9 } },
      { name: "Worship Kick Soft", short_name: "WKS", category: "drums", prompt: "", duration: 400, method: "synth", synthParams: { freq: 55, decay: 0.4, punch: 0.5 } },
      { name: "Worship Kick Deep", short_name: "WKD", category: "drums", prompt: "", duration: 600, method: "synth", synthParams: { freq: 50, decay: 0.6, punch: 0.8 } },
      { name: "Worship Snare", short_name: "WSN", category: "drums", prompt: "", duration: 400, method: "synth", synthParams: { freq: 200, noise: 0.7, decay: 0.3 } },
      { name: "Worship Snare Rim", short_name: "WSR", category: "drums", prompt: "", duration: 300, method: "synth", synthParams: { freq: 400, noise: 0.3, decay: 0.15 } },
      { name: "Worship Snare Fat", short_name: "WSF", category: "drums", prompt: "", duration: 500, method: "synth", synthParams: { freq: 180, noise: 0.8, decay: 0.4 } },
      { name: "Hi-Hat Tight", short_name: "HHT", category: "drums", prompt: "", duration: 100, method: "synth", synthParams: { freq: 6000, noise: 1, decay: 0.05 } },
      { name: "Hi-Hat Loose", short_name: "HHL", category: "drums", prompt: "", duration: 250, method: "synth", synthParams: { freq: 5000, noise: 1, decay: 0.15 } },
      { name: "Hi-Hat Open Bright", short_name: "HHB", category: "drums", prompt: "", duration: 500, method: "synth", synthParams: { freq: 7000, noise: 1, decay: 0.4 } },
      { name: "Worship Clap", short_name: "WCP", category: "percussion", prompt: "", duration: 300, method: "synth", synthParams: { freq: 1200, noise: 0.9, decay: 0.2 } },
      { name: "Worship Tom", short_name: "WTM", category: "drums", prompt: "", duration: 500, method: "synth", synthParams: { freq: 120, decay: 0.4, punch: 0.6 } },
      { name: "Worship Crash", short_name: "WCR", category: "drums", prompt: "", duration: 1500, method: "synth", synthParams: { freq: 4000, noise: 1, decay: 1.2 } },
    ],
  },
  "ambient-textures": {
    name: "Ambient Textures",
    description: "Pads atmosféricos e texturas para momentos de oração.",
    category: "Continuous Pads",
    icon_name: "waves",
    color: "bg-sky-500",
    sounds: [
      { name: "Warm Prayer Pad", short_name: "WPP", category: "pads", prompt: "Warm ethereal worship pad, soft ambient synthesizer texture, C major chord, reverb-heavy, peaceful church atmosphere", duration: 5, method: "elevenlabs" },
      { name: "Heavenly Strings", short_name: "HST", category: "pads", prompt: "Soft ambient string ensemble pad, heavenly choir-like texture, sustained C note, worship atmosphere, very reverberant", duration: 5, method: "elevenlabs" },
      { name: "Spirit Breath", short_name: "SBR", category: "pads", prompt: "Gentle breathy ambient pad, soft wind-like worship texture, ethereal and peaceful, sustained tone", duration: 5, method: "elevenlabs" },
      { name: "Deep Worship", short_name: "DWP", category: "pads", prompt: "Deep low ambient pad, sub-bass worship drone, warm and enveloping, church organ undertone", duration: 5, method: "elevenlabs" },
      { name: "Crystal Air", short_name: "CRA", category: "pads", prompt: "Crystalline high-frequency ambient pad, shimmering worship texture, bell-like overtones, peaceful", duration: 5, method: "elevenlabs" },
      { name: "Golden Hour", short_name: "GHR", category: "pads", prompt: "Warm golden ambient pad, sunset worship atmosphere, analog synthesizer texture, gentle and rich", duration: 5, method: "elevenlabs" },
      { name: "Still Waters", short_name: "STW", category: "pads", prompt: "Calm flowing ambient pad, water-like gentle worship texture, serene and meditative, soft reverb", duration: 5, method: "elevenlabs" },
      { name: "Sacred Space", short_name: "SCS", category: "pads", prompt: "Cathedral-like ambient pad, reverberant sacred space worship texture, organ-like sustained tone, majestic", duration: 5, method: "elevenlabs" },
    ],
  },
  "gospel-grooves": {
    name: "Gospel Grooves",
    description: "Loops e grooves com influência gospel e R&B.",
    category: "Loops",
    icon_name: "music",
    color: "bg-emerald-500",
    sounds: [
      { name: "Gospel Kick", short_name: "GKK", category: "drums", prompt: "", duration: 500, method: "synth", synthParams: { freq: 65, decay: 0.45, punch: 0.85 } },
      { name: "Gospel Snare", short_name: "GSN", category: "drums", prompt: "", duration: 350, method: "synth", synthParams: { freq: 220, noise: 0.75, decay: 0.25 } },
      { name: "Gospel Hi-Hat", short_name: "GHH", category: "drums", prompt: "", duration: 120, method: "synth", synthParams: { freq: 8000, noise: 1, decay: 0.06 } },
      { name: "Gospel Clap", short_name: "GCP", category: "percussion", prompt: "", duration: 250, method: "synth", synthParams: { freq: 1500, noise: 0.85, decay: 0.18 } },
      { name: "Gospel Shaker", short_name: "GSH", category: "percussion", prompt: "", duration: 150, method: "synth", synthParams: { freq: 9000, noise: 1, decay: 0.08 } },
      { name: "Gospel Snap", short_name: "GSP", category: "percussion", prompt: "", duration: 200, method: "synth", synthParams: { freq: 2500, noise: 0.6, decay: 0.1 } },
      { name: "Gospel Tom Low", short_name: "GTL", category: "drums", prompt: "", duration: 500, method: "synth", synthParams: { freq: 90, decay: 0.5, punch: 0.7 } },
      { name: "Gospel Tom High", short_name: "GTH", category: "drums", prompt: "", duration: 400, method: "synth", synthParams: { freq: 150, decay: 0.35, punch: 0.65 } },
      { name: "Gospel Ride", short_name: "GRD", category: "drums", prompt: "", duration: 800, method: "synth", synthParams: { freq: 5500, noise: 0.9, decay: 0.6 } },
      { name: "Gospel Cowbell", short_name: "GCB", category: "percussion", prompt: "", duration: 300, method: "synth", synthParams: { freq: 800, noise: 0.2, decay: 0.15 } },
    ],
  },
  "electronic-worship": {
    name: "Electronic Worship",
    description: "Sons eletrônicos modernos para cultos contemporâneos.",
    category: "Effects",
    icon_name: "sparkles",
    color: "bg-violet-500",
    tag: "Novo",
    sounds: [
      { name: "Synth Riser", short_name: "SRS", category: "effects", prompt: "Electronic synth riser, building tension, worship transition effect, ascending pitch sweep", duration: 4, method: "elevenlabs" },
      { name: "Reverse Swell", short_name: "RVS", category: "effects", prompt: "Reverse cymbal swell, electronic worship transition, building ambient crescendo", duration: 3, method: "elevenlabs" },
      { name: "Digital Drop", short_name: "DDP", category: "effects", prompt: "Electronic bass drop impact, deep sub hit, worship transition downbeat effect", duration: 2, method: "elevenlabs" },
      { name: "Glitch Texture", short_name: "GLT", category: "effects", prompt: "Subtle glitch electronic texture, digital worship ambient, chopped and stuttered", duration: 3, method: "elevenlabs" },
      { name: "Neon Pad", short_name: "NPN", category: "pads", prompt: "Bright neon synthesizer pad, modern electronic worship, vibrant and warm sustained tone", duration: 5, method: "elevenlabs" },
      { name: "Tape Stop", short_name: "TSP", category: "effects", prompt: "Tape stop effect, slowing down pitch bend, electronic worship transition", duration: 2, method: "elevenlabs" },
      { name: "White Noise Sweep", short_name: "WNS", category: "effects", prompt: "White noise filter sweep, electronic worship transition, rising filtered noise", duration: 3, method: "elevenlabs" },
      { name: "Sub Impact", short_name: "SBI", category: "effects", prompt: "Deep sub bass impact hit, electronic worship downbeat, powerful low frequency boom", duration: 2, method: "elevenlabs" },
      { name: "E-Kick 808", short_name: "E8K", category: "drums", prompt: "", duration: 600, method: "synth", synthParams: { freq: 45, decay: 0.7, punch: 1 } },
      { name: "E-Snare Clap", short_name: "ESC", category: "drums", prompt: "", duration: 350, method: "synth", synthParams: { freq: 250, noise: 0.85, decay: 0.25 } },
      { name: "E-Hat Crisp", short_name: "EHC", category: "drums", prompt: "", duration: 80, method: "synth", synthParams: { freq: 10000, noise: 1, decay: 0.04 } },
      { name: "E-Perc Click", short_name: "EPC", category: "percussion", prompt: "", duration: 50, method: "synth", synthParams: { freq: 3000, noise: 0.4, decay: 0.02 } },
      { name: "Shimmer Hit", short_name: "SMH", category: "effects", prompt: "Shimmering metallic hit, bright worship accent, bell-like electronic impact with long reverb tail", duration: 3, method: "elevenlabs" },
      { name: "Vocal Chop", short_name: "VCH", category: "effects", prompt: "Short vocal chop, ethereal breathy voice snippet, worship electronic texture, single syllable", duration: 1, method: "elevenlabs" },
    ],
  },
  "acoustic-kit": {
    name: "Acoustic Kit",
    description: "Bateria acústica gravada em estúdio profissional.",
    category: "Drums",
    icon_name: "audio-waveform",
    color: "bg-orange-500",
    sounds: [
      { name: "Studio Kick", short_name: "SKK", category: "drums", prompt: "", duration: 500, method: "synth", synthParams: { freq: 58, decay: 0.5, punch: 0.75 } },
      { name: "Studio Kick Tight", short_name: "SKT", category: "drums", prompt: "", duration: 350, method: "synth", synthParams: { freq: 62, decay: 0.3, punch: 0.9 } },
      { name: "Studio Snare Center", short_name: "SSC", category: "drums", prompt: "", duration: 400, method: "synth", synthParams: { freq: 190, noise: 0.65, decay: 0.3 } },
      { name: "Studio Snare Brush", short_name: "SSB", category: "drums", prompt: "", duration: 350, method: "synth", synthParams: { freq: 300, noise: 0.5, decay: 0.2 } },
      { name: "Studio Hat Closed", short_name: "SHC", category: "drums", prompt: "", duration: 80, method: "synth", synthParams: { freq: 6500, noise: 1, decay: 0.04 } },
      { name: "Studio Hat Open", short_name: "SHO", category: "drums", prompt: "", duration: 400, method: "synth", synthParams: { freq: 5500, noise: 1, decay: 0.3 } },
      { name: "Studio Ride Bell", short_name: "SRB", category: "drums", prompt: "", duration: 900, method: "synth", synthParams: { freq: 3000, noise: 0.3, decay: 0.7 } },
      { name: "Studio Ride Edge", short_name: "SRE", category: "drums", prompt: "", duration: 1200, method: "synth", synthParams: { freq: 4500, noise: 0.8, decay: 0.9 } },
      { name: "Studio Crash", short_name: "SCR", category: "drums", prompt: "", duration: 2000, method: "synth", synthParams: { freq: 4000, noise: 1, decay: 1.5 } },
      { name: "Studio Tom Hi", short_name: "STH", category: "drums", prompt: "", duration: 400, method: "synth", synthParams: { freq: 200, decay: 0.3, punch: 0.6 } },
      { name: "Studio Tom Mid", short_name: "STM", category: "drums", prompt: "", duration: 450, method: "synth", synthParams: { freq: 140, decay: 0.35, punch: 0.6 } },
      { name: "Studio Tom Low", short_name: "STL", category: "drums", prompt: "", duration: 550, method: "synth", synthParams: { freq: 90, decay: 0.45, punch: 0.6 } },
      { name: "Studio Cross Stick", short_name: "SXS", category: "drums", prompt: "", duration: 150, method: "synth", synthParams: { freq: 800, noise: 0.3, decay: 0.08 } },
      { name: "Studio Ghost Note", short_name: "SGN", category: "drums", prompt: "", duration: 200, method: "synth", synthParams: { freq: 200, noise: 0.4, decay: 0.1 } },
      { name: "Studio Splash", short_name: "SSP", category: "drums", prompt: "", duration: 600, method: "synth", synthParams: { freq: 6000, noise: 1, decay: 0.4 } },
      { name: "Studio China", short_name: "SCH", category: "drums", prompt: "", duration: 800, method: "synth", synthParams: { freq: 3500, noise: 0.9, decay: 0.6 } },
    ],
  },
  "cinematic-risers": {
    name: "Cinematic Risers",
    description: "Risers e transições cinematográficas para momentos épicos.",
    category: "Effects",
    icon_name: "volume-2",
    color: "bg-pink-500",
    sounds: [
      { name: "Epic Riser", short_name: "EPR", category: "effects", prompt: "Epic cinematic riser, building orchestral tension, worship crescendo transition, dramatic ascending sweep", duration: 5, method: "elevenlabs" },
      { name: "Tension Build", short_name: "TNB", category: "effects", prompt: "Slow tension building riser, suspenseful cinematic texture, worship anticipation effect", duration: 5, method: "elevenlabs" },
      { name: "Brass Swell", short_name: "BRS", category: "effects", prompt: "Cinematic brass swell, epic orchestral crescendo, worship transition, majestic and powerful", duration: 4, method: "elevenlabs" },
      { name: "Impact Boom", short_name: "IMB", category: "effects", prompt: "Deep cinematic boom impact, massive sub hit with debris, epic worship downbeat moment", duration: 3, method: "elevenlabs" },
      { name: "Whoosh Down", short_name: "WHD", category: "effects", prompt: "Cinematic whoosh downward sweep, fast transition effect, worship moment transition", duration: 2, method: "elevenlabs" },
      { name: "Shimmer Rise", short_name: "SMR", category: "effects", prompt: "Shimmering ascending cinematic riser, bright metallic texture, worship anticipation build", duration: 4, method: "elevenlabs" },
    ],
  },
  "keys-pads": {
    name: "Keys & Pads",
    description: "Sons de teclado e sintetizador para camadas harmônicas.",
    category: "Continuous Pads",
    icon_name: "headphones",
    color: "bg-teal-500",
    sounds: [
      { name: "Rhodes Warm", short_name: "RHW", category: "pads", prompt: "Warm Rhodes electric piano pad, sustained chord, worship harmony layer, vintage and mellow", duration: 5, method: "elevenlabs" },
      { name: "Organ Sustain", short_name: "OGS", category: "pads", prompt: "Church organ sustained pad, full and rich worship harmony, cathedral reverb, majestic tone", duration: 5, method: "elevenlabs" },
      { name: "Synth Choir", short_name: "SYC", category: "pads", prompt: "Synthesizer choir pad, angelic vocal texture, worship harmony layer, ethereal and heavenly", duration: 5, method: "elevenlabs" },
      { name: "Analog Warmth", short_name: "ANW", category: "pads", prompt: "Warm analog synthesizer pad, rich detuned oscillators, worship ambient layer, thick and lush", duration: 5, method: "elevenlabs" },
      { name: "Piano Texture", short_name: "PNT", category: "pads", prompt: "Soft piano ambient texture, reversed and stretched piano notes, worship contemplative layer", duration: 5, method: "elevenlabs" },
      { name: "Pad Octave", short_name: "PDO", category: "pads", prompt: "Wide octave synthesizer pad, full frequency worship layer, deep bass and shimmering highs", duration: 5, method: "elevenlabs" },
      { name: "Electric Swell", short_name: "ELS", category: "pads", prompt: "Electric guitar ambient swell, volume-swelled worship pad, clean tone with heavy reverb", duration: 5, method: "elevenlabs" },
      { name: "Bell Pad", short_name: "BLP", category: "pads", prompt: "Bell-like synthesizer pad, glass-like worship ambient texture, sparkling and delicate overtones", duration: 5, method: "elevenlabs" },
      { name: "Mellotron Flute", short_name: "MLF", category: "pads", prompt: "Mellotron flute pad, vintage worship texture, breathy and warm sustained flute tone, lo-fi charm", duration: 5, method: "elevenlabs" },
      { name: "Pad Fifth", short_name: "PD5", category: "pads", prompt: "Perfect fifth interval synthesizer pad, wide worship harmony, rich and uplifting sustained tone", duration: 5, method: "elevenlabs" },
    ],
  },
  "latin-percussion": {
    name: "Latin Percussion",
    description: "Percussão latina: congas, bongôs, shakers e mais.",
    category: "Percussion",
    icon_name: "layers",
    color: "bg-amber-600",
    sounds: [
      { name: "Conga Open", short_name: "CGO", category: "percussion", prompt: "", duration: 400, method: "synth", synthParams: { freq: 200, decay: 0.35, punch: 0.5 } },
      { name: "Conga Slap", short_name: "CGS", category: "percussion", prompt: "", duration: 200, method: "synth", synthParams: { freq: 350, noise: 0.4, decay: 0.12 } },
      { name: "Conga Mute", short_name: "CGM", category: "percussion", prompt: "", duration: 100, method: "synth", synthParams: { freq: 250, noise: 0.2, decay: 0.05 } },
      { name: "Bongo Hi", short_name: "BGH", category: "percussion", prompt: "", duration: 200, method: "synth", synthParams: { freq: 400, decay: 0.15, punch: 0.4 } },
      { name: "Bongo Lo", short_name: "BGL", category: "percussion", prompt: "", duration: 250, method: "synth", synthParams: { freq: 280, decay: 0.2, punch: 0.4 } },
      { name: "Cabasa", short_name: "CBS", category: "percussion", prompt: "", duration: 150, method: "synth", synthParams: { freq: 7000, noise: 1, decay: 0.1 } },
      { name: "Guiro", short_name: "GRO", category: "percussion", prompt: "", duration: 300, method: "synth", synthParams: { freq: 5000, noise: 0.8, decay: 0.2 } },
      { name: "Tambourine", short_name: "TMB", category: "percussion", prompt: "", duration: 250, method: "synth", synthParams: { freq: 8000, noise: 1, decay: 0.15 } },
      { name: "Woodblock Hi", short_name: "WBH", category: "percussion", prompt: "", duration: 100, method: "synth", synthParams: { freq: 1200, noise: 0.1, decay: 0.05 } },
      { name: "Woodblock Lo", short_name: "WBL", category: "percussion", prompt: "", duration: 120, method: "synth", synthParams: { freq: 600, noise: 0.1, decay: 0.06 } },
      { name: "Agogo", short_name: "AGG", category: "percussion", prompt: "", duration: 350, method: "synth", synthParams: { freq: 900, noise: 0.15, decay: 0.25 } },
      { name: "Timbale", short_name: "TBL", category: "percussion", prompt: "", duration: 300, method: "synth", synthParams: { freq: 300, noise: 0.5, decay: 0.2 } },
    ],
  },
};

// Web Audio synthesis for drums/percussion (generates WAV buffer)
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
    
    // Tonal component
    const punchFreq = punch > 0 ? freq * (1 + punch * 4 * Math.exp(-t * 40)) : freq;
    let sample = Math.sin(2 * Math.PI * punchFreq * t) * env * (1 - noise);

    // Noise component
    if (noise > 0) {
      sample += (Math.random() * 2 - 1) * env * noise;
    }

    // Soft clip
    sample = Math.tanh(sample * 1.5);
    buffer[i] = sample;
  }

  // Convert to 16-bit PCM WAV
  const wavBuffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(wavBuffer);

  // WAV header
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

// Generate a short preview (1.5s fade) from full audio
function createPreview(fullBuffer: ArrayBuffer, isWav: boolean): ArrayBuffer {
  if (!isWav) {
    // For MP3 from ElevenLabs, return as-is (already short ~1-5s)
    // In production you'd trim, but ElevenLabs sounds are already short
    return fullBuffer;
  }

  // For WAV, apply quick fade
  const view = new DataView(fullBuffer.slice(0));
  const dataOffset = 44;
  const numSamples = (fullBuffer.byteLength - dataOffset) / 2;
  const fadeStart = Math.floor(numSamples * 0.6);

  for (let i = fadeStart; i < numSamples; i++) {
    const fadeProgress = (i - fadeStart) / (numSamples - fadeStart);
    const fadeMultiplier = 1 - fadeProgress;
    const sample = view.getInt16(dataOffset + i * 2, true);
    view.setInt16(dataOffset + i * 2, Math.floor(sample * fadeMultiplier), true);
  }

  return view.buffer;
}

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

    const { packId } = await req.json();
    if (!packId || !PACK_DEFINITIONS[packId]) {
      throw new Error(`Invalid pack ID: ${packId}`);
    }

    const packDef = PACK_DEFINITIONS[packId];
    console.log(`[GENERATE] Starting pack: ${packDef.name} (${packDef.sounds.length} sounds)`);

    // Create/update pack in database
    const { data: packRow, error: packErr } = await supabase
      .from("store_packs")
      .upsert(
        {
          id: undefined,
          name: packDef.name,
          description: packDef.description,
          category: packDef.category,
          icon_name: packDef.icon_name,
          color: packDef.color,
          tag: packDef.tag || null,
          is_available: true,
          price_cents: 0,
        },
        { onConflict: "name" }
      )
      .select("id")
      .single();

    // If upsert fails because no unique constraint on name, insert
    let finalPackId: string;
    if (packErr) {
      // Check if exists
      const { data: existing } = await supabase
        .from("store_packs")
        .select("id")
        .eq("name", packDef.name)
        .single();

      if (existing) {
        finalPackId = existing.id;
        await supabase
          .from("store_packs")
          .update({ is_available: true, description: packDef.description, tag: packDef.tag })
          .eq("id", finalPackId);
      } else {
        const { data: newPack, error: insertErr } = await supabase
          .from("store_packs")
          .insert({
            name: packDef.name,
            description: packDef.description,
            category: packDef.category,
            icon_name: packDef.icon_name,
            color: packDef.color,
            tag: packDef.tag || null,
            is_available: true,
            price_cents: 0,
          })
          .select("id")
          .single();
        if (insertErr) throw insertErr;
        finalPackId = newPack!.id;
      }
    } else {
      finalPackId = packRow!.id;
    }

    console.log(`[GENERATE] Pack DB ID: ${finalPackId}`);

    const results: { name: string; status: string }[] = [];

    for (let i = 0; i < packDef.sounds.length; i++) {
      const sound = packDef.sounds[i];
      console.log(`[GENERATE] Processing ${i + 1}/${packDef.sounds.length}: ${sound.name} (${sound.method})`);

      try {
        let audioBuffer: ArrayBuffer;
        let contentType: string;
        let ext: string;

        if (sound.method === "elevenlabs") {
          // Generate via ElevenLabs Sound Effects API
          const elResponse = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
            method: "POST",
            headers: {
              "xi-api-key": ELEVENLABS_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: sound.prompt,
              duration_seconds: sound.duration,
              prompt_influence: 0.4,
            }),
          });

          if (!elResponse.ok) {
            const errText = await elResponse.text();
            throw new Error(`ElevenLabs error ${elResponse.status}: ${errText}`);
          }

          audioBuffer = await elResponse.arrayBuffer();
          contentType = "audio/mpeg";
          ext = "mp3";
        } else {
          // Synthesize via Web Audio math
          audioBuffer = synthesizeDrumSound(sound.synthParams || {}, sound.duration);
          contentType = "audio/wav";
          ext = "wav";
        }

        // Upload full sound
        const fullPath = `${finalPackId}/${sound.short_name}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("sound-packs")
          .upload(fullPath, audioBuffer, {
            contentType,
            upsert: true,
          });
        if (uploadErr) throw uploadErr;

        // Upload preview
        const previewBuffer = createPreview(audioBuffer, ext === "wav");
        const previewPath = `${finalPackId}/${sound.short_name}_preview.${ext}`;
        const { error: previewErr } = await supabase.storage
          .from("sound-previews")
          .upload(previewPath, previewBuffer, {
            contentType,
            upsert: true,
          });
        if (previewErr) throw previewErr;

        // Save sound metadata
        const { error: soundErr } = await supabase.from("pack_sounds").upsert(
          {
            pack_id: finalPackId,
            name: sound.name,
            short_name: sound.short_name,
            category: sound.category,
            file_path: fullPath,
            preview_path: previewPath,
            duration_ms: sound.method === "elevenlabs" ? sound.duration * 1000 : sound.duration,
            sort_order: i,
          },
          { onConflict: "pack_id,short_name", ignoreDuplicates: false }
        );
        // If upsert fails, try insert
        if (soundErr) {
          await supabase.from("pack_sounds").insert({
            pack_id: finalPackId,
            name: sound.name,
            short_name: sound.short_name,
            category: sound.category,
            file_path: fullPath,
            preview_path: previewPath,
            duration_ms: sound.method === "elevenlabs" ? sound.duration * 1000 : sound.duration,
            sort_order: i,
          });
        }

        results.push({ name: sound.name, status: "ok" });
        console.log(`[GENERATE] ✓ ${sound.name}`);
      } catch (soundError) {
        const msg = soundError instanceof Error ? soundError.message : String(soundError);
        results.push({ name: sound.name, status: `error: ${msg}` });
        console.error(`[GENERATE] ✗ ${sound.name}: ${msg}`);
      }
    }

    const successCount = results.filter((r) => r.status === "ok").length;
    console.log(`[GENERATE] Done: ${successCount}/${packDef.sounds.length} sounds generated`);

    return new Response(
      JSON.stringify({
        pack_id: finalPackId,
        pack_name: packDef.name,
        total: packDef.sounds.length,
        success: successCount,
        results,
      }),
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
