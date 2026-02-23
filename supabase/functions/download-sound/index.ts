import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) throw new Error("Unauthorized");
    const userId = claimsData.claims.sub as string;

    const { soundId } = await req.json();
    if (!soundId) throw new Error("Sound ID required");

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get sound info
    const { data: sound, error: soundErr } = await serviceClient
      .from("pack_sounds")
      .select("id, name, short_name, file_path, pack_id")
      .eq("id", soundId)
      .single();

    if (soundErr || !sound) throw new Error("Sound not found");

    // Verify user purchased this pack
    const { data: purchase } = await serviceClient
      .from("user_purchases")
      .select("id")
      .eq("user_id", userId)
      .eq("pack_id", sound.pack_id)
      .maybeSingle();

    if (!purchase) throw new Error("Pack not purchased");

    // Stream the file through the edge function instead of returning a signed URL
    if (!sound.file_path) throw new Error("Sound file not available");

    const { data: fileData, error: fileErr } = await serviceClient.storage
      .from("sound-packs")
      .download(sound.file_path);

    if (fileErr || !fileData) throw new Error("Failed to download sound file");

    // Return the audio binary directly with headers that prevent saving
    const arrayBuffer = await fileData.arrayBuffer();

    return new Response(arrayBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Content-Disposition": "inline",
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        "X-Sound-Name": encodeURIComponent(sound.name),
        "X-Sound-Short-Name": encodeURIComponent(sound.short_name),
        "Access-Control-Expose-Headers": "X-Sound-Name, X-Sound-Short-Name",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
