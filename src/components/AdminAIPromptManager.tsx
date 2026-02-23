import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Loader2, RefreshCw, Save, Eye, EyeOff, CheckCircle2, AlertTriangle,
  Sparkles, Search, ShieldAlert, Info, Zap, Store, Globe, CreditCard, Bot, Settings, X,
} from 'lucide-react';

/* ─── Types ─── */
interface SyncSuggestion {
  section: string;
  currentSnippet: string;
  suggestedSnippet: string;
  reason: string;
  accepted: boolean;
}

interface AuditSuggestion {
  area: string;
  severity: string;
  title: string;
  description: string;
  current_value?: string;
  suggested_value?: string;
  config_key?: string;
  config_table?: string;
  action_type: string;
  accepted: boolean;
  user_note?: string;
}

/* ─── Constants ─── */
const SECTION_KEYS = [
  { key: 'ai_prompt_base', label: '📋 Base (tom, idioma, identidade)', placeholder: 'Instruções gerais do assistente...' },
  { key: 'ai_prompt_features', label: '🎛️ Funcionalidades do App', placeholder: 'Pads, loops, MIDI, metrônomo, mixer...' },
  { key: 'ai_prompt_store', label: '🛒 Glory Store', placeholder: 'Packs disponíveis, categorias, preços...' },
  { key: 'ai_prompt_plans', label: '💳 Planos e Preços', placeholder: 'Free, Pro, Master com limites e preços...' },
  { key: 'ai_prompt_rules', label: '⚠️ Regras de Comportamento', placeholder: 'O que a IA deve e não deve fazer...' },
];

const DEFAULT_SECTIONS: Record<string, string> = {
  ai_prompt_base: `Você é o assistente de suporte do Glory Pads, um app de bateria eletrônica e pads musicais para worship e louvor.\n\nResponda SEMPRE em português brasileiro, de forma amigável, clara e objetiva. Use emojis com moderação para deixar a conversa mais acolhedora.\n\nO Glory Pads é um app PWA (Progressive Web App) que funciona em celulares, tablets e computadores via navegador. Ele permite que músicos toquem bateria eletrônica, loops rítmicos, continuous pads e mais — tudo direto no dispositivo.`,
  ai_prompt_features: `## Funcionalidades Principais\n\n### Pads de Bateria\n- Grid 3x3 por página com até 3 páginas (até 16 pads no plano Pro/Master, 6 no Free)\n- Toque simples reproduz o som; pressão longa abre opções\n- Cores indicam categoria\n- Tamanho ajustável\n\n### Loops Rítmicos\n- Toggle para iniciar/parar\n- Sincronizam com BPM\n- Entram alinhados ao kick\n\n### Continuous Pads\n- Notas sustentadas para atmosferas\n- Volume e pan independentes\n\n### Metrônomo\n- BPM ajustável\n- Compassos: 4/4, 3/4, 6/8\n- Pan separado\n\n### Mixer de Faders\n- Volume individual por pad\n- Fader e Pan Master\n\n### Repertório & Eventos\n- Eventos com músicas\n- Salva BPM, volumes, pans, efeitos, MIDI\n- Compartilhamento via link\n\n### MIDI\n- USB e Bluetooth\n- Mapeamento de notas e CCs\n\n### Efeitos (Master)\n- EQ, Reverb, Delay\n\n### Modos Especiais\n- Modo Edição e Modo Foco`,
  ai_prompt_store: `### Glory Store\n- Loja de packs profissionais\n- Preview antes de comprar\n- Importação direta para pads`,
  ai_prompt_plans: `### Planos e Assinaturas\n- **Gratuito**: 6 pads, 3 importações\n- **Pro** (R$ 9,99/mês): 16 pads, ilimitado\n- **Master** (R$ 14,99/mês): + efeitos\n- Pagamento via Stripe\n\n### Dados e Offline\n- IndexedDB offline\n- Nuvem para repertórios\n- PWA instalável`,
  ai_prompt_rules: `## Instruções de Comportamento\n- Não invente funcionalidades\n- Sugira recarregar, verificar conexão, limpar cache\n- Nunca forneça dados de outros usuários\n- Respostas concisas (3-4 parágrafos)`,
};

const AREA_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  landing: { icon: <Globe className="h-3.5 w-3.5" />, label: 'Landing Page', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  store: { icon: <Store className="h-3.5 w-3.5" />, label: 'Loja', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  plans: { icon: <CreditCard className="h-3.5 w-3.5" />, label: 'Planos', color: 'text-green-600 bg-green-50 border-green-200' },
  ai_prompt: { icon: <Bot className="h-3.5 w-3.5" />, label: 'IA Assistente', color: 'text-violet-600 bg-violet-50 border-violet-200' },
  app_config: { icon: <Settings className="h-3.5 w-3.5" />, label: 'App', color: 'text-orange-600 bg-orange-50 border-orange-200' },
};

const SEVERITY_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  critical: { icon: <ShieldAlert className="h-3.5 w-3.5" />, label: 'Crítico', color: 'text-red-700 bg-red-50 border-red-300' },
  warning: { icon: <AlertTriangle className="h-3.5 w-3.5" />, label: 'Atenção', color: 'text-amber-700 bg-amber-50 border-amber-300' },
  info: { icon: <Info className="h-3.5 w-3.5" />, label: 'Info', color: 'text-sky-700 bg-sky-50 border-sky-300' },
};

const DISMISSED_AUDIT_KEY = 'glory_dismissed_audit_suggestions';

const getDismissedSuggestions = (): string[] => {
  try { return JSON.parse(localStorage.getItem(DISMISSED_AUDIT_KEY) || '[]'); } catch { return []; }
};
const addDismissedSuggestion = (title: string) => {
  const dismissed = getDismissedSuggestions();
  if (!dismissed.includes(title)) {
    dismissed.push(title);
    localStorage.setItem(DISMISSED_AUDIT_KEY, JSON.stringify(dismissed));
  }
};
const clearDismissedSuggestions = () => localStorage.removeItem(DISMISSED_AUDIT_KEY);

/* ─── Component ─── */
export default function AdminAIPromptManager() {
  const [activeView, setActiveView] = useState<'audit' | 'prompt'>('audit');

  // Prompt state
  const [sections, setSections] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [suggestions, setSuggestions] = useState<SyncSuggestion[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);

  // Audit state
  const [auditing, setAuditing] = useState(false);
  const [auditResults, setAuditResults] = useState<AuditSuggestion[]>([]);
  const [applyingAudit, setApplyingAudit] = useState(false);
  const [lastAuditDate, setLastAuditDate] = useState<string | null>(null);
  const [interpreting, setInterpreting] = useState<number | null>(null); // index being interpreted
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    index: number;
    message: string;
    action: string;
    config_key?: string;
    config_table?: string;
    new_value?: string;
    details?: string;
  } | null>(null);

  // Load prompt sections
  const loadSections = useCallback(async () => {
    setLoading(true);
    try {
      const keys = SECTION_KEYS.map(s => s.key);
      const { data } = await supabase
        .from('landing_config')
        .select('config_key, config_value')
        .in('config_key', [...keys, 'ai_prompt_last_sync', 'project_last_audit']);
      const loaded: Record<string, string> = {};
      let syncDate: string | null = null;
      let auditDate: string | null = null;
      if (data) {
        for (const row of data) {
          if (row.config_key === 'ai_prompt_last_sync') syncDate = row.config_value;
          else if (row.config_key === 'project_last_audit') auditDate = row.config_value;
          else loaded[row.config_key] = row.config_value;
        }
      }
      for (const sk of SECTION_KEYS) {
        if (!loaded[sk.key]) loaded[sk.key] = DEFAULT_SECTIONS[sk.key] || '';
      }
      setSections(loaded);
      setLastSyncDate(syncDate);
      setLastAuditDate(auditDate);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSections(); }, [loadSections]);

  // Save prompt sections
  const saveAll = async () => {
    setSaving(true);
    try {
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
      toast.success('Prompt da IA salvo!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  // Prompt sync (existing logic)
  const runSync = async () => {
    setSyncing(true);
    setSuggestions([]);
    try {
      const [packsRes, pricingRes, featuresRes, gatesRes] = await Promise.all([
        supabase.from('store_packs').select('name, category, price_cents, is_available, tag').eq('is_available', true),
        supabase.from('public_plan_pricing' as any).select('*').order('price_brl'),
        supabase.from('plan_features').select('*').order('sort_order'),
        supabase.from('feature_gates').select('*'),
      ]);
      const newSuggestions: SyncSuggestion[] = [];

      if (packsRes.data && packsRes.data.length > 0) {
        const packLines = packsRes.data.map(p => {
          const price = p.price_cents > 0 ? `R$ ${(p.price_cents / 100).toFixed(2).replace('.', ',')}` : 'Grátis';
          return `- **${p.name}** (${p.category}) — ${price}${p.tag ? ` [${p.tag}]` : ''}`;
        }).join('\n');
        const categories = [...new Set(packsRes.data.map(p => p.category))].join(', ');
        const newStore = `### Glory Store\n- Loja de packs de sons profissionais\n- Categorias: ${categories}\n- Preview antes de comprar\n- Importação direta para pads\n\n#### Packs Disponíveis\n${packLines}`;
        if (newStore.trim() !== (sections.ai_prompt_store || '').trim()) {
          newSuggestions.push({ section: 'ai_prompt_store', currentSnippet: (sections.ai_prompt_store || '').slice(0, 150), suggestedSnippet: newStore, reason: `${packsRes.data.length} pack(s) na loja — atualizando lista.`, accepted: true });
        }
      }

      if (pricingRes.data && (pricingRes.data as any[]).length > 0) {
        const planLines = (pricingRes.data as any[]).map((p: any) => {
          const price = Number(p.price_brl) > 0 ? `R$ ${Number(p.price_brl).toFixed(2).replace('.', ',')}${p.period}` : 'Grátis';
          return `- **${p.name}** (${price}): ${p.max_pads} pads, ${p.max_imports >= 999 ? 'importações ilimitadas' : `${p.max_imports} importações`}`;
        }).join('\n');
        const featuresByTier: Record<string, string[]> = {};
        if (featuresRes.data) {
          for (const f of featuresRes.data) {
            if (f.enabled) {
              if (!featuresByTier[f.tier]) featuresByTier[f.tier] = [];
              featuresByTier[f.tier].push(f.feature_label);
            }
          }
        }
        const fLines = Object.entries(featuresByTier).map(([t, fs]) => `- ${t}: ${fs.join(', ')}`).join('\n');
        const newPlans = `### Planos e Assinaturas\n${planLines}\n- Pagamento via Stripe\n- Cancelamento a qualquer momento\n\n#### Recursos por Plano\n${fLines}\n\n### Dados e Offline\n- IndexedDB offline\n- Nuvem para repertórios\n- PWA instalável`;
        if (newPlans.trim() !== (sections.ai_prompt_plans || '').trim()) {
          newSuggestions.push({ section: 'ai_prompt_plans', currentSnippet: (sections.ai_prompt_plans || '').slice(0, 150), suggestedSnippet: newPlans, reason: 'Planos ou recursos atualizados.', accepted: true });
        }
      }

      if (newSuggestions.length === 0) toast.success('✅ Prompt da IA sincronizado!');
      else toast.info(`🔍 ${newSuggestions.length} atualização(ões) sugerida(s).`);
      setSuggestions(newSuggestions);

      const now = new Date().toISOString();
      await supabase.from('landing_config').upsert({ config_key: 'ai_prompt_last_sync', config_value: now, updated_at: now }, { onConflict: 'config_key' });
      setLastSyncDate(now);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const applySyncSuggestions = () => {
    const accepted = suggestions.filter(s => s.accepted);
    if (!accepted.length) { toast.info('Nenhuma selecionada.'); return; }
    const updated = { ...sections };
    for (const s of accepted) updated[s.section] = s.suggestedSnippet;
    setSections(updated);
    setSuggestions([]);
    toast.success(`${accepted.length} seção(ões) atualizada(s). Clique em Salvar.`);
  };

  // ─── PROJECT AUDIT ───
  const runAudit = async () => {
    setAuditing(true);
    setAuditResults([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Faça login novamente.'); return; }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/project-audit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: '{}',
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erro' }));
        toast.error(err.error || 'Erro na auditoria');
        return;
      }

      const result = await resp.json();
      const dismissed = getDismissedSuggestions();
      const mapped: AuditSuggestion[] = (result.suggestions || [])
        .filter((s: any) => !dismissed.includes(s.title))
        .map((s: any) => ({ ...s, accepted: false }));
      setAuditResults(mapped);

      if (mapped.length === 0) toast.success('✅ Projeto 100% sincronizado!');
      else toast.info(`🔍 ${mapped.length} sugestão(ões) encontrada(s) pela IA.`);

      const now = new Date().toISOString();
      await supabase.from('landing_config').upsert({ config_key: 'project_last_audit', config_value: now, updated_at: now }, { onConflict: 'config_key' });
      setLastAuditDate(now);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao executar auditoria');
    } finally {
      setAuditing(false);
    }
  };

  const applyAuditSuggestions = async () => {
      const accepted = auditResults.filter(s => s.accepted);
      const applicable = accepted.filter(s => s.action_type === 'update' && s.config_key && s.config_table && s.suggested_value);
      if (!accepted.length) { toast.info('Nenhuma sugestão selecionada.'); return; }
      setApplyingAudit(true);
      let applied = 0;
      try {
        // Apply config updates
        for (const s of applicable) {
          const table = s.config_table === 'store_config' ? 'store_config' : 'landing_config';
          const valueToApply = s.user_note?.trim() || s.suggested_value!;
          await supabase.from(table).upsert(
            { config_key: s.config_key!, config_value: valueToApply, updated_at: new Date().toISOString() } as any,
            { onConflict: 'config_key' }
          );
          applied++;
        }
        // Mark applied suggestions as dismissed so they don't reappear
        for (const s of accepted) {
          addDismissedSuggestion(s.title);
        }
        toast.success(`${applied > 0 ? `${applied} alteração(ões) aplicada(s)` : 'Sugestões marcadas como concluídas'}!`);
        setAuditResults(prev => prev.filter(s => !s.accepted));
      } catch (e) {
        console.error(e);
        toast.error('Erro ao aplicar');
      } finally {
        setApplyingAudit(false);
      }
    };

    const interpretSuggestion = async (index: number) => {
      const s = auditResults[index];
      if (!s.user_note?.trim()) {
        toast.info('Digite uma instrução antes de enviar para a IA.');
        return;
      }
      setInterpreting(index);
      try {
        const { data, error } = await supabase.functions.invoke('audit-interpret', {
          body: { suggestion: s, user_instruction: s.user_note },
        });
        if (error) throw error;
        if (!data.understood) {
          toast.warning(data.confirmation_message || 'A IA não entendeu a instrução. Tente reformular.');
          return;
        }
        setPendingConfirmation({
          index,
          message: data.confirmation_message,
          action: data.action,
          config_key: data.config_key,
          config_table: data.config_table,
          new_value: data.new_value,
          details: data.details,
        });
      } catch (e) {
        console.error(e);
        toast.error('Erro ao interpretar instrução');
      } finally {
        setInterpreting(null);
      }
    };

    const confirmInterpretation = async () => {
      if (!pendingConfirmation) return;
      const { index, action, config_key, config_table, new_value } = pendingConfirmation;
      if (action === 'update' && config_key && config_table && new_value) {
        try {
          const table = config_table === 'store_config' ? 'store_config' : 'landing_config';
          await supabase.from(table).upsert(
            { config_key, config_value: new_value, updated_at: new Date().toISOString() } as any,
            { onConflict: 'config_key' }
          );
          addDismissedSuggestion(auditResults[index].title);
          setAuditResults(prev => prev.filter((_, i) => i !== index));
          toast.success('Alteração aplicada com sucesso!');
        } catch (e) {
          console.error(e);
          toast.error('Erro ao aplicar alteração');
        }
      } else {
        addDismissedSuggestion(auditResults[index].title);
        setAuditResults(prev => prev.filter((_, i) => i !== index));
        toast.success('Sugestão marcada como concluída');
      }
      setPendingConfirmation(null);
    };

    const dismissSuggestion = (index: number) => {
      const s = auditResults[index];
      addDismissedSuggestion(s.title);
      setAuditResults(prev => prev.filter((_, i) => i !== index));
      toast.info('Sugestão descartada');
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
      {/* View Toggle */}
      <div className="flex gap-1 bg-muted rounded-lg p-0.5">
        <button
          onClick={() => setActiveView('audit')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${activeView === 'audit' ? 'bg-white text-black shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Search className="h-3.5 w-3.5" />
          Revisão do Projeto
        </button>
        <button
          onClick={() => setActiveView('prompt')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${activeView === 'prompt' ? 'bg-white text-black shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Bot className="h-3.5 w-3.5" />
          Prompt da IA
        </button>
      </div>

      {/* ═══════════ AUDIT VIEW ═══════════ */}
      {activeView === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Revisão Inteligente do Projeto
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                A IA analisa Loja, Landing Page, Planos, Central de Ajuda e sugere melhorias.
                {lastAuditDate && <> • Última: {new Date(lastAuditDate).toLocaleString('pt-BR')}</>}
              </p>
            </div>
            <Button size="sm" onClick={runAudit} disabled={auditing} className="text-xs bg-amber-600 hover:bg-amber-700 text-white">
              {auditing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Search className="h-3 w-3 mr-1" />}
              {auditing ? 'Analisando...' : 'Analisar Projeto'}
            </Button>
          </div>

          {auditing && (
            <div className="border border-amber-200 bg-amber-50 rounded-xl p-6 text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600 mx-auto" />
              <p className="text-xs font-semibold text-amber-800">Analisando todo o projeto com IA...</p>
              <p className="text-[10px] text-amber-600">Loja • Landing Page • Planos • Prompt da IA • Configurações</p>
            </div>
          )}

          {!auditing && auditResults.length === 0 && lastAuditDate && (
            <div className="border border-green-200 bg-green-50 rounded-xl p-4 text-center">
              <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-1" />
              <p className="text-xs font-semibold text-green-800">Projeto sincronizado! Nenhuma sugestão pendente.</p>
            </div>
          )}

          {auditResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-muted-foreground">{auditResults.length} sugestão(ões)</p>
                  {getDismissedSuggestions().length > 0 && (
                    <button onClick={() => { clearDismissedSuggestions(); toast.info('Sugestões descartadas foram restauradas. Rode a análise novamente.'); }} className="text-[9px] text-muted-foreground underline hover:text-foreground">
                      Restaurar descartadas ({getDismissedSuggestions().length})
                    </button>
                  )}
                </div>
                <Button size="sm" onClick={applyAuditSuggestions} disabled={applyingAudit || !auditResults.some(s => s.accepted)} className="text-xs">
                  {applyingAudit ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                  Aplicar Selecionadas
                </Button>
              </div>

              {auditResults.map((s, i) => {
                const area = AREA_META[s.area] || AREA_META.app_config;
                const sev = SEVERITY_META[s.severity] || SEVERITY_META.info;
                return (
                  <div key={i} className={`border rounded-xl p-3 ${sev.color}`}>
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={s.accepted}
                        onChange={() => {
                          const up = [...auditResults];
                          up[i] = { ...up[i], accepted: !up[i].accepted };
                          setAuditResults(up);
                        }}
                        className="mt-0.5 accent-amber-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${area.color}`}>
                              {area.icon} {area.label}
                            </span>
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${sev.color}`}>
                              {sev.icon} {sev.label}
                            </span>
                          </div>
                          <button onClick={() => dismissSuggestion(i)} className="text-muted-foreground hover:text-foreground p-0.5 rounded" title="Descartar sugestão">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-xs font-bold">{s.title}</p>
                        <p className="text-[10px] mt-0.5 opacity-80">{s.description}</p>

                        {(s.current_value || s.suggested_value) && (
                          <details className="mt-2">
                            <summary className="text-[10px] cursor-pointer hover:underline font-semibold">Ver detalhes</summary>
                            <div className="mt-1 space-y-1">
                              {s.current_value && (
                                <div className="bg-white/60 rounded p-1.5">
                                  <p className="text-[9px] font-bold text-red-600 mb-0.5">Atual:</p>
                                  <p className="text-[10px] font-mono">{s.current_value}</p>
                                </div>
                              )}
                              {s.suggested_value && (
                                <div className="bg-white/60 rounded p-1.5">
                                  <p className="text-[9px] font-bold text-green-600 mb-0.5">Sugerido:</p>
                                  <p className="text-[10px] font-mono">{s.suggested_value}</p>
                                </div>
                              )}
                            </div>
                          </details>
                        )}

                        {s.action_type === 'review' && (
                          <p className="text-[9px] mt-1 italic opacity-60">⚙️ Ação manual — selecione para marcar como concluída</p>
                        )}

                        <div className="mt-2 flex gap-1.5 items-center">
                          <input
                            type="text"
                            placeholder="Escreva o que deseja que seja feito..."
                            value={s.user_note || ''}
                            onChange={(e) => {
                              const up = [...auditResults];
                              up[i] = { ...up[i], user_note: e.target.value };
                              setAuditResults(up);
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter' && s.user_note?.trim()) interpretSuggestion(i); }}
                            className="flex-1 text-[10px] px-2 py-1.5 rounded-md border border-current/20 bg-white/70 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          {s.user_note?.trim() && (
                            <button
                              onClick={() => interpretSuggestion(i)}
                              disabled={interpreting === i}
                              className="shrink-0 px-2 py-1.5 rounded-md bg-primary text-primary-foreground text-[9px] font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                            >
                              {interpreting === i ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                              Enviar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ CONFIRMATION MODAL ═══════════ */}
      {pendingConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold">Confirmação da IA</h3>
            </div>
            <p className="text-sm">{pendingConfirmation.message}</p>
            {pendingConfirmation.details && (
              <p className="text-xs text-muted-foreground">{pendingConfirmation.details}</p>
            )}
            {pendingConfirmation.new_value && (
              <div className="bg-muted rounded-lg p-3">
                <p className="text-[10px] font-bold text-muted-foreground mb-1">Novo valor:</p>
                <p className="text-xs font-mono break-all">{pendingConfirmation.new_value}</p>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setPendingConfirmation(null)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={confirmInterpretation}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Confirmar e Aplicar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ PROMPT VIEW ═══════════ */}
      {activeView === 'prompt' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                Prompt do Assistente IA
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
                {syncing ? 'Sincronizando...' : 'Sincronizar'}
              </Button>
              <Button size="sm" onClick={saveAll} disabled={saving} className="text-xs bg-violet-600 hover:bg-violet-700 text-white">
                {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                Salvar
              </Button>
            </div>
          </div>

          {/* Sync suggestions */}
          {suggestions.length > 0 && (
            <div className="border border-amber-300 bg-amber-50 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> {suggestions.length} atualização(ões)
                </h4>
                <Button size="sm" onClick={applySyncSuggestions} className="text-xs bg-amber-600 hover:bg-amber-700 text-white">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Aplicar
                </Button>
              </div>
              {suggestions.map((s, i) => {
                const label = SECTION_KEYS.find(sk => sk.key === s.section)?.label || s.section;
                return (
                  <div key={i} className="border border-amber-200 rounded-lg p-2 bg-white">
                    <div className="flex items-start gap-2">
                      <input type="checkbox" checked={s.accepted} onChange={() => { const u = [...suggestions]; u[i] = { ...u[i], accepted: !u[i].accepted }; setSuggestions(u); }} className="mt-0.5 accent-amber-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-900">{label}</p>
                        <p className="text-[10px] text-amber-700">{s.reason}</p>
                        <details className="mt-1">
                          <summary className="text-[10px] text-amber-600 cursor-pointer hover:underline">Ver conteúdo</summary>
                          <pre className="text-[9px] mt-1 p-2 bg-amber-50 rounded border border-amber-200 whitespace-pre-wrap max-h-32 overflow-y-auto">{s.suggestedSnippet}</pre>
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
                  className="w-full px-3 py-2 text-xs font-mono bg-white text-black border-0 outline-none resize-y min-h-[100px]"
                />
              </div>
            ))}
          </div>

          {showPreview && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="bg-muted/50 px-3 py-2">
                <label className="text-xs font-bold">📄 Preview ({combinedPrompt.length} chars)</label>
              </div>
              <pre className="px-3 py-2 text-[10px] font-mono whitespace-pre-wrap max-h-96 overflow-y-auto bg-white text-black">
                {combinedPrompt}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
