import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Save, Loader2, Eye, EyeOff, RefreshCw, LayoutGrid, Type } from 'lucide-react';
import AdminLandingFeaturesEditor from './AdminLandingFeaturesEditor';

interface ConfigRow {
  id: string;
  config_key: string;
  config_value: string;
}

const SECTION_LABELS: Record<string, string> = {
  hero_title: 'Título Principal (Hero)',
  hero_subtitle: 'Subtítulo (Hero)',
  hero_badge: 'Badge (Hero)',
  features_title: 'Título — Seção Recursos',
  features_subtitle: 'Subtítulo — Seção Recursos',
  store_title: 'Título — Seção Loja',
  store_subtitle: 'Subtítulo — Seção Loja',
  plans_title: 'Título — Seção Planos',
  plans_subtitle: 'Subtítulo — Seção Planos',
  show_pricing: 'Mostrar preços na landing page',
  cta_title: 'Título — CTA Final',
  cta_subtitle: 'Subtítulo — CTA Final',
  stat_1_value: 'Stat 1 — Valor',
  stat_1_label: 'Stat 1 — Rótulo',
  stat_2_value: 'Stat 2 — Valor',
  stat_2_label: 'Stat 2 — Rótulo',
  stat_3_value: 'Stat 3 — Valor',
  stat_3_label: 'Stat 3 — Rótulo',
  stat_4_value: 'Stat 4 — Valor',
  stat_4_label: 'Stat 4 — Rótulo',
};

const SECTION_GROUPS = [
  { label: 'Hero', keys: ['hero_badge', 'hero_title', 'hero_subtitle'] },
  { label: 'Estatísticas', keys: ['stat_1_value', 'stat_1_label', 'stat_2_value', 'stat_2_label', 'stat_3_value', 'stat_3_label', 'stat_4_value', 'stat_4_label'] },
  { label: 'Seção Recursos', keys: ['features_title', 'features_subtitle'] },
  { label: 'Seção Loja', keys: ['store_title', 'store_subtitle'] },
  { label: 'Seção Planos', keys: ['plans_title', 'plans_subtitle', 'show_pricing'] },
  { label: 'CTA Final', keys: ['cta_title', 'cta_subtitle'] },
];

const AdminLandingEditor: React.FC = () => {
  const [rows, setRows] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'textos' | 'recursos'>('textos');

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('landing_config').select('*').order('config_key');
      if (data) setRows(data as ConfigRow[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getVal = (key: string) => rows.find(r => r.config_key === key)?.config_value ?? '';

  const setVal = (key: string, value: string) => {
    setRows(prev => prev.map(r => r.config_key === key ? { ...r, config_value: value } : r));
  };

  const saveKey = async (key: string) => {
    const row = rows.find(r => r.config_key === key);
    if (!row) return;
    setSaving(key);
    try {
      const { error } = await supabase.from('landing_config')
        .update({ config_value: row.config_value })
        .eq('config_key', key);
      if (error) throw error;
      toast.success('Salvo!');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSaving(null);
    }
  };

  const toggleShowPricing = async (v: boolean) => {
    setVal('show_pricing', v ? 'true' : 'false');
    setSaving('show_pricing');
    try {
      await supabase.from('landing_config')
        .update({ config_value: v ? 'true' : 'false' })
        .eq('config_key', 'show_pricing');
      toast.success(v ? 'Preços visíveis na landing' : 'Preços ocultos na landing');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'hsl(262 75% 65%)' }} />
      </div>
    );
  }

  const showPricing = getVal('show_pricing') === 'true';

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex bg-white/5 rounded-lg p-0.5 gap-0.5">
        <button
          onClick={() => setActiveTab('textos')}
          className={`flex-1 h-7 flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'textos' ? 'bg-violet-600 text-white shadow-sm' : 'text-white/50 hover:text-white'}`}
        >
          <Type className="h-3 w-3" /> Textos & Config
        </button>
        <button
          onClick={() => setActiveTab('recursos')}
          className={`flex-1 h-7 flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'recursos' ? 'bg-violet-600 text-white shadow-sm' : 'text-white/50 hover:text-white'}`}
        >
          <LayoutGrid className="h-3 w-3" /> Cards Recursos
        </button>
      </div>

      {activeTab === 'recursos' && <AdminLandingFeaturesEditor />}

      {activeTab === 'textos' && (
      <div className="space-y-5">
      <p className="text-[11px]" style={{ color: 'hsl(0 0% 100% / 0.4)' }}>
        Edite o conteúdo textual da landing page. As alterações ficam visíveis imediatamente.
      </p>

      {SECTION_GROUPS.map(group => (
        <div key={group.label} className="rounded-xl p-4 space-y-3"
          style={{ border: '1px solid hsl(0 0% 100% / 0.08)', background: 'hsl(0 0% 100% / 0.02)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: 'hsl(262 75% 65%)' }}>{group.label}</p>

          {group.keys.map(key => {
            if (key === 'show_pricing') {
              return (
                <div key={key} className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-xs" style={{ color: 'hsl(0 0% 100% / 0.8)' }}>{SECTION_LABELS[key]}</p>
                    <p className="text-[10px]" style={{ color: 'hsl(0 0% 100% / 0.4)' }}>Controla a visibilidade da seção de preços</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {showPricing
                      ? <Eye className="h-3.5 w-3.5" style={{ color: 'hsl(142 70% 50%)' }} />
                      : <EyeOff className="h-3.5 w-3.5" style={{ color: 'hsl(0 0% 40%)' }} />}
                    <Switch checked={showPricing} onCheckedChange={toggleShowPricing} />
                  </div>
                </div>
              );
            }

            const isLong = key.includes('subtitle') || key.includes('title');
            return (
              <div key={key}>
                <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block"
                  style={{ color: 'hsl(0 0% 100% / 0.4)' }}>
                  {SECTION_LABELS[key] || key}
                </label>
                <div className="flex gap-2">
                  {isLong ? (
                    <textarea
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg resize-none focus:outline-none"
                      style={{
                        border: '1px solid hsl(0 0% 100% / 0.1)',
                        background: 'hsl(0 0% 100% / 0.05)',
                        color: 'hsl(0 0% 100%)',
                        minHeight: '60px',
                      }}
                      value={getVal(key)}
                      onChange={e => setVal(key, e.target.value)}
                      onBlur={() => saveKey(key)}
                    />
                  ) : (
                    <input
                      className="flex-1 h-8 px-2.5 text-xs rounded-lg focus:outline-none"
                      style={{
                        border: '1px solid hsl(0 0% 100% / 0.1)',
                        background: 'hsl(0 0% 100% / 0.05)',
                        color: 'hsl(0 0% 100%)',
                      }}
                      value={getVal(key)}
                      onChange={e => setVal(key, e.target.value)}
                      onBlur={() => saveKey(key)}
                    />
                  )}
                  <button
                    onClick={() => saveKey(key)}
                    disabled={saving === key}
                    className="shrink-0 p-1.5 rounded-lg transition"
                    style={{ background: 'hsl(262 75% 55% / 0.2)', color: 'hsl(262 75% 65%)' }}
                  >
                    {saving === key
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Save className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <button
        onClick={fetchData}
        className="flex items-center gap-1 text-[10px] transition"
        style={{ color: 'hsl(0 0% 100% / 0.3)' }}
      >
        <RefreshCw className="h-3 w-3" /> Atualizar dados
      </button>
      </div>
      )}
    </div>
  );
};

export default AdminLandingEditor;
