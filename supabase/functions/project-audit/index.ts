import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Verify admin
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all project data
    const [
      packsRes, pricingRes, featuresRes, gatesRes,
      landingConfigRes, landingFeaturesRes, storeConfigRes,
    ] = await Promise.all([
      sb.from("store_packs").select("name, category, price_cents, is_available, tag, description").eq("is_available", true),
      sb.from("plan_pricing").select("*").order("price_brl"),
      sb.from("plan_features").select("*").order("sort_order"),
      sb.from("feature_gates").select("*"),
      sb.from("landing_config").select("config_key, config_value"),
      sb.from("landing_features").select("*").eq("enabled", true).order("sort_order"),
      sb.from("store_config").select("config_key, config_value"),
    ]);

    // Build context for AI analysis
    const landingConfig: Record<string, string> = {};
    if (landingConfigRes.data) {
      for (const r of landingConfigRes.data) landingConfig[r.config_key] = r.config_value;
    }
    const storeConfig: Record<string, string> = {};
    if (storeConfigRes.data) {
      for (const r of storeConfigRes.data) storeConfig[r.config_key] = r.config_value;
    }

    const projectData = {
      store_packs: packsRes.data || [],
      plan_pricing: pricingRes.data || [],
      plan_features: featuresRes.data || [],
      feature_gates: gatesRes.data || [],
      landing_config: landingConfig,
      landing_features: landingFeaturesRes.data || [],
      store_config: storeConfig,
      ai_prompt: landingConfig["app_ai_system_prompt"] || "(não configurado)",
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const systemPrompt = `Você é um auditor de projeto especializado no Glory Pads, um app PWA de bateria eletrônica para worship.

Sua tarefa é analisar TODOS os dados do projeto e gerar sugestões de melhoria, correção e sincronização entre as diferentes áreas:
- **Loja (Glory Store)**: packs de sons, categorias, preços
- **Landing Page**: textos, features, configurações visuais
- **Planos e Preços**: planos Free/Pro/Master, features por plano
- **Prompt da IA**: conhecimento do assistente de suporte
- **Configurações do App**: textos, toggles, feature gates

## O que analisar:
1. **Inconsistências**: preços diferentes entre áreas, features mencionadas na landing que não existem nos planos, etc.
2. **Informações desatualizadas**: o prompt da IA menciona preços antigos, a landing não lista packs novos, etc.
3. **Oportunidades de melhoria**: textos que podem ser melhorados, seções vazias, dados faltando
4. **Sincronização**: dados da loja devem refletir na landing e no prompt da IA

## Formato de resposta (JSON array):
Retorne APENAS um JSON array com objetos neste formato:
[
  {
    "area": "landing" | "store" | "plans" | "ai_prompt" | "app_config",
    "severity": "info" | "warning" | "critical",
    "title": "Título curto da sugestão",
    "description": "Descrição detalhada do problema ou oportunidade",
    "current_value": "Valor atual (se aplicável)",
    "suggested_value": "Valor sugerido (se aplicável)",
    "config_key": "Chave da config para atualizar (se aplicável)",
    "config_table": "landing_config | store_config | null",
    "action_type": "update" | "insert" | "review"
  }
]

Gere entre 3 e 15 sugestões, priorizando as mais importantes. Seja específico e prático.
Responda APENAS com o JSON, sem markdown, sem explicações adicionais.`;

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
          { role: "user", content: `Analise os dados do projeto e gere sugestões:\n\n${JSON.stringify(projectData, null, 2)}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Aguarde e tente novamente." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("Erro na análise de IA");
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "[]";

    // Parse AI suggestions
    let suggestions = [];
    try {
      // Remove markdown code fences if present
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      suggestions = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI suggestions:", content);
      suggestions = [{
        area: "app_config",
        severity: "info",
        title: "Análise concluída",
        description: content.slice(0, 500),
        action_type: "review",
      }];
    }

    return new Response(JSON.stringify({ suggestions, raw_data: projectData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("project-audit error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
