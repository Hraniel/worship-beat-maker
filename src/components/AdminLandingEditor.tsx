import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Save, Loader2, Eye, EyeOff, RefreshCw, LayoutGrid, Type, MonitorPlay, Palette, Layout } from 'lucide-react';
import AdminLandingFeaturesEditor from './AdminLandingFeaturesEditor';
import AdminLandingStyleEditor from './AdminLandingStyleEditor';
import LandingPreviewDrawer from './LandingPreviewDrawer';

const LANDING_PREVIEW_URL = `${window.location.origin}/`;

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
  { label: 'Estatísticas', keys: ['stat_1_value', 'stat_1_label', 'stat_2_value', 'stat_2_label', 'stat_3_value', 'stat_3_label', 'stat_4_value', 'stat_4_label'] },
  { label: 'Seção Recursos', keys: ['features_title', 'features_subtitle'] },
  { label: 'Seção Loja', keys: ['store_title', 'store_subtitle'] },
  { label: 'Seção Planos', keys: ['plans_title', 'plans_subtitle', 'show_pricing'] },
  { label: 'CTA Final', keys: ['cta_title', 'cta_subtitle'] },
];

type ActiveTab = 'textos' | 'hero' | 'recursos' | 'estilos';

// ── ColorField (inline, same logic as AdminLandingStyleEditor) ────────────────
const hslToHex = (hslStr: string): string => {
  try {
    const m = hslStr.match(/hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/);
    if (!m) return '#888888';
    const h = parseFloat(m[1]) / 360, s = parseFloat(m[2]) / 100, l = parseFloat(m[3]) / 100;
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
    const g = Math.round(hue2rgb(p, q, h) * 255);
    const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  } catch { return '#888888'; }
};

const hexToHsl = (hex: string, existingHsl: string): string => {
  const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch(max) { case r: h = ((g-b)/d+(g<b?6:0))/6; break; case g: h=((b-r)/d+2)/6; break; case b: h=((r-g)/d+4)/6; break; }
  }
  const hDeg=Math.round(h*360), sPct=Math.round(s*100), lPct=Math.round(l*100);
  const alphaMatch = existingHsl.match(/\/\s*([\d.]+)\s*\)/);
  if (alphaMatch) return `hsl(${hDeg} ${sPct}% ${lPct}% / ${alphaMatch[1]})`;
  return `hsl(${hDeg} ${sPct}% ${lPct}%)`;
};

const ColorFieldInline: React.FC<{ value: string; onChange: (v:string)=>void; onBlur: ()=>void; hint?: string }> = ({ value, onChange, onBlur, hint }) => (
  <div className="space-y-1">
    <div className="flex items-center gap-2">
      <input type="color" value={hslToHex(value)} onChange={e => onChange(hexToHsl(e.target.value, value))} onBlur={onBlur}
        className="h-8 w-8 rounded cursor-pointer border-0 p-0.5 shrink-0" style={{ background: 'transparent' }} />
      <input type="text" value={value} onChange={e => onChange(e.target.value)} onBlur={onBlur}
        className="flex-1 h-8 px-2.5 text-xs rounded-lg focus:outline-none font-mono"
        style={{ border: '1px solid hsl(0 0% 100% / 0.1)', background: 'hsl(0 0% 100% / 0.05)', color: 'hsl(0 0% 100%)' }}
        placeholder="hsl(H S% L%)" />
      <div className="h-8 w-8 rounded-lg shrink-0 border" style={{ background: value, borderColor: 'hsl(0 0% 100% / 0.1)' }} />
    </div>
    {hint && <p className="text-[10px]" style={{ color: 'hsl(0 0% 100% / 0.3)' }}>{hint}</p>}
  </div>
);

const TEXT_SIZES_HERO = [
  { value: 'xs', label: 'XS' }, { value: 'sm', label: 'SM' }, { value: 'base', label: 'Base' },
  { value: 'lg', label: 'LG' }, { value: 'xl', label: 'XL' }, { value: '2xl', label: '2XL' },
  { value: '3xl', label: '3XL' }, { value: '4xl', label: '4XL' }, { value: '5xl', label: '5XL' },
  { value: '6xl', label: '6XL' }, { value: '7xl', label: '7XL' }, { value: '8xl', label: '8XL' },
];

const PADDING_OPTS_HERO = [
  { value: '0', label: '0px' }, { value: '8', label: '8px' }, { value: '16', label: '16px' },
  { value: '24', label: '24px' }, { value: '32', label: '32px' }, { value: '40', label: '40px' },
  { value: '48', label: '48px' }, { value: '56', label: '56px' }, { value: '64', label: '64px' },
  { value: '80', label: '80px' }, { value: '96', label: '96px' }, { value: '112', label: '112px' },
  { value: '128', label: '128px' },
];

const AdminLandingEditor: React.FC = () => {
  const [rows, setRows] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('textos');
  const [previewOpen, setPreviewOpen] = useState(false);

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

  const TABS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'textos', label: 'Geral', icon: <Type className="h-3 w-3" /> },
    { id: 'hero', label: 'Hero', icon: <Layout className="h-3 w-3" /> },
    { id: 'recursos', label: 'Recursos', icon: <LayoutGrid className="h-3 w-3" /> },
    { id: 'estilos', label: 'Estilos', icon: <Palette className="h-3 w-3" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Preview Drawer */}
      <LandingPreviewDrawer
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        previewUrl={LANDING_PREVIEW_URL}
      />

      {/* Header row: tabs + preview button */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 bg-white/5 rounded-lg p-0.5 gap-0.5">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 h-7 flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === tab.id ? 'bg-violet-600 text-white shadow-sm' : 'text-white/50 hover:text-white'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Live preview button */}
        <button
          onClick={() => setPreviewOpen(true)}
          className="shrink-0 flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-medium transition-all"
          style={{
            background: 'hsl(262 75% 55% / 0.15)',
            color: 'hsl(262 75% 70%)',
            border: '1px solid hsl(262 75% 55% / 0.3)',
          }}
          title="Preview ao vivo da landing page"
        >
          <MonitorPlay className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Preview</span>
        </button>
      </div>

      {/* ── Recursos tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'recursos' && <AdminLandingFeaturesEditor />}

      {/* ── Estilos tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'estilos' && <AdminLandingStyleEditor />}

      {/* ── Hero tab ─────────────────────────────────────────────────────────── */}
      {activeTab === 'hero' && (
        <div className="space-y-5">
          <p className="text-[11px]" style={{ color: 'hsl(0 0% 100% / 0.4)' }}>
            Edite o conteúdo, cores e espaçamento da seção Hero. As alterações são salvas automaticamente.
          </p>

          {/* Grupo 1 — Conteúdo */}
          <div className="rounded-xl p-4 space-y-3" style={{ border: '1px solid hsl(0 0% 100% / 0.08)', background: 'hsl(0 0% 100% / 0.02)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(262 75% 65%)' }}>Conteúdo</p>
            {([
              { key: 'hero_badge', label: 'Texto do Badge', long: false },
              { key: 'hero_title', label: 'Título Principal', long: true },
              { key: 'hero_subtitle', label: 'Subtítulo', long: true },
            ] as { key: string; label: string; long: boolean }[]).map(({ key, label, long }) => (
              <div key={key}>
                <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'hsl(0 0% 100% / 0.4)' }}>{label}</label>
                <div className="flex gap-2">
                  {long ? (
                    <textarea className="flex-1 px-2.5 py-1.5 text-xs rounded-lg resize-none focus:outline-none"
                      style={{ border: '1px solid hsl(0 0% 100% / 0.1)', background: 'hsl(0 0% 100% / 0.05)', color: 'hsl(0 0% 100%)', minHeight: '60px' }}
                      value={getVal(key)} onChange={e => setVal(key, e.target.value)} onBlur={() => saveKey(key)} />
                  ) : (
                    <input className="flex-1 h-8 px-2.5 text-xs rounded-lg focus:outline-none"
                      style={{ border: '1px solid hsl(0 0% 100% / 0.1)', background: 'hsl(0 0% 100% / 0.05)', color: 'hsl(0 0% 100%)' }}
                      value={getVal(key)} onChange={e => setVal(key, e.target.value)} onBlur={() => saveKey(key)} />
                  )}
                  <button onClick={() => saveKey(key)} disabled={saving === key}
                    className="shrink-0 p-1.5 rounded-lg transition" style={{ background: 'hsl(262 75% 55% / 0.2)', color: 'hsl(262 75% 65%)' }}>
                    {saving === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Grupo 2 — Cores & Tipografia */}
          <div className="rounded-xl p-4 space-y-4" style={{ border: '1px solid hsl(0 0% 100% / 0.08)', background: 'hsl(0 0% 100% / 0.02)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(262 75% 65%)' }}>Cores & Tipografia</p>
            {([
              { key: 'hero_bg', label: 'Cor de Fundo da Seção' },
              { key: 'hero_title_color', label: 'Cor do Título' },
              { key: 'hero_subtitle_color', label: 'Cor do Subtítulo' },
              { key: 'hero_badge_bg', label: 'Fundo do Badge', hint: 'Suporta transparência (ex: hsl(262 75% 55% / 0.06))' },
              { key: 'hero_badge_color', label: 'Cor do Texto do Badge' },
            ] as { key: string; label: string; hint?: string }[]).map(({ key, label, hint }) => (
              <div key={key}>
                <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'hsl(0 0% 100% / 0.4)' }}>{label}</label>
                <ColorFieldInline value={getVal(key)} onChange={v => setVal(key, v)} onBlur={() => saveKey(key)} hint={hint} />
              </div>
            ))}
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'hsl(0 0% 100% / 0.4)' }}>Tamanho do Título</label>
              <select className="w-full h-8 px-2.5 text-xs rounded-lg focus:outline-none"
                style={{ border: '1px solid hsl(0 0% 100% / 0.1)', background: 'hsl(0 0% 100% / 0.05)', color: 'hsl(0 0% 100%)' }}
                value={getVal('hero_title_size')}
                onChange={e => { setVal('hero_title_size', e.target.value); saveKey('hero_title_size'); }}>
                {TEXT_SIZES_HERO.map(o => <option key={o.value} value={o.value} style={{ background: 'hsl(220 15% 12%)' }}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Grupo 3 — Espaçamento */}
          <div className="rounded-xl p-4 space-y-4" style={{ border: '1px solid hsl(0 0% 100% / 0.08)', background: 'hsl(0 0% 100% / 0.02)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(262 75% 65%)' }}>Espaçamento</p>
            {([
              { key: 'hero_pt', label: 'Padding Top' },
              { key: 'hero_pb', label: 'Padding Bottom' },
            ] as { key: string; label: string }[]).map(({ key, label }) => (
              <div key={key}>
                <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'hsl(0 0% 100% / 0.4)' }}>{label}</label>
                <select className="w-full h-8 px-2.5 text-xs rounded-lg focus:outline-none"
                  style={{ border: '1px solid hsl(0 0% 100% / 0.1)', background: 'hsl(0 0% 100% / 0.05)', color: 'hsl(0 0% 100%)' }}
                  value={getVal(key)}
                  onChange={e => { setVal(key, e.target.value); saveKey(key); }}>
                  {PADDING_OPTS_HERO.map(o => <option key={o.value} value={o.value} style={{ background: 'hsl(220 15% 12%)' }}>{o.label}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Textos tab ───────────────────────────────────────────────────────── */}
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
