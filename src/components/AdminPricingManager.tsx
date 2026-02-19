import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TIERS } from '@/lib/tiers';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Save, Loader2, Crown, Zap, Lock, Unlock, Plus, Trash2, RefreshCw,
  Music, Mic2, Waves, Sparkles, Activity, Radio, ListMusic, SlidersHorizontal,
  AudioWaveform, Palette, Search, BarChart3, Drum, Volume2, Star, ChevronDown, ChevronUp,
  GripVertical,
} from 'lucide-react';
import type { PlanPricing, PlanFeature, FeatureGate } from '@/hooks/useLandingConfig';
import { invalidateGatesCache } from '@/hooks/useFeatureGates';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── Catálogo de funcionalidades do app ──────────────────────────────────────
const APP_FEATURES_CATALOG: {
  category: string;
  icon: React.ReactNode;
  features: { key: string; label: string; description: string; tier: 'free' | 'pro' | 'master' }[];
}[] = [
  {
    category: 'Pads & Sons',
    icon: <Drum className="h-3.5 w-3.5" />,
    features: [
      { key: 'unlimited_pads', label: 'Pads ilimitados', description: 'Acesso a mais de 6 pads simultâneos', tier: 'pro' },
      { key: 'mixer_faders', label: 'Mixer de faders', description: 'Controle individual de volume por fader no mixer', tier: 'pro' },
      { key: 'import_audio', label: 'Importar áudio personalizado', description: 'Carregar sons próprios nos pads', tier: 'pro' },
      { key: 'pad_color_picker', label: 'Personalização de cor dos pads', description: 'Escolher cor de cada pad individualmente', tier: 'pro' },
      { key: 'store_packs', label: 'Loja de packs de sons', description: 'Comprar e usar packs premium', tier: 'free' },
    ],
  },
  {
    category: 'Efeitos de Áudio',
    icon: <AudioWaveform className="h-3.5 w-3.5" />,
    features: [
      { key: 'audio_effects', label: 'Efeitos de áudio (Master)', description: 'Reverb, delay e compressor master', tier: 'master' },
      { key: 'pad_effects', label: 'Efeitos por pad', description: 'Configurar efeitos individualmente por pad', tier: 'master' },
      { key: 'individual_volume', label: 'Volume individual por pad', description: 'Controle de volume separado por pad', tier: 'pro' },
      { key: 'pan_control', label: 'Controle de pan por pad', description: 'Panorâmica estéreo por pad', tier: 'pro' },
    ],
  },
  {
    category: 'Metrônomo & BPM',
    icon: <Activity className="h-3.5 w-3.5" />,
    features: [
      { key: 'metronome', label: 'Metrônomo', description: 'Metrônomo com click e compassos', tier: 'free' },
      { key: 'bpm_guide', label: 'Guia de BPM', description: 'Sugestões de BPM por estilo', tier: 'free' },
      { key: 'loop_engine', label: 'Loop Engine', description: 'Reprodução em loop sincronizado', tier: 'pro' },
    ],
  },
  {
    category: 'Setlists',
    icon: <ListMusic className="h-3.5 w-3.5" />,
    features: [
      { key: 'setlist_manager', label: 'Gerenciador de setlists', description: 'Criar e organizar setlists', tier: 'pro' },
      { key: 'share_setlist', label: 'Compartilhar setlist', description: 'Gerar link público de setlist', tier: 'pro' },
      { key: 'setlist_events', label: 'Eventos de Setlist', description: 'Criar e organizar eventos com data e músicas', tier: 'pro' },
      { key: 'share_event', label: 'Compartilhar evento', description: 'Gerar link público de evento com repertório', tier: 'pro' },
      { key: 'performance_mode', label: 'Modo Performance', description: 'Visualização fullscreen para palco', tier: 'master' },
    ],
  },
  {
    category: 'Busca & Integração',
    icon: <Search className="h-3.5 w-3.5" />,
    features: [
      { key: 'spotify_search', label: 'Busca no Spotify', description: 'Buscar músicas e detectar BPM via Spotify', tier: 'pro' },
      { key: 'spotify_ai', label: 'Busca com IA (Spotify + AI)', description: 'Detecção inteligente de configuração de pads', tier: 'master' },
      { key: 'music_ai_search', label: 'Sugestão de pads por IA', description: 'Configuração automática de pads via IA', tier: 'master' },
    ],
  },
  {
    category: 'Pads Ambientes',
    icon: <Waves className="h-3.5 w-3.5" />,
    features: [
      { key: 'ambient_pads', label: 'Pads Ambientes', description: 'Sons atmosféricos contínuos para worship', tier: 'pro' },
    ],
  },
  {
    category: 'Customização Visual',
    icon: <Palette className="h-3.5 w-3.5" />,
    features: [
      { key: 'zoom_popup', label: 'Zoom nos pads', description: 'Ampliar visualização do pad em toque', tier: 'free' },
      { key: 'landscape_swipe', label: 'Painéis deslizantes (landscape)', description: 'Navegar entre painéis no modo paisagem', tier: 'pro' },
    ],
  },
];

// ── Sortable plan feature row ────────────────────────────────────────────────
interface SortablePlanFeatureProps {
  feat: PlanFeature;
  saving: string | null;
  onToggle: (id: string, enabled: boolean) => void;
  onLabelChange: (id: string, label: string) => void;
  onLabelSave: (feat: PlanFeature) => void;
  onDelete: (id: string) => void;
}

const SortablePlanFeature: React.FC<SortablePlanFeatureProps> = ({
  feat, saving, onToggle, onLabelChange, onLabelSave, onDelete,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: feat.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 group">
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 p-0.5 cursor-grab active:cursor-grabbing text-white/20 hover:text-white/50 transition touch-none"
        title="Arrastar para reordenar"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Switch
        checked={feat.enabled}
        onCheckedChange={v => onToggle(feat.id, v)}
        disabled={saving === `feat-${feat.id}`}
      />
      <input
        className="flex-1 h-7 px-2 text-xs bg-transparent border border-transparent hover:border-white/10 focus:border-white/20 rounded text-white focus:outline-none"
        value={feat.feature_label}
        onChange={e => onLabelChange(feat.id, e.target.value)}
        onBlur={() => onLabelSave(feat)}
      />
      <button
        onClick={() => onDelete(feat.id)}
        className="opacity-0 group-hover:opacity-100 transition p-1 text-red-400 hover:text-red-300"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
};

const TIER_BADGE: Record<string, { label: string; cls: string }> = {
  free: { label: 'Free', cls: 'bg-gray-700/60 text-gray-300' },
  pro: { label: 'Pro', cls: 'bg-violet-700/60 text-violet-300' },
  master: { label: 'Master', cls: 'bg-amber-700/60 text-amber-300' },
};

const TIER_ORDER = ['free', 'pro', 'master'] as const;
const TIER_COLORS: Record<string, string> = {
  free: 'text-gray-400 border-gray-700',
  pro: 'text-violet-400 border-violet-700/50',
  master: 'text-amber-400 border-amber-700/50',
};

interface Props {
  onRefresh?: () => void;
}

const AdminPricingManager: React.FC<Props> = ({ onRefresh }) => {
  const [pricing, setPricing] = useState<PlanPricing[]>([]);
  const [features, setFeatures] = useState<PlanFeature[]>([]);
  const [gates, setGates] = useState<FeatureGate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pricing' | 'features' | 'gates'>('pricing');
  const [newGate, setNewGate] = useState({ gate_key: '', gate_label: '', required_tier: 'pro', description: '' });
  const [addingGate, setAddingGate] = useState(false);
  const [newFeature, setNewFeature] = useState<Record<string, { feature_key: string; feature_label: string }>>({});
  const [addingFeature, setAddingFeature] = useState<string | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [expandedCatalogCategory, setExpandedCatalogCategory] = useState<string | null>(null);
  const [addingAll, setAddingAll] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const [p, f, g] = await Promise.all([
        supabase.from('plan_pricing').select('*').order('price_brl'),
        supabase.from('plan_features').select('*').order('sort_order'),
        supabase.from('feature_gates').select('*').order('gate_label'),
      ]);
      if (p.data) setPricing(p.data as PlanPricing[]);
      if (f.data) setFeatures(f.data as PlanFeature[]);
      if (g.data) setGates(g.data as FeatureGate[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Pricing ──────────────────────────────────────────────────────────────────
  const updatePricing = (tier: string, field: keyof PlanPricing, value: any) => {
    setPricing(prev => prev.map(p => p.tier === tier ? { ...p, [field]: value } : p));
  };

  const savePricing = async (tier: string) => {
    const plan = pricing.find(p => p.tier === tier);
    if (!plan) return;
    setSaving(`pricing-${tier}`);
    try {
      const { error } = await supabase.from('plan_pricing').update({
        name: plan.name,
        price_brl: plan.price_brl,
        period: plan.period,
        cta_text: plan.cta_text,
        highlight: plan.highlight,
        badge_text: plan.badge_text || null,
        max_pads: plan.max_pads,
        max_imports: plan.max_imports,
      }).eq('tier', tier);
      if (error) throw error;

      // Sync price with Stripe if tier is paid and has a product
      if (tier !== 'free' && plan.price_brl > 0) {
        const tierConfig = TIERS[tier as keyof typeof TIERS];
        const productId = 'product_id' in tierConfig ? tierConfig.product_id : null;
        if (productId) {
          try {
            const { data: syncData, error: syncErr } = await supabase.functions.invoke('admin-sync-stripe-price', {
              body: {
                type: 'plan',
                id: plan.id,
                price_cents: Math.round(plan.price_brl * 100),
                name: plan.name,
                current_stripe_price_id: (plan as any).stripe_price_id ?? null,
                current_stripe_product_id: productId,
              },
            });
            if (syncErr) throw syncErr;
            // Save new stripe_price_id back to DB
            await supabase.from('plan_pricing')
              .update({ stripe_price_id: syncData.stripe_price_id })
              .eq('tier', tier);
            toast.success(`Plano ${plan.name} salvo e Stripe atualizado!`);
          } catch (stripeErr: any) {
            toast.warning(`Plano salvo, mas erro no Stripe: ${stripeErr?.message || stripeErr}`);
          }
        } else {
          toast.success(`Plano ${plan.name} salvo!`);
        }
      } else {
        toast.success(`Plano ${plan.name} salvo!`);
      }
      onRefresh?.();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSaving(null);
    }
  };

  // ── Features ─────────────────────────────────────────────────────────────────
  const toggleFeature = async (id: string, enabled: boolean) => {
    setSaving(`feat-${id}`);
    try {
      const { error } = await supabase.from('plan_features').update({ enabled }).eq('id', id);
      if (error) throw error;
      setFeatures(prev => prev.map(f => f.id === id ? { ...f, enabled } : f));
    } catch (e: any) {
      toast.error(e.message || 'Erro');
    } finally {
      setSaving(null);
    }
  };

  const updateFeatureLabel = (id: string, label: string) => {
    setFeatures(prev => prev.map(f => f.id === id ? { ...f, feature_label: label } : f));
  };

  const saveFeatureLabel = async (feat: PlanFeature) => {
    setSaving(`feat-label-${feat.id}`);
    try {
      const { error } = await supabase.from('plan_features').update({ feature_label: feat.feature_label }).eq('id', feat.id);
      if (error) throw error;
      toast.success('Rótulo atualizado!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(null);
    }
  };

  const addFeature = async (tier: string) => {
    const nf = newFeature[tier];
    if (!nf?.feature_key || !nf?.feature_label) return;
    setSaving(`add-feat-${tier}`);
    try {
      const { error } = await supabase.from('plan_features').insert({
        tier,
        feature_key: nf.feature_key.toLowerCase().replace(/\s+/g, '_'),
        feature_label: nf.feature_label,
        enabled: true,
        sort_order: features.filter(f => f.tier === tier).length + 1,
      });
      if (error) throw error;
      toast.success('Recurso adicionado!');
      setAddingFeature(null);
      setNewFeature(prev => ({ ...prev, [tier]: { feature_key: '', feature_label: '' } }));
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(null);
    }
  };

  const deleteFeature = async (id: string) => {
    if (!confirm('Remover este recurso?')) return;
    try {
      await supabase.from('plan_features').delete().eq('id', id);
      setFeatures(prev => prev.filter(f => f.id !== id));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleFeatureDragEnd = async (tier: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const tierFeats = [...features]
      .filter(f => f.tier === tier)
      .sort((a, b) => a.sort_order - b.sort_order);

    const oldIdx = tierFeats.findIndex(f => f.id === active.id);
    const newIdx = tierFeats.findIndex(f => f.id === over.id);
    const reordered = arrayMove(tierFeats, oldIdx, newIdx).map((f, i) => ({ ...f, sort_order: i + 1 }));

    setFeatures(prev => [
      ...prev.filter(f => f.tier !== tier),
      ...reordered,
    ]);

    try {
      await Promise.all(
        reordered.map(f =>
          supabase.from('plan_features').update({ sort_order: f.sort_order }).eq('id', f.id)
        )
      );
    } catch (e: any) {
      toast.error(e.message);
      fetchData();
    }
  };

  // ── Gates ────────────────────────────────────────────────────────────────────
  const updateGateTier = async (id: string, required_tier: string) => {
    setSaving(`gate-${id}`);
    try {
      const { error } = await supabase.from('feature_gates').update({ required_tier }).eq('id', id);
      if (error) throw error;
      setGates(prev => prev.map(g => g.id === id ? { ...g, required_tier } : g));
      invalidateGatesCache();
      toast.success('Gate atualizado!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(null);
    }
  };

  const addGate = async () => {
    if (!newGate.gate_key || !newGate.gate_label) { toast.error('Preencha chave e rótulo'); return; }
    setSaving('new-gate');
    try {
      const { error } = await supabase.from('feature_gates').insert({
        gate_key: newGate.gate_key.toLowerCase().replace(/\s+/g, '_'),
        gate_label: newGate.gate_label,
        required_tier: newGate.required_tier,
        description: newGate.description || null,
      });
      if (error) throw error;
      invalidateGatesCache();
      toast.success('Gate criado!');
      setAddingGate(false);
      setNewGate({ gate_key: '', gate_label: '', required_tier: 'pro', description: '' });
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(null);
    }
  };

  const addAllGates = async () => {
    const allFeatures = APP_FEATURES_CATALOG.flatMap(cat => cat.features);
    const missing = allFeatures.filter(f => !gates.some(g => g.gate_key === f.key));
    if (missing.length === 0) { toast.info('Todos os gates já estão cadastrados!'); return; }
    setAddingAll(true);
    try {
      const { error } = await supabase.from('feature_gates').insert(
        missing.map(f => ({
          gate_key: f.key,
          gate_label: f.label,
          required_tier: f.tier,
          description: f.description,
        }))
      );
      if (error) throw error;
      invalidateGatesCache();
      toast.success(`${missing.length} gate(s) adicionado(s) com sucesso!`);
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAddingAll(false);
    }
  };

  const deleteGate = async (id: string) => {
    if (!confirm('Remover este gate?')) return;
    try {
      await supabase.from('feature_gates').delete().eq('id', id);
      invalidateGatesCache();
      setGates(prev => prev.filter(g => g.id !== id));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const inputCls = "w-full h-8 px-2.5 text-xs rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-1 focus:ring-violet-500/60 placeholder:text-white/30";
  const labelCls = "text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1 block";

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex bg-white/5 rounded-lg p-0.5 gap-0.5">
        {([
          { id: 'pricing', label: 'Preços & Limites' },
          { id: 'features', label: 'Recursos por Plano' },
          { id: 'gates', label: 'Bloqueios do App' },
        ] as const).map(({ id, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex-1 h-7 rounded-md text-xs font-medium transition-colors ${
              activeTab === id ? 'bg-violet-600 text-white shadow-sm' : 'text-white/50 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── PRICING TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'pricing' && (
        <div className="space-y-4">
          <p className="text-[11px] text-white/40">Defina preços, limites e aparência dos cards na landing page e no app.</p>
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25">
            <span className="text-amber-400 text-xs shrink-0">⚠️</span>
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              <strong className="text-amber-300">O campo "Preço" é apenas visual</strong> — aparece na landing page e na tela de planos, mas <strong className="text-amber-300">o valor cobrado é definido diretamente no Stripe</strong>. Mantenha os dois sincronizados manualmente.
            </p>
          </div>
          {TIER_ORDER.map(tier => {
            const plan = pricing.find(p => p.tier === tier);
            if (!plan) return null;
            return (
              <div key={tier} className={`border rounded-xl p-4 space-y-3 ${TIER_COLORS[tier]}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {tier === 'master' && <Crown className="h-3.5 w-3.5 text-amber-400" />}
                    {tier === 'pro' && <Zap className="h-3.5 w-3.5 text-violet-400" />}
                    <span className="text-sm font-semibold text-white">{plan.name}</span>
                  </div>
                  <Button size="sm" onClick={() => savePricing(tier)} disabled={saving === `pricing-${tier}`}
                    className="h-7 px-3 text-xs bg-violet-600 hover:bg-violet-700 text-white">
                    {saving === `pricing-${tier}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Save className="h-3 w-3 mr-1" />Salvar</>}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Nome do Plano</label>
                    <input className={inputCls} value={plan.name}
                      onChange={e => updatePricing(tier, 'name', e.target.value)}
                      onBlur={() => savePricing(tier)} />
                  </div>
                  <div>
                    <label className={labelCls}>Preço (R$)</label>
                    <input className={inputCls} type="number" step="0.01" min="0" value={plan.price_brl}
                      onChange={e => updatePricing(tier, 'price_brl', parseFloat(e.target.value) || 0)}
                      onBlur={() => savePricing(tier)} />
                  </div>
                  <div>
                    <label className={labelCls}>Período</label>
                    <input className={inputCls} placeholder="/mês" value={plan.period}
                      onChange={e => updatePricing(tier, 'period', e.target.value)}
                      onBlur={() => savePricing(tier)} />
                  </div>
                  <div>
                    <label className={labelCls}>Texto do Botão (CTA)</label>
                    <input className={inputCls} value={plan.cta_text}
                      onChange={e => updatePricing(tier, 'cta_text', e.target.value)}
                      onBlur={() => savePricing(tier)} />
                  </div>
                  <div>
                    <label className={labelCls}>Badge (ex: "Mais popular")</label>
                    <input className={inputCls} placeholder="Opcional" value={plan.badge_text || ''}
                      onChange={e => updatePricing(tier, 'badge_text', e.target.value)}
                      onBlur={() => savePricing(tier)} />
                  </div>
                  <div>
                    <label className={labelCls}>Destaque visual (card maior)</label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Switch checked={plan.highlight} onCheckedChange={async v => {
                        updatePricing(tier, 'highlight', v);
                        setSaving(`pricing-${tier}`);
                        try {
                          const { error } = await supabase.from('plan_pricing').update({ highlight: v }).eq('tier', tier);
                          if (error) toast.error(error.message);
                          else { toast.success('Salvo!'); onRefresh?.(); }
                        } finally {
                          setSaving(null);
                        }
                      }} />
                      <span className="text-xs text-white/50">{plan.highlight ? 'Sim' : 'Não'}</span>
                    </div>
                  </div>
                  {tier !== 'free' && (
                    <>
                      <div>
                        <label className={labelCls}>Máx. de Pads (999 = ilimitado)</label>
                        <input className={inputCls} type="number" min="1" value={plan.max_pads}
                          onChange={e => updatePricing(tier, 'max_pads', parseInt(e.target.value) || 4)}
                          onBlur={() => savePricing(tier)} />
                      </div>
                      <div>
                        <label className={labelCls}>Máx. de Imports (999 = ilimitado)</label>
                        <input className={inputCls} type="number" min="1" value={plan.max_imports}
                          onChange={e => updatePricing(tier, 'max_imports', parseInt(e.target.value) || 3)}
                          onBlur={() => savePricing(tier)} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FEATURES TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'features' && (
        <div className="space-y-5">
          <p className="text-[11px] text-white/40">Arraste os recursos para reordenar. Defina os visíveis na landing page e na tela de planos.</p>
          {TIER_ORDER.map(tier => {
            const tierFeatures = features.filter(f => f.tier === tier).sort((a, b) => a.sort_order - b.sort_order);
            const plan = pricing.find(p => p.tier === tier);
            return (
              <div key={tier} className={`border rounded-xl p-4 space-y-2 ${TIER_COLORS[tier]}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-white">{plan?.name || tier}</span>
                  <button onClick={() => setAddingFeature(addingFeature === tier ? null : tier)}
                    className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300">
                    <Plus className="h-3 w-3" /> Adicionar
                  </button>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={e => handleFeatureDragEnd(tier, e)}
                >
                  <SortableContext items={tierFeatures.map(f => f.id)} strategy={verticalListSortingStrategy}>
                    {tierFeatures.map(feat => (
                      <SortablePlanFeature
                        key={feat.id}
                        feat={feat}
                        saving={saving}
                        onToggle={toggleFeature}
                        onLabelChange={updateFeatureLabel}
                        onLabelSave={saveFeatureLabel}
                        onDelete={deleteFeature}
                      />
                    ))}
                  </SortableContext>
                </DndContext>

                {addingFeature === tier && (
                  <div className="flex gap-2 mt-2 pt-2 border-t border-white/10">
                    <input className={`${inputCls} flex-1`} placeholder="Chave (ex: reverb_per_pad)"
                      value={newFeature[tier]?.feature_key || ''}
                      onChange={e => setNewFeature(p => ({ ...p, [tier]: { ...p[tier], feature_key: e.target.value } }))} />
                    <input className={`${inputCls} flex-1`} placeholder="Rótulo visível"
                      value={newFeature[tier]?.feature_label || ''}
                      onChange={e => setNewFeature(p => ({ ...p, [tier]: { ...p[tier], feature_label: e.target.value } }))} />
                    <Button size="sm" onClick={() => addFeature(tier)} disabled={saving === `add-feat-${tier}`}
                      className="h-8 px-3 text-xs bg-violet-600 hover:bg-violet-700 text-white shrink-0">
                      {saving === `add-feat-${tier}` ? <Loader2 className="h-3 w-3 animate-spin" /> : 'OK'}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── GATES TAB ────────────────────────────────────────────────────────── */}
      {activeTab === 'gates' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-white/40">Defina qual plano é necessário para acessar cada área do app.</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setCatalogOpen(v => !v)}
                className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 transition">
                {catalogOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Catálogo
              </button>
              <button onClick={addAllGates} disabled={addingAll}
                className="flex items-center gap-1 text-[10px] text-green-400 hover:text-green-300 disabled:opacity-50 transition">
                {addingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                Adicionar todos
              </button>
              <button onClick={() => setAddingGate(v => !v)}
                className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 transition">
                <Plus className="h-3 w-3" /> Novo gate
              </button>
            </div>
          </div>

          {/* ── Catálogo visual de funcionalidades ─────────────────────────── */}
          {catalogOpen && (
            <div className="border border-amber-700/30 rounded-xl p-3 space-y-2 bg-amber-950/10">
              <p className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider mb-2">
                Catálogo de funcionalidades do app
              </p>
              <p className="text-[10px] text-white/40 mb-3">
                Clique em qualquer funcionalidade para pré-preencher o formulário de novo gate.
              </p>
              <div className="space-y-1.5">
                {APP_FEATURES_CATALOG.map(cat => {
                  const isOpen = expandedCatalogCategory === cat.category;
                  return (
                    <div key={cat.category} className="border border-white/8 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedCatalogCategory(isOpen ? null : cat.category)}
                        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/5 transition"
                      >
                        <div className="flex items-center gap-2 text-white/70">
                          {cat.icon}
                          <span className="text-xs font-medium">{cat.category}</span>
                          <span className="text-[10px] text-white/30">({cat.features.length})</span>
                        </div>
                        {isOpen
                          ? <ChevronUp className="h-3 w-3 text-white/30" />
                          : <ChevronDown className="h-3 w-3 text-white/30" />
                        }
                      </button>
                      {isOpen && (
                        <div className="border-t border-white/8 divide-y divide-white/5">
                          {cat.features.map(feat => {
                            const alreadyAdded = gates.some(g => g.gate_key === feat.key);
                            const badge = TIER_BADGE[feat.tier];
                            return (
                              <div key={feat.key}
                                className={`flex items-center justify-between px-3 py-2 gap-3 transition ${alreadyAdded ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5 cursor-pointer'}`}
                                onClick={() => {
                                  if (alreadyAdded) return;
                                  setNewGate({
                                    gate_key: feat.key,
                                    gate_label: feat.label,
                                    required_tier: feat.tier,
                                    description: feat.description,
                                  });
                                  setAddingGate(true);
                                  setCatalogOpen(false);
                                }}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-white truncate">{feat.label}</span>
                                    {alreadyAdded && (
                                      <span className="text-[9px] text-green-400 shrink-0">✓ já adicionado</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-white/35 truncate">{feat.description}</p>
                                  <p className="text-[9px] text-white/20 font-mono mt-0.5">{feat.key}</p>
                                </div>
                                <span className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${badge.cls}`}>
                                  {badge.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {addingGate && (
            <div className="border border-violet-700/40 rounded-xl p-3 space-y-2 bg-violet-950/20">
              <p className="text-[10px] font-semibold text-violet-300 uppercase tracking-wider">Novo gate de acesso</p>
              <div className="grid grid-cols-2 gap-2">
                <input className={inputCls} placeholder="Chave (ex: live_mode)"
                  value={newGate.gate_key} onChange={e => setNewGate(p => ({ ...p, gate_key: e.target.value }))} />
                <input className={inputCls} placeholder="Rótulo (ex: Modo ao Vivo)"
                  value={newGate.gate_label} onChange={e => setNewGate(p => ({ ...p, gate_label: e.target.value }))} />
                <input className={inputCls} placeholder="Descrição (opcional)"
                  value={newGate.description} onChange={e => setNewGate(p => ({ ...p, description: e.target.value }))} />
                <select className={inputCls} value={newGate.required_tier}
                  onChange={e => setNewGate(p => ({ ...p, required_tier: e.target.value }))}>
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="master">Master</option>
                </select>
              </div>
              <Button size="sm" onClick={addGate} disabled={saving === 'new-gate'}
                className="h-7 px-3 text-xs bg-violet-600 hover:bg-violet-700 text-white">
                {saving === 'new-gate' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Criar Gate'}
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {gates.map(gate => (
              <div key={gate.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/8 bg-white/[0.03] group">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{gate.gate_label}</p>
                  {gate.description && <p className="text-[10px] text-white/40 truncate">{gate.description}</p>}
                  <p className="text-[9px] text-white/25 font-mono mt-0.5">{gate.gate_key}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {gate.required_tier === 'free' ? <Unlock className="h-3 w-3 text-green-400" /> : <Lock className="h-3 w-3 text-amber-400" />}
                  <select
                    className="h-7 px-2 text-xs rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none"
                    value={gate.required_tier}
                    onChange={e => updateGateTier(gate.id, e.target.value)}
                    disabled={saving === `gate-${gate.id}`}
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="master">Master</option>
                  </select>
                  <button onClick={() => deleteGate(gate.id)}
                    className="opacity-0 group-hover:opacity-100 transition p-1 text-red-400 hover:text-red-300">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={fetchData} className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition">
        <RefreshCw className="h-3 w-3" /> Atualizar dados
      </button>
    </div>
  );
};

export default AdminPricingManager;
