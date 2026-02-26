import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  es: "Spanish (Español)",
  "pt-PT": "European Portuguese (Português de Portugal)",
  "pt-BR": "Brazilian Portuguese (Português do Brasil)",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check — admin only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Check admin role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isAdmin = roles?.some(
      (r: any) => r.role === "admin" || r.role === "ceo"
    );
    if (!isAdmin) throw new Error("Forbidden");

    const { keys, targetLocale, sourceLocale = "pt-BR" } = await req.json();

    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      throw new Error("No keys provided");
    }
    if (!targetLocale) throw new Error("No target locale");

    const targetLabel = LOCALE_LABELS[targetLocale] || targetLocale;
    const sourceLabel = LOCALE_LABELS[sourceLocale] || sourceLocale;

    // Build prompt with all keys to translate in a single call
    const keyList = keys
      .map((k: { key: string; value: string }) => `"${k.key}": "${k.value}"`)
      .join("\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a professional translator for a worship music app called "Glory Pads". Translate UI strings from ${sourceLabel} to ${targetLabel}. Keep the translations natural, concise and appropriate for a music/worship context. Keep brand names like "Glory Pads", "Glory Store" unchanged. Keep technical terms like "BPM", "MIDI", "PWA", "Stereo", "Mono" unchanged. Preserve any interpolation variables like {{count}}, {{days}} etc.`,
            },
            {
              role: "user",
              content: `Translate these UI strings to ${targetLabel}. Return ONLY a valid JSON object with the same keys and translated values. No explanation, no markdown, just the JSON object.\n\n${keyList}`,
            },
          ],
          temperature: 0.3,
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI gateway error: " + aiResponse.status);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response (may have markdown code fences or extra text)
    let translations: Record<string, string>;
    try {
      // Strip markdown fences
      let cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      // Try direct parse first
      translations = JSON.parse(cleaned);
    } catch {
      // Fallback: extract the first JSON object from the response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found");
        translations = JSON.parse(jsonMatch[0]);
      } catch {
        console.error("AI response content:", content.substring(0, 500));
        throw new Error("Failed to parse AI translation response");
      }
    }

    // Save translations as overrides
    const upserts = Object.entries(translations).map(([key, value]) => ({
      locale: targetLocale,
      key_path: key,
      value: String(value),
      updated_at: new Date().toISOString(),
    }));

    if (upserts.length > 0) {
      const { error: upsertError } = await supabase
        .from("translation_overrides")
        .upsert(upserts, { onConflict: "locale,key_path" });
      if (upsertError) throw upsertError;
    }

    return new Response(
      JSON.stringify({
        translated: Object.keys(translations).length,
        translations,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("auto-translate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: e instanceof Error && e.message === "Unauthorized" ? 401 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
