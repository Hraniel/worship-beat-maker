import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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

    const { packId } = await req.json();
    if (!packId) throw new Error("Pack ID required");

    // Check pack exists and is available
    const { data: pack, error: packErr } = await supabase
      .from("store_packs")
      .select("id, name, price_cents, is_available")
      .eq("id", packId)
      .single();

    if (packErr || !pack) throw new Error("Pack not found");
    if (!pack.is_available) throw new Error("Pack not available");

    // For now, all packs are free (price_cents = 0)
    // Future: integrate Stripe payment here for paid packs

    // Record purchase
    const { error: purchaseErr } = await supabase
      .from("user_purchases")
      .insert({ user_id: userId, pack_id: packId });

    if (purchaseErr) {
      if (purchaseErr.code === "23505") {
        // Already purchased
        return new Response(
          JSON.stringify({ success: true, message: "Already purchased" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw purchaseErr;
    }

    // Get sound file paths for download
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: sounds } = await serviceClient
      .from("pack_sounds")
      .select("name, short_name, file_path, duration_ms")
      .eq("pack_id", packId)
      .order("sort_order");

    // Generate signed URLs for each sound
    const downloadUrls: Record<string, string> = {};
    if (sounds) {
      for (const sound of sounds) {
        if (sound.file_path) {
          const { data: urlData } = await serviceClient.storage
            .from("sound-packs")
            .createSignedUrl(sound.file_path, 3600); // 1 hour expiry
          if (urlData?.signedUrl) {
            downloadUrls[sound.short_name] = urlData.signedUrl;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        pack_name: pack.name,
        sounds: sounds || [],
        download_urls: downloadUrls,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
