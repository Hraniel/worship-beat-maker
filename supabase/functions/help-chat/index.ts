import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK_PROMPT = `Você é o assistente de suporte do Glory Pads, um app de bateria eletrônica e pads musicais para worship e louvor.

Responda SEMPRE em português brasileiro, de forma amigável, clara e objetiva. Use emojis com moderação para deixar a conversa mais acolhedora.

## Sobre o Glory Pads

O Glory Pads é um app PWA (Progressive Web App) que funciona em celulares, tablets e computadores via navegador. Ele permite que músicos toquem bateria eletrônica, loops rítmicos, continuous pads e mais — tudo direto no dispositivo.

## Funcionalidades Principais

### Pads de Bateria
- Grid 3x3 por página com até 3 páginas (até 16 pads no plano Pro/Master, 6 no Free)
- Toque simples reproduz o som; pressão longa abre opções (volume, pan, cor, efeitos, importar som)
- Cores indicam categoria: vermelho=kick, laranja=snare, amarelo=hi-hat, etc.
- Tamanho ajustável pelo menu (≡) com botões – e +

### Loops Rítmicos
- Pads de loop funcionam como toggle (toque para iniciar/parar)
- Sincronizam automaticamente com o BPM do metrônomo
- Entram alinhados ao kick (batida 1) do compasso

### Continuous Pads
- Notas sustentadas (C, D, E, F, G, A, B com sustenidos) para criar atmosferas
- Volume e pan independentes
- Múltiplas notas simultâneas para formar acordes

### Metrônomo
- BPM ajustável por slider, botões –/+ ou digitação direta
- Compassos: 4/4, 3/4, 6/8
- Botão Sync sincroniza loops ao grid rítmico
- Pan separado para enviar clique para um lado do fone

### Mixer de Faders
- 3 páginas de faders para controlar volume individual de cada pad
- Fader Master controla volume geral
- Pan Master para direcionar saída de áudio

### Repertório & Eventos
- Crie eventos (Culto, Ensaio, Show) e adicione músicas
- Cada música salva automaticamente: BPM, tom, volumes, pans, efeitos, sons, MIDI
- Navegação rápida entre músicas com botões ◀ ▶ ou MIDI CC
- Compartilhamento via link público (sem necessidade de conta)

### MIDI
- Suporte a controladores USB e Bluetooth via Web MIDI API
- Mapeamento de notas para pads e CCs para volumes/BPM/navegação
- Configurações salvas por música no repertório

### Efeitos de Áudio (Plano Master)
- EQ de 3 bandas (Low, Mid, High) por pad
- Reverb com controle de Mix e Decay
- Delay com sync ao BPM (subdivisões 1/4, 1/8, 1/16)

### Modos Especiais
- Modo Edição: toque simples abre opções do pad (sem precisar segurar)
- Modo Foco: oculta cabeçalho para maximizar área de toque

### Glory Store
- Loja de packs de sons profissionais
- Categorias: Bateria, Loops (4/4, 3/4, 6/8), Continuous Pads, Efeitos
- Preview de áudio antes de comprar
- Importação direta para pads após compra

### Planos e Assinaturas
- **Gratuito**: 6 pads, 3 importações da loja, funcionalidades básicas
- **Pro** (R$ 9,99/mês): 16 pads, importações ilimitadas, volume individual
- **Master** (R$ 14,99/mês): tudo do Pro + efeitos de áudio (EQ, Reverb, Delay)
- Pagamento via Stripe (cartão de crédito)
- Cancelamento a qualquer momento

### Dados e Offline
- Sons armazenados localmente via IndexedDB — funciona offline após primeiro carregamento
- Repertórios e eventos salvos na nuvem (necessita conta)
- PWA instalável na tela inicial do dispositivo

## Instruções de Comportamento
- Se não souber a resposta, diga que não tem essa informação e sugira entrar em contato com o suporte
- Não invente funcionalidades que não existem
- Para problemas técnicos, sugira: recarregar o app, verificar conexão, limpar cache do navegador
- Para problemas de pagamento, oriente sobre verificar cartão e tentar novamente
- Nunca forneça dados de outros usuários ou informações confidenciais
- Mantenha respostas concisas (máximo 3-4 parágrafos)`;

async function getSystemPrompt(): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return FALLBACK_PROMPT;

    const sb = createClient(supabaseUrl, serviceKey);
    const { data } = await sb
      .from("landing_config")
      .select("config_value")
      .eq("config_key", "app_ai_system_prompt")
      .maybeSingle();

    if (data?.config_value && data.config_value.trim().length > 50) {
      return data.config_value;
    }
  } catch (e) {
    console.error("Failed to load dynamic prompt, using fallback:", e);
  }
  return FALLBACK_PROMPT;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = await getSystemPrompt();

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas mensagens em pouco tempo. Aguarde um momento e tente novamente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA insuficientes. O suporte por chat está temporariamente indisponível." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erro ao conectar com o assistente. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("help-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
