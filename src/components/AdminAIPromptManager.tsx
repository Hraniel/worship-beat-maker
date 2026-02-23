import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Save, Eye, EyeOff, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

interface SyncSuggestion {
  section: string;
  currentSnippet: string;
  suggestedSnippet: string;
  reason: string;
  accepted: boolean;
}

const SECTION_KEYS = [
  { key: 'ai_prompt_base', label: '📋 Base (tom, idioma, identidade)', placeholder: 'Instruções gerais do assistente...' },
  { key: 'ai_prompt_features', label: '🎛️ Funcionalidades do App', placeholder: 'Pads, loops, MIDI, metrônomo, mixer...' },
  { key: 'ai_prompt_store', label: '🛒 Glory Store', placeholder: 'Packs disponíveis, categorias, preços...' },
  { key: 'ai_prompt_plans', label: '💳 Planos e Preços', placeholder: 'Free, Pro, Master com limites e preços...' },
  { key: 'ai_prompt_rules', label: '⚠️ Regras de Comportamento', placeholder: 'O que a IA deve e não deve fazer...' },
];

const DEFAULT_SECTIONS: Record<string, string> = {
  ai_prompt_base: `Você é o assistente de suporte do Glory Pads, um app de bateria eletrônica e pads musicais para worship e louvor.

Responda SEMPRE em português brasileiro, de forma amigável, clara e objetiva. Use emojis com moderação para deixar a conversa mais acolhedora.

O Glory Pads é um app PWA (Progressive Web App) que funciona em celulares, tablets e computadores via navegador. Ele permite que músicos toquem bateria eletrônica, loops rítmicos, continuous pads e mais — tudo direto no dispositivo.`,

  ai_prompt_features: `## Funcionalidades Principais

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
- Modo Foco: oculta cabeçalho para maximizar área de toque`,

  ai_prompt_store: `### Glory Store
- Loja de packs de sons profissionais
- Categorias: Bateria, Loops (4/4, 3/4, 6/8), Continuous Pads, Efeitos
- Preview de áudio antes de comprar
- Importação direta para pads após compra`,

  ai_prompt_plans: `### Planos e Assinaturas
- **Gratuito**: 6 pads, 3 importações da loja, funcionalidades básicas
- **Pro** (R$ 9,99/mês): 16 pads, importações ilimitadas, volume individual
- **Master** (R$ 14,99/mês): tudo do Pro + efeitos de áudio (EQ, Reverb, Delay)
- Pagamento via Stripe (cartão de crédito)
- Cancelamento a qualquer momento

### Dados e Offline
- Sons armazenados localmente via IndexedDB — funciona offline após primeiro carregamento
- Repertórios e eventos salvos na nuvem (necessita conta)
- PWA instalável na tela inicial do dispositivo`,

  ai_prompt_rules: `## Instruções de Comportamento
- Se não souber a resposta, diga que não tem essa informação e sugira entrar em contato com o suporte
- Não invente funcionalidades que não existem
- Para problemas técnicos, sugira: recarregar o app, verificar conexão, limpar cache do navegador
- Para problemas de pagamento, oriente sobre verificar cartão e tentar novamente
- Nunca forneça dados de outros usuários ou informações confidenciais
- Mantenha respostas concisas (máximo 3-4 parágrafos)`,
};

export default function AdminAIPromptManager() {
  const [sections, setSections] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [suggestions, setSuggestions] = useState<SyncSuggestion[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);

  // Load sections from DB
  const loadSections = useCallback(async () => {
    setLoading(true);
    try {
      const keys = SECTION_KEYS.map(s => s.key);
      const { data } = await supabase
        .from('landing_config')
        .select('config_key, config_value, updated_at')
        .in('config_key', [...keys, 'ai_prompt_last_sync']);

      const loaded: Record<string, string> = {};
      let syncDate: string | null = null;
      if (data) {
        for (const row of data) {
          if (row.config_key === 'ai_prompt_last_sync') {
            syncDate = row.config_value;
          } else {
            loaded[row.config_key] = row.config_value;
          }
        }
      }
      // Fill defaults for missing sections
      for (const sk of SECTION_KEYS) {
        if (!loaded[sk.key]) loaded[sk.key] = DEFAULT_SECTIONS[sk.key] || '';
      }
      setSections(loaded);
      setLastSyncDate(syncDate);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar prompt da IA');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSections(); }, [loadSections]);

  // Save all sections
  const saveAll = async () => {
    setSaving(true);
    try {
      // Also build and save the combined prompt
      const combined = SECTION_KEYS.map(sk => sections[sk.key] || '').join('\n\n');
      const allEntries = [
        ...SECTION_KEYS.map(sk => ({ config_key: sk.key, config_value: sections[sk.key] || '' })),
        { config_key: 'app_ai_system_prompt', config_value: combined },
      ];
      for (const entry of allEntries) {
        await supabase.from('landing_config').upsert(
          { config_key: entry.config_key, config_value: entry.config_value, updated_at: new Date().toISOString() },
          { onConflict: 'config_key' }
        );
      }
      toast.success('Prompt da IA salvo com sucesso!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  // Auto-sync: read all data from DB and generate suggestions
  const runSync = async () => {
    setSyncing(true);
    setSuggestions([]);
    try {
      // Fetch all relevant data
      const [packsRes, pricingRes, featuresRes, gatesRes] = await Promise.all([
        supabase.from('store_packs').select('name, category, price_cents, is_available, tag, description').eq('is_available', true),
        supabase.from('plan_pricing').select('*').order('price_brl'),
        supabase.from('plan_features').select('*').order('tier, sort_order' as any),
        supabase.from('feature_gates').select('*'),
      ]);

      const newSuggestions: SyncSuggestion[] = [];

      // --- Store section ---
      if (packsRes.data && packsRes.data.length > 0) {
        const packLines = packsRes.data.map(p => {
          const price = p.price_cents > 0 ? `R$ ${(p.price_cents / 100).toFixed(2).replace('.', ',')}` : 'Grátis';
          return `- **${p.name}** (${p.category}) — ${price}${p.tag ? ` [${p.tag}]` : ''}`;
        }).join('\n');

        const categories = [...new Set(packsRes.data.map(p => p.category))].join(', ');

        const newStoreSection = `### Glory Store
- Loja de packs de sons profissionais
- Categorias disponíveis: ${categories}
- Preview de áudio antes de comprar
- Importação direta para pads após compra

#### Packs Disponíveis Atualmente
${packLines}`;

        if (newStoreSection.trim() !== (sections.ai_prompt_store || '').trim()) {
          newSuggestions.push({
            section: 'ai_prompt_store',
            currentSnippet: (sections.ai_prompt_store || '').slice(0, 200),
            suggestedSnippet: newStoreSection,
            reason: `${packsRes.data.length} pack(s) encontrado(s) na loja. Atualizando lista de packs, categorias e preços.`,
            accepted: true,
          });
        }
      }

      // --- Plans section ---
      if (pricingRes.data && pricingRes.data.length > 0) {
        const planLines = pricingRes.data.map(p => {
          const price = Number(p.price_brl) > 0 ? `R$ ${Number(p.price_brl).toFixed(2).replace('.', ',')}${p.period}` : 'Grátis';
          return `- **${p.name}** (${price}): ${p.max_pads} pads, ${p.max_imports >= 999 ? 'importações ilimitadas' : `${p.max_imports} importações`}`;
        }).join('\n');

        // Get features per tier
        const featuresByTier: Record<string, string[]> = {};
        if (featuresRes.data) {
          for (const f of featuresRes.data) {
            if (f.enabled) {
              if (!featuresByTier[f.tier]) featuresByTier[f.tier] = [];
              featuresByTier[f.tier].push(f.feature_label);
            }
          }
        }
        const featureLines = Object.entries(featuresByTier).map(([tier, feats]) =>
          `- ${tier}: ${feats.join(', ')}`
        ).join('\n');

        const newPlansSection = `### Planos e Assinaturas
${planLines}
- Pagamento via Stripe (cartão de crédito)
- Cancelamento a qualquer momento

#### Recursos por Plano
${featureLines}

### Dados e Offline
- Sons armazenados localmente via IndexedDB — funciona offline após primeiro carregamento
- Repertórios e eventos salvos na nuvem (necessita conta)
- PWA instalável na tela inicial do dispositivo`;

        if (newPlansSection.trim() !== (sections.ai_prompt_plans || '').trim()) {
          newSuggestions.push({
            section: 'ai_prompt_plans',
            currentSnippet: (sections.ai_prompt_plans || '').slice(0, 200),
            suggestedSnippet: newPlansSection,
            reason: 'Planos, preços ou recursos atualizados no banco de dados.',
            accepted: true,
          });
        }
      }

      // --- Feature gates ---
      if (gatesRes.data && gatesRes.data.length > 0) {
        const gateLines = gatesRes.data.map(g =>
          `- ${g.gate_label}: requer plano ${g.required_tier}${g.description ? ` (${g.description})` : ''}`
        ).join('\n');

        const currentRules = sections.ai_prompt_rules || '';
        if (!currentRules.includes('Restrições de Recursos')) {
          const newRulesSection = currentRules + `\n\n### Restrições de Recursos (Feature Gates)\n${gateLines}`;
          newSuggestions.push({
            section: 'ai_prompt_rules',
            currentSnippet: currentRules.slice(0, 200),
            suggestedSnippet: newRulesSection,
            reason: 'Feature gates detectados. Adicionando informações sobre restrições de recursos por plano.',
            accepted: true,
          });
        }
      }

      if (newSuggestions.length === 0) {
        toast.success('✅ Tudo sincronizado! Nenhuma alteração necessária.');
      } else {
        toast.info(`🔍 ${newSuggestions.length} sugestão(ões) de atualização encontrada(s).`);
      }

      setSuggestions(newSuggestions);

      // Update last sync date
      const now = new Date().toISOString();
      await supabase.from('landing_config').upsert(
        { config_key: 'ai_prompt_last_sync', config_value: now, updated_at: now },
        { onConflict: 'config_key' }
      );
      setLastSyncDate(now);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao sincronizar dados');
    } finally {
      setSyncing(false);
    }
  };

  // Apply accepted suggestions
  const applySuggestions = async () => {
    const accepted = suggestions.filter(s => s.accepted);
    if (accepted.length === 0) {
      toast.info('Nenhuma sugestão selecionada.');
      return;
    }
    const updated = { ...sections };
    for (const s of accepted) {
      updated[s.section] = s.suggestedSnippet;
    }
    setSections(updated);
    setSuggestions([]);
    toast.success(`${accepted.length} seção(ões) atualizada(s). Clique em Salvar para persistir.`);
  };

  const combinedPrompt = SECTION_KEYS.map(sk => sections[sk.key] || '').join('\n\n');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            Assistente IA — Gerenciador de Prompt
          </h3>
          {lastSyncDate && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Última sincronização: {new Date(lastSyncDate).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowPreview(!showPreview)} className="text-xs">
            {showPreview ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
            {showPreview ? 'Ocultar' : 'Preview'}
          </Button>
          <Button size="sm" variant="outline" onClick={runSync} disabled={syncing} className="text-xs">
            <RefreshCw className={`h-3 w-3 mr-1 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Analisando...' : 'Sincronizar Tudo'}
          </Button>
          <Button size="sm" onClick={saveAll} disabled={saving} className="text-xs bg-violet-600 hover:bg-violet-700 text-white">
            {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
            Salvar
          </Button>
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="border border-amber-300 bg-amber-50 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {suggestions.length} alteração(ões) sugerida(s)
            </h4>
            <Button size="sm" onClick={applySuggestions} className="text-xs bg-amber-600 hover:bg-amber-700 text-white">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Aplicar Selecionadas
            </Button>
          </div>
          {suggestions.map((s, i) => {
            const sectionLabel = SECTION_KEYS.find(sk => sk.key === s.section)?.label || s.section;
            return (
              <div key={i} className="border border-amber-200 rounded-lg p-2 bg-white">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={s.accepted}
                    onChange={() => {
                      const up = [...suggestions];
                      up[i] = { ...up[i], accepted: !up[i].accepted };
                      setSuggestions(up);
                    }}
                    className="mt-0.5 accent-amber-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-amber-900">{sectionLabel}</p>
                    <p className="text-[10px] text-amber-700 mt-0.5">{s.reason}</p>
                    <details className="mt-1">
                      <summary className="text-[10px] text-amber-600 cursor-pointer hover:underline">Ver conteúdo sugerido</summary>
                      <pre className="text-[9px] mt-1 p-2 bg-amber-50 rounded border border-amber-200 whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {s.suggestedSnippet}
                      </pre>
                    </details>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Section editors */}
      <div className="space-y-3">
        {SECTION_KEYS.map(sk => (
          <div key={sk.key} className="border border-border rounded-xl overflow-hidden">
            <div className="bg-muted/50 px-3 py-2">
              <label className="text-xs font-bold">{sk.label}</label>
            </div>
            <textarea
              value={sections[sk.key] || ''}
              onChange={e => setSections(prev => ({ ...prev, [sk.key]: e.target.value }))}
              placeholder={sk.placeholder}
              rows={8}
              className="w-full px-3 py-2 text-xs font-mono bg-background border-0 outline-none resize-y min-h-[100px]"
            />
          </div>
        ))}
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="bg-muted/50 px-3 py-2">
            <label className="text-xs font-bold">📄 Preview do Prompt Completo ({combinedPrompt.length} caracteres)</label>
          </div>
          <pre className="px-3 py-2 text-[10px] font-mono whitespace-pre-wrap max-h-96 overflow-y-auto bg-background">
            {combinedPrompt}
          </pre>
        </div>
      )}
    </div>
  );
}
