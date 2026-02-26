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
      .in("role", ["admin", "ceo"])
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { suggestion, user_instruction } = await req.json();
    if (!suggestion || !user_instruction?.trim()) {
      return new Response(JSON.stringify({ error: "Instrução vazia" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const systemPrompt = `Você é o assistente de configuração do Glory Pads. O admin está revisando sugestões de auditoria do projeto e escreveu uma instrução personalizada sobre o que quer que seja feito.

Sua tarefa é:
1. Interpretar a instrução do admin no contexto da sugestão
2. Determinar exatamente o que deve ser alterado
3. Retornar um JSON com a ação a ser executada

## Contexto da sugestão:
- Área: ${suggestion.area}
- Título: ${suggestion.title}
- Descrição: ${suggestion.description}
- Valor atual: ${suggestion.current_value || '(não informado)'}
- Valor sugerido pela IA: ${suggestion.suggested_value || '(não informado)'}
- Chave de config: ${suggestion.config_key || '(nenhuma)'}
- Tabela: ${suggestion.config_table || '(nenhuma)'}
- Tipo de ação: ${suggestion.action_type}

## Formato de resposta (JSON):
{
  "understood": true/false,
  "confirmation_message": "Resumo claro do que será feito, em 1-2 frases",
  "action": "update" | "skip",
  "config_key": "chave a atualizar (se aplicável)",
  "config_table": "landing_config | store_config (se aplicável)",
  "new_value": "o novo valor a ser gravado (se aplicável)",
  "details": "Explicação mais detalhada se necessário"
}

Se não entender a instrução ou ela não fizer sentido no contexto, retorne understood=false com uma mensagem pedindo mais clareza.
Responda APENAS com o JSON, sem markdown.`;

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
          { role: "user", content: `Instrução do admin: "${user_instruction}"` },
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
      throw new Error("Erro na interpretação de IA");
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "{}";

    let interpretation;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      interpretation = JSON.parse(cleaned);
    } catch {
      interpretation = {
        understood: false,
        confirmation_message: "Não consegui interpretar a instrução. Tente reformular.",
        action: "skip",
      };
    }

    return new Response(JSON.stringify(interpretation), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("audit-interpret error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
