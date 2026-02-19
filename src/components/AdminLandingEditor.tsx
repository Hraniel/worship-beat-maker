import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Save, Loader2, Eye, EyeOff, RefreshCw, LayoutGrid, Type, MonitorPlay, Palette, Layout, ShoppingBag, Settings2, AlignLeft, NavigationIcon, Megaphone } from 'lucide-react';
import AdminLandingFeaturesEditor from './AdminLandingFeaturesEditor';
import AdminLandingStyleEditor from './AdminLandingStyleEditor';
import LandingPreviewDrawer from './LandingPreviewDrawer';
import ImageCropperModal from './ImageCropperModal';

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
  how_it_works_title: 'Título — Seção Como Funciona',
  how_it_works_subtitle: 'Subtítulo — Seção Como Funciona',
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
  { label: 'Seção Recursos', keys: ['features_title', 'features_subtitle'] },
  { label: 'Seção Loja', keys: ['store_title', 'store_subtitle'] },
  { label: 'Seção Planos', keys: ['plans_title', 'plans_subtitle', 'show_pricing'] },
  { label: 'CTA Final', keys: ['cta_title', 'cta_subtitle'] },
];

type ActiveTab = 'textos' | 'hero' | 'recursos' | 'estilos' | 'loja' | 'conteudo' | 'navbar';

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

// Default store categories
const DEFAULT_CATS = [
  { name: 'Kick & Bumbo', emoji: '🥁' },
  { name: 'Snare', emoji: '🪘' },
  { name: 'Hi-Hat & Pratos', emoji: '🎵' },
  { name: 'Loops', emoji: '🔁' },
  { name: 'Continuous Pads', emoji: '🎹' },
  { name: 'Efeitos', emoji: '✨' },
];

const ImageUploadField: React.FC<{
  keyPrefix: string;
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  aspectRatio?: '1:1' | '16:9' | 'free';
}> = ({ label, hint, value, onChange, onSave, saving, aspectRatio = 'free' }) => {
  const [uploading, setUploading] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const doUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `landing/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('landing-assets').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('landing-assets').getPublicUrl(path);
      onChange(data.publicUrl);
      onSave();
      toast.success('Imagem enviada!');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar imagem');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelected = (file: File) => {
    setPendingFile(file);
    setCropperOpen(true);
  };

  const handleCropSave = (croppedFile: File) => {
    setCropperOpen(false);
    setPendingFile(null);
    doUpload(croppedFile);
  };

  const handleCropCancel = () => {
    setCropperOpen(false);
    setPendingFile(null);
  };

  return (
    <div className="space-y-1.5">
      <ImageCropperModal
        open={cropperOpen}
        file={pendingFile}
        aspectRatio={aspectRatio}
        title={label}
        onSave={handleCropSave}
        onCancel={handleCropCancel}
      />
      <label className="text-[10px] font-medium uppercase tracking-wider block" style={{ color: 'hsl(0 0% 100% / 0.4)' }}>{label}</label>
      <p className="text-[9px]" style={{ color: 'hsl(262 75% 65%)' }}>📐 {hint}</p>
      <div className="flex gap-2">
        <input type="text" value={value} onChange={e => onChange(e.target.value)} onBlur={onSave}
          placeholder="URL da imagem..."
          className="flex-1 h-8 px-2.5 text-xs rounded-lg focus:outline-none"
          style={{ border: '1px solid hsl(0 0% 100% / 0.1)', background: 'hsl(0 0% 100% / 0.05)', color: 'hsl(0 0% 100%)' }} />
        <button onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 px-2.5 h-8 rounded-lg text-xs flex items-center gap-1 transition"
          style={{ background: 'hsl(262 75% 55% / 0.2)', color: 'hsl(262 75% 65%)' }}>
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : '↑'}
          Upload
        </button>
        {saving && <Loader2 className="h-4 w-4 animate-spin self-center" style={{ color: 'hsl(262 75% 65%)' }} />}
      </div>
      {value && <img src={value} alt="" className="w-full h-16 object-cover rounded-lg mt-1" style={{ border: '1px solid hsl(0 0% 100% / 0.1)' }} />}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); e.target.value = ''; }} />
    </div>
  );
};

// Keys per tab used for "Save all" feature
const TAB_KEYS: Record<string, string[]> = {
  navbar: [
    'announcement_enabled', 'announcement_text', 'announcement_link', 'announcement_link_label', 'announcement_bg', 'announcement_color',
    'nav_link_0_label', 'nav_link_0_href', 'nav_link_1_label', 'nav_link_1_href', 'nav_link_2_label', 'nav_link_2_href',
    'nav_btn_login_label', 'nav_btn_signup_label',
    'nav_bg', 'nav_border_color', 'nav_link_color', 'nav_link_hover_color',
    'nav_btn_login_bg', 'nav_btn_login_color', 'nav_btn_signup_bg', 'nav_btn_signup_color',
  ],
  hero: [
    'hero_badge', 'hero_title', 'hero_subtitle',
    'hero_bg', 'hero_title_color', 'hero_subtitle_color', 'hero_badge_bg', 'hero_badge_color',
    'hero_title_size', 'hero_pt', 'hero_pb',
  ],
  textos: [
    'features_title', 'features_subtitle', 'store_title', 'store_subtitle',
    'plans_title', 'plans_subtitle', 'show_pricing', 'cta_title', 'cta_subtitle',
  ],
  conteudo: [
    'how_main_title', 'how_step_1_title', 'how_step_1_desc', 'how_step_2_title', 'how_step_2_desc', 'how_step_3_title', 'how_step_3_desc',
    'footer_tagline', 'footer_copyright',
    'footer_link_0_label', 'footer_link_0_href', 'footer_link_1_label', 'footer_link_1_href', 'footer_link_2_label', 'footer_link_2_href',
    'stat_1_value', 'stat_1_label', 'stat_2_value', 'stat_2_label', 'stat_3_value', 'stat_3_label', 'stat_4_value', 'stat_4_label',
  ],
};

const AdminLandingEditor: React.FC = () => {
  const [rows, setRows] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
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
    setRows(prev => {
      const exists = prev.some(r => r.config_key === key);
      if (exists) return prev.map(r => r.config_key === key ? { ...r, config_value: value } : r);
      return [...prev, { id: '', config_key: key, config_value: value }];
    });
  };

  const saveKey = async (key: string) => {
    const value = rows.find(r => r.config_key === key)?.config_value ?? '';
    setSaving(key);
    try {
      // Upsert: try update first, then insert
      const { data: existing } = await supabase.from('landing_config').select('id').eq('config_key', key).maybeSingle();
      if (existing) {
        await supabase.from('landing_config').update({ config_value: value }).eq('config_key', key);
      } else {
        await supabase.from('landing_config').insert({ config_key: key, config_value: value });
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSaving(null);
    }
  };

  const saveKeyAndToast = async (key: string) => {
    await saveKey(key);
    toast.success('Salvo!');
  };

  const saveAllKeys = async () => {
    const keys = TAB_KEYS[activeTab];
    if (!keys) return;
    setSavingAll(true);
    try {
      await Promise.all(keys.map(k => saveKey(k)));
      toast.success('Todas as alterações salvas!');
    } catch {
      toast.error('Erro ao salvar algumas chaves');
    } finally {
      setSavingAll(false);
    }
  };

  const toggleShowPricing = async (v: boolean) => {
    setVal('show_pricing', v ? 'true' : 'false');
    setSaving('show_pricing');
    try {
      const existing = rows.find(r => r.config_key === 'show_pricing');
      if (existing?.id) {
        await supabase.from('landing_config').update({ config_value: v ? 'true' : 'false' }).eq('config_key', 'show_pricing');
      } else {
        await supabase.from('landing_config').insert({ config_key: 'show_pricing', config_value: v ? 'true' : 'false' });
      }
      toast.success(v ? 'Preços visíveis na landing' : 'Preços ocultos na landing');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(null);
    }
  };

  const forceCacheRefresh = async () => {
    const ts = Date.now().toString();
    setVal('app_cache_version', ts);
    setSaving('app_cache_version');
    try {
      const existing = rows.find(r => r.config_key === 'app_cache_version');
      if (existing?.id) {
        await supabase.from('landing_config').update({ config_value: ts }).eq('config_key', 'app_cache_version');
      } else {
        await supabase.from('landing_config').insert({ config_key: 'app_cache_version', config_value: ts });
      }
      toast.success('Cache forçado! Todos os usuários receberão atualização na próxima visita.');
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
    { id: 'navbar', label: 'Navbar', icon: <NavigationIcon className="h-3 w-3" /> },
    { id: 'recursos', label: 'Recursos', icon: <LayoutGrid className="h-3 w-3" /> },
    { id: 'loja', label: 'Loja', icon: <ShoppingBag className="h-3 w-3" /> },
    { id: 'conteudo', label: 'Conteúdo', icon: <AlignLeft className="h-3 w-3" /> },
    { id: 'estilos', label: 'Estilos', icon: <Palette className="h-3 w-3" /> },
  ];

  const renderTextField = (key: string, label: string, long = false, placeholder = '') => (
    <div key={key}>
      <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: 'hsl(0 0% 100% / 0.4)' }}>{label}</label>
      <div className="flex gap-2">
        {long ? (
          <textarea className="flex-1 px-2.5 py-1.5 text-xs rounded-lg resize-none focus:outline-none"
            style={{ border: '1px solid hsl(0 0% 100% / 0.1)', background: 'hsl(0 0% 100% / 0.05)', color: 'hsl(0 0% 100%)', minHeight: '60px' }}
            value={getVal(key)} onChange={e => setVal(key, e.target.value)} onBlur={() => saveKey(key)} placeholder={placeholder} />
        ) : (
          <input className="flex-1 h-8 px-2.5 text-xs rounded-lg focus:outline-none"
            style={{ border: '1px solid hsl(0 0% 100% / 0.1)', background: 'hsl(0 0% 100% / 0.05)', color: 'hsl(0 0% 100%)' }}
            value={getVal(key)} onChange={e => setVal(key, e.target.value)} onBlur={() => saveKey(key)} placeholder={placeholder} />
        )}
        <button onClick={() => saveKeyAndToast(key)} disabled={saving === key}
          className="shrink-0 p-1.5 rounded-lg transition" style={{ background: 'hsl(262 75% 55% / 0.2)', color: 'hsl(262 75% 65%)' }}>
          {saving === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );

  const inputStyle = { border: '1px solid hsl(0 0% 100% / 0.1)', background: 'hsl(0 0% 100% / 0.05)', color: 'hsl(0 0% 100%)' };
  const groupStyle = { border: '1px solid hsl(0 0% 100% / 0.08)', background: 'hsl(0 0% 100% / 0.02)' };
  const labelStyle = { color: 'hsl(262 75% 65%)' };
  const mutedStyle = { color: 'hsl(0 0% 100% / 0.4)' };

  return (
    <div className="space-y-4">
      <LandingPreviewDrawer open={previewOpen} onClose={() => setPreviewOpen(false)} previewUrl={LANDING_PREVIEW_URL} />

      {/* Header row: tabs + preview button */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 bg-white/5 rounded-lg p-0.5 gap-0.5 flex-wrap">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 h-7 flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors min-w-[60px] ${
                activeTab === tab.id ? 'bg-violet-600 text-white shadow-sm' : 'text-white/50 hover:text-white'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {TAB_KEYS[activeTab] && (
            <button onClick={saveAllKeys} disabled={savingAll}
              className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-semibold transition-all"
              style={{ background: 'hsl(142 70% 40% / 0.2)', color: 'hsl(142 70% 55%)', border: '1px solid hsl(142 70% 40% / 0.35)' }}
              title="Salvar todas as alterações desta aba">
              {savingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Salvar tudo</span>
            </button>
          )}
          <button onClick={() => setPreviewOpen(true)}
            className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-medium transition-all"
            style={{ background: 'hsl(262 75% 55% / 0.15)', color: 'hsl(262 75% 70%)', border: '1px solid hsl(262 75% 55% / 0.3)' }}
            title="Preview ao vivo da landing page">
            <MonitorPlay className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </button>
        </div>
      </div>

      {/* ── Recursos tab ── */}
      {activeTab === 'recursos' && <AdminLandingFeaturesEditor />}

      {/* ── Estilos tab ── */}
      {activeTab === 'estilos' && <AdminLandingStyleEditor />}

      {/* ── Navbar tab ── */}
      {activeTab === 'navbar' && (
        <div className="space-y-5">
          <p className="text-[11px]" style={mutedStyle}>Configure a barra de navegação e a barra de anúncio da landing page.</p>

          {/* Barra de Anúncio */}
          <div className="rounded-xl p-4 space-y-4" style={groupStyle}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5" style={labelStyle}>
                <Megaphone className="h-3 w-3" /> Barra de Anúncio
              </p>
              <div className="flex items-center gap-2">
                {getVal('announcement_enabled') === 'true'
                  ? <Eye className="h-3.5 w-3.5" style={{ color: 'hsl(142 70% 50%)' }} />
                  : <EyeOff className="h-3.5 w-3.5" style={{ color: 'hsl(0 0% 40%)' }} />}
                <Switch
                  checked={getVal('announcement_enabled') === 'true'}
                  onCheckedChange={v => { setVal('announcement_enabled', v ? 'true' : 'false'); saveKey('announcement_enabled'); }}
                />
              </div>
            </div>
            {renderTextField('announcement_text', 'Texto do Anúncio', false, 'Ex: 🎉 Novidade: Glory Pads 2.0 já disponível!')}
            {renderTextField('announcement_link', 'Link (opcional)', false, '/auth?mode=signup')}
            {renderTextField('announcement_link_label', 'Rótulo do Link (opcional)', false, 'Saiba mais →')}
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={mutedStyle}>Cor de Fundo</label>
              <ColorFieldInline value={getVal('announcement_bg') || 'hsl(262 75% 55%)'} onChange={v => setVal('announcement_bg', v)} onBlur={() => saveKey('announcement_bg')} />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={mutedStyle}>Cor do Texto</label>
              <ColorFieldInline value={getVal('announcement_color') || 'hsl(0 0% 100%)'} onChange={v => setVal('announcement_color', v)} onBlur={() => saveKey('announcement_color')} />
            </div>
          </div>

          {/* Links da Navbar */}
          <div className="rounded-xl p-4 space-y-3" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Links de Navegação</p>
            <p className="text-[9px]" style={mutedStyle}>Defina os 3 links que aparecem no menu. Use âncoras (#recursos) ou rotas (/pricing).</p>
            {[0, 1, 2].map(i => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] uppercase tracking-wider block mb-1" style={mutedStyle}>Rótulo {i + 1}</label>
                  <input className="w-full h-7 px-2 text-xs rounded-lg focus:outline-none" style={inputStyle}
                    value={getVal(`nav_link_${i}_label`)}
                    onChange={e => setVal(`nav_link_${i}_label`, e.target.value)}
                    onBlur={() => saveKey(`nav_link_${i}_label`)}
                    placeholder={['Recursos', 'Sons', 'Planos'][i]} />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-wider block mb-1" style={mutedStyle}>Href {i + 1}</label>
                  <input className="w-full h-7 px-2 text-xs rounded-lg focus:outline-none" style={inputStyle}
                    value={getVal(`nav_link_${i}_href`)}
                    onChange={e => setVal(`nav_link_${i}_href`, e.target.value)}
                    onBlur={() => saveKey(`nav_link_${i}_href`)}
                    placeholder={['#recursos', '#sons', '#planos'][i]} />
                </div>
              </div>
            ))}
          </div>

          {/* Botões da Navbar */}
          <div className="rounded-xl p-4 space-y-3" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Botões da Navbar</p>
            {renderTextField('nav_btn_login_label', 'Rótulo — Botão Entrar', false, 'Entrar')}
            {renderTextField('nav_btn_signup_label', 'Rótulo — Botão Criar Conta', false, 'Começar grátis')}
          </div>

          {/* Cores da Navbar */}
          {/* Cores da Navbar */}
          <div className="rounded-xl p-4 space-y-4" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Cores da Navbar</p>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={mutedStyle}>Cor de Fundo</label>
              <ColorFieldInline value={getVal('nav_bg') || 'hsl(0 0% 100% / 0.96)'} onChange={v => setVal('nav_bg', v)} onBlur={() => saveKey('nav_bg')} hint="Suporta transparência (ex: hsl(0 0% 100% / 0.96))" />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={mutedStyle}>Cor da Borda</label>
              <ColorFieldInline value={getVal('nav_border_color') || 'hsl(0 0% 0% / 0.08)'} onChange={v => setVal('nav_border_color', v)} onBlur={() => saveKey('nav_border_color')} />
            </div>
          </div>

          {/* Cores dos Links de Navegação */}
          <div className="rounded-xl p-4 space-y-4" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Cores dos Links de Navegação</p>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={mutedStyle}>Cor Normal</label>
              <ColorFieldInline value={getVal('nav_link_color') || 'hsl(220 15% 45%)'} onChange={v => setVal('nav_link_color', v)} onBlur={() => saveKey('nav_link_color')} />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={mutedStyle}>Cor Hover</label>
              <ColorFieldInline value={getVal('nav_link_hover_color') || 'hsl(220 15% 15%)'} onChange={v => setVal('nav_link_hover_color', v)} onBlur={() => saveKey('nav_link_hover_color')} />
            </div>
          </div>

          {/* Cores dos Botões */}
          <div className="rounded-xl p-4 space-y-4" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Cores dos Botões da Navbar</p>
            <p className="text-[9px]" style={mutedStyle}>Botão "Entrar" (secundário) e botão "Criar Conta" (principal).</p>
            <div className="space-y-3 pb-3" style={{ borderBottom: '1px solid hsl(0 0% 100% / 0.06)' }}>
              <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(0 0% 100% / 0.5)' }}>Botão "Entrar"</p>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={mutedStyle}>Cor de Fundo</label>
                <ColorFieldInline value={getVal('nav_btn_login_bg') || 'hsl(0 0% 0% / 0)'} onChange={v => setVal('nav_btn_login_bg', v)} onBlur={() => saveKey('nav_btn_login_bg')} hint="Use hsl(0 0% 0% / 0) para transparente" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={mutedStyle}>Cor do Texto</label>
                <ColorFieldInline value={getVal('nav_btn_login_color') || 'hsl(220 15% 30%)'} onChange={v => setVal('nav_btn_login_color', v)} onBlur={() => saveKey('nav_btn_login_color')} />
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(0 0% 100% / 0.5)' }}>Botão "Começar grátis"</p>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={mutedStyle}>Cor de Fundo</label>
                <ColorFieldInline value={getVal('nav_btn_signup_bg') || 'hsl(262 80% 55%)'} onChange={v => setVal('nav_btn_signup_bg', v)} onBlur={() => saveKey('nav_btn_signup_bg')} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={mutedStyle}>Cor do Texto</label>
                <ColorFieldInline value={getVal('nav_btn_signup_color') || 'hsl(0 0% 100%)'} onChange={v => setVal('nav_btn_signup_color', v)} onBlur={() => saveKey('nav_btn_signup_color')} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero tab ── */}
      {activeTab === 'hero' && (
        <div className="space-y-5">
          <p className="text-[11px]" style={mutedStyle}>Edite o conteúdo, cores e espaçamento da seção Hero.</p>
          <div className="rounded-xl p-4 space-y-3" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Conteúdo</p>
            {renderTextField('hero_badge', 'Texto do Badge')}
            {renderTextField('hero_title', 'Título Principal', true)}
            {renderTextField('hero_subtitle', 'Subtítulo', true)}
          </div>
          <div className="rounded-xl p-4 space-y-4" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Cores & Tipografia</p>
            {([
              { key: 'hero_bg', label: 'Cor de Fundo da Seção' },
              { key: 'hero_title_color', label: 'Cor do Título' },
              { key: 'hero_subtitle_color', label: 'Cor do Subtítulo' },
              { key: 'hero_badge_bg', label: 'Fundo do Badge', hint: 'Suporta transparência (ex: hsl(262 75% 55% / 0.06))' },
              { key: 'hero_badge_color', label: 'Cor do Texto do Badge' },
            ] as { key: string; label: string; hint?: string }[]).map(({ key, label, hint }) => (
              <div key={key}>
                <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={mutedStyle}>{label}</label>
                <ColorFieldInline value={getVal(key)} onChange={v => setVal(key, v)} onBlur={() => saveKey(key)} hint={hint} />
              </div>
            ))}
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={mutedStyle}>Tamanho do Título</label>
              <select className="w-full h-8 px-2.5 text-xs rounded-lg focus:outline-none" style={inputStyle}
                value={getVal('hero_title_size')}
                onChange={e => { setVal('hero_title_size', e.target.value); saveKey('hero_title_size'); }}>
                {TEXT_SIZES_HERO.map(o => <option key={o.value} value={o.value} style={{ background: 'hsl(220 15% 12%)' }}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="rounded-xl p-4 space-y-4" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Espaçamento</p>
            {([{ key: 'hero_pt', label: 'Padding Top' }, { key: 'hero_pb', label: 'Padding Bottom' }] as { key: string; label: string }[]).map(({ key, label }) => (
              <div key={key}>
                <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={mutedStyle}>{label}</label>
                <select className="w-full h-8 px-2.5 text-xs rounded-lg focus:outline-none" style={inputStyle}
                  value={getVal(key)} onChange={e => { setVal(key, e.target.value); saveKey(key); }}>
                  {PADDING_OPTS_HERO.map(o => <option key={o.value} value={o.value} style={{ background: 'hsl(220 15% 12%)' }}>{o.label}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Loja tab ── */}
      {activeTab === 'loja' && (
        <div className="space-y-5">
          <p className="text-[11px]" style={mutedStyle}>Configure a seção Glory Store: imagem de fundo, transparência e cards de categoria.</p>

          {/* Fundo */}
          <div className="rounded-xl p-4 space-y-4" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Fundo da Seção</p>
            <ImageUploadField
              keyPrefix="store_bg_image"
              label="Imagem de Fundo"
              hint="Tamanho sugerido: 1920×600px (JPEG, <500KB)"
              value={getVal('store_bg_image')}
              onChange={v => setVal('store_bg_image', v)}
              onSave={() => saveKey('store_bg_image')}
              saving={saving === 'store_bg_image'}
              aspectRatio="16:9"
            />
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={mutedStyle}>
                Transparência da Imagem: {Math.round(parseFloat(getVal('store_bg_image_opacity') || '0.3') * 100)}%
              </label>
              <input type="range" min={0} max={1} step={0.05}
                value={parseFloat(getVal('store_bg_image_opacity') || '0.3')}
                onChange={e => setVal('store_bg_image_opacity', e.target.value)}
                onMouseUp={() => saveKey('store_bg_image_opacity')}
                onTouchEnd={() => saveKey('store_bg_image_opacity')}
                className="w-full h-1.5 rounded-full accent-violet-500" />
            </div>
          </div>

          {/* Categorias */}
          <div className="rounded-xl p-4 space-y-5" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Categorias (6 cards)</p>
            {DEFAULT_CATS.map((def, i) => (
              <div key={i} className="space-y-2 pb-4" style={{ borderBottom: i < 5 ? '1px solid hsl(0 0% 100% / 0.06)' : 'none' }}>
                <p className="text-[10px] font-semibold" style={{ color: 'hsl(0 0% 100% / 0.6)' }}>Card {i + 1} — {getVal(`store_cat_${i}_name`) || def.name}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] uppercase tracking-wider block mb-1" style={mutedStyle}>Nome</label>
                    <input className="w-full h-7 px-2 text-xs rounded-lg focus:outline-none" style={inputStyle}
                      value={getVal(`store_cat_${i}_name`) || def.name}
                      onChange={e => setVal(`store_cat_${i}_name`, e.target.value)}
                      onBlur={() => saveKey(`store_cat_${i}_name`)} />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-wider block mb-1" style={mutedStyle}>Emoji</label>
                    <input className="w-full h-7 px-2 text-xs rounded-lg focus:outline-none" style={inputStyle}
                      value={getVal(`store_cat_${i}_emoji`) || def.emoji}
                      onChange={e => setVal(`store_cat_${i}_emoji`, e.target.value)}
                      onBlur={() => saveKey(`store_cat_${i}_emoji`)} />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-wider block mb-1" style={mutedStyle}>Link ao clicar (ex: /store/uuid)</label>
                  <input className="w-full h-7 px-2 text-xs rounded-lg focus:outline-none" style={inputStyle}
                    placeholder="/auth?mode=signup"
                    value={getVal(`store_cat_${i}_link`)}
                    onChange={e => setVal(`store_cat_${i}_link`, e.target.value)}
                    onBlur={() => saveKey(`store_cat_${i}_link`)} />
                </div>
                <ImageUploadField
                  keyPrefix={`store_cat_${i}_image`}
                  label="Imagem do Card"
                  hint="Tamanho sugerido: 400×400px (PNG/JPEG)"
                  value={getVal(`store_cat_${i}_image`)}
                  onChange={v => setVal(`store_cat_${i}_image`, v)}
                  onSave={() => saveKey(`store_cat_${i}_image`)}
                  saving={saving === `store_cat_${i}_image`}
                  aspectRatio="1:1"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Conteúdo tab: HowItWorks + Footer + Stats imagens + Cache ── */}
      {activeTab === 'conteudo' && (
        <div className="space-y-5">
          <p className="text-[11px]" style={mutedStyle}>Textos de "Como Funciona", Rodapé, imagens de Estatísticas e controle de cache.</p>

          {/* Como Funciona */}
          <div className="rounded-xl p-4 space-y-3" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Como Funciona</p>
            {renderTextField('how_main_title', 'Título da Seção', true, 'Do ensaio ao culto em 3 passos')}
            <div className="space-y-3 pt-1">
              {[1, 2, 3].map(n => (
                <div key={n} className="space-y-2 pb-3" style={{ borderBottom: n < 3 ? '1px solid hsl(0 0% 100% / 0.06)' : 'none' }}>
                  <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(0 0% 100% / 0.5)' }}>Passo {n}</p>
                  {renderTextField(`how_step_${n}_title`, 'Título', false, ['Crie sua Setlist', 'Configure os Sons', 'Toque ao Vivo'][n-1])}
                  {renderTextField(`how_step_${n}_desc`, 'Descrição', true)}
                </div>
              ))}
            </div>
          </div>

          {/* Footer textos */}
          <div className="rounded-xl p-4 space-y-3" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Rodapé — Textos</p>
            {renderTextField('footer_tagline', 'Tagline (descrição)', true, 'A ferramenta definitiva para músicos de louvor...')}
            {renderTextField('footer_copyright', 'Nome Copyright', false, 'Glory Pads')}
            <div className="space-y-2 pt-1">
              <p className="text-[9px] font-semibold uppercase tracking-wider" style={mutedStyle}>Links do Rodapé (3 links)</p>
              {[0, 1, 2].map(i => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] uppercase tracking-wider block mb-1" style={mutedStyle}>Rótulo {i+1}</label>
                    <input className="w-full h-7 px-2 text-xs rounded-lg focus:outline-none" style={inputStyle}
                      value={getVal(`footer_link_${i}_label`)}
                      onChange={e => setVal(`footer_link_${i}_label`, e.target.value)}
                      onBlur={() => saveKey(`footer_link_${i}_label`)}
                      placeholder={['Recursos', 'Planos', 'Glory Store'][i]} />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-wider block mb-1" style={mutedStyle}>Href {i+1}</label>
                    <input className="w-full h-7 px-2 text-xs rounded-lg focus:outline-none" style={inputStyle}
                      value={getVal(`footer_link_${i}_href`)}
                      onChange={e => setVal(`footer_link_${i}_href`, e.target.value)}
                      onBlur={() => saveKey(`footer_link_${i}_href`)}
                      placeholder={['#recursos', '#planos', '#sons'][i]} />
                  </div>
                </div>
              ))}
            </div>
            <ImageUploadField
              keyPrefix="footer_logo_url"
              label="Logo do Rodapé (opcional)"
              hint="Tamanho sugerido: 40×40px (SVG/PNG transparente)"
              value={getVal('footer_logo_url')}
              onChange={v => setVal('footer_logo_url', v)}
              onSave={() => saveKey('footer_logo_url')}
              saving={saving === 'footer_logo_url'}
              aspectRatio="1:1"
            />
          </div>

          {/* Stats — textos + imagens */}
          <div className="rounded-xl p-4 space-y-4" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Estatísticas</p>
            <p className="text-[9px]" style={mutedStyle}>Edite valor, rótulo e imagem de cada estatística. A imagem aparece acima do valor (40×40px).</p>
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="space-y-2 pb-4" style={{ borderBottom: n < 4 ? '1px solid hsl(0 0% 100% / 0.06)' : 'none' }}>
                <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(0 0% 100% / 0.5)' }}>Estatística {n}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] uppercase tracking-wider block mb-1" style={mutedStyle}>Valor</label>
                    <input className="w-full h-7 px-2 text-xs rounded-lg focus:outline-none" style={inputStyle}
                      value={getVal(`stat_${n}_value`)}
                      onChange={e => setVal(`stat_${n}_value`, e.target.value)}
                      onBlur={() => saveKey(`stat_${n}_value`)}
                      placeholder="Ex: 10k+" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-wider block mb-1" style={mutedStyle}>Rótulo</label>
                    <input className="w-full h-7 px-2 text-xs rounded-lg focus:outline-none" style={inputStyle}
                      value={getVal(`stat_${n}_label`)}
                      onChange={e => setVal(`stat_${n}_label`, e.target.value)}
                      onBlur={() => saveKey(`stat_${n}_label`)}
                      placeholder="Ex: Usuários ativos" />
                  </div>
                </div>
                <ImageUploadField
                  keyPrefix={`stat_${n}_image`}
                  label="Imagem (opcional)"
                  hint="Tamanho sugerido: 120×120px (PNG transparente)"
                  value={getVal(`stat_${n}_image`)}
                  onChange={v => setVal(`stat_${n}_image`, v)}
                  onSave={() => saveKey(`stat_${n}_image`)}
                  saving={saving === `stat_${n}_image`}
                  aspectRatio="1:1"
                />
              </div>
            ))}
          </div>

          {/* Force cache refresh */}
          <div className="rounded-xl p-4 space-y-3" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Cache de Usuários</p>
            <p className="text-[9px]" style={mutedStyle}>
              Ao clicar, todos os usuários receberão uma atualização forçada na próxima vez que abrirem o app. 
              Útil após atualizações importantes.
            </p>
            <button
              onClick={forceCacheRefresh}
              disabled={saving === 'app_cache_version'}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition"
              style={{ background: 'hsl(0 75% 50% / 0.15)', color: 'hsl(0 75% 65%)', border: '1px solid hsl(0 75% 50% / 0.3)' }}
            >
              {saving === 'app_cache_version' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Forçar Atualização de Cache
            </button>
            {getVal('app_cache_version') && (
              <p className="text-[9px]" style={{ color: 'hsl(0 0% 100% / 0.3)' }}>
                Versão atual: {new Date(parseInt(getVal('app_cache_version'))).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Textos tab ── */}
      {activeTab === 'textos' && (
        <div className="space-y-5">
          <p className="text-[11px]" style={mutedStyle}>Edite o conteúdo textual da landing page. As alterações ficam visíveis imediatamente.</p>

          {SECTION_GROUPS.map(group => (
            <div key={group.label} className="rounded-xl p-4 space-y-3" style={groupStyle}>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>{group.label}</p>
              {group.keys.map(key => {
                if (key === 'show_pricing') {
                  return (
                    <div key={key} className="flex items-center justify-between py-1">
                      <div>
                        <p className="text-xs" style={{ color: 'hsl(0 0% 100% / 0.8)' }}>{SECTION_LABELS[key]}</p>
                        <p className="text-[10px]" style={mutedStyle}>Controla a visibilidade da seção de preços</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {showPricing ? <Eye className="h-3.5 w-3.5" style={{ color: 'hsl(142 70% 50%)' }} /> : <EyeOff className="h-3.5 w-3.5" style={{ color: 'hsl(0 0% 40%)' }} />}
                        <Switch checked={showPricing} onCheckedChange={toggleShowPricing} />
                      </div>
                    </div>
                  );
                }
                const isLong = key.includes('subtitle') || key.includes('title');
                return (
                  <div key={key}>
                    <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={mutedStyle}>
                      {SECTION_LABELS[key] || key}
                    </label>
                    <div className="flex gap-2">
                      {isLong ? (
                        <textarea className="flex-1 px-2.5 py-1.5 text-xs rounded-lg resize-none focus:outline-none"
                          style={{ border: '1px solid hsl(0 0% 100% / 0.1)', background: 'hsl(0 0% 100% / 0.05)', color: 'hsl(0 0% 100%)', minHeight: '60px' }}
                          value={getVal(key)} onChange={e => setVal(key, e.target.value)} onBlur={() => saveKey(key)} />
                      ) : (
                        <input className="flex-1 h-8 px-2.5 text-xs rounded-lg focus:outline-none"
                          style={{ border: '1px solid hsl(0 0% 100% / 0.1)', background: 'hsl(0 0% 100% / 0.05)', color: 'hsl(0 0% 100%)' }}
                          value={getVal(key)} onChange={e => setVal(key, e.target.value)} onBlur={() => saveKey(key)} />
                      )}
                      <button onClick={() => saveKeyAndToast(key)} disabled={saving === key}
                        className="shrink-0 p-1.5 rounded-lg transition" style={{ background: 'hsl(262 75% 55% / 0.2)', color: 'hsl(262 75% 65%)' }}>
                        {saving === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          <button onClick={fetchData} className="flex items-center gap-1 text-[10px] transition" style={mutedStyle}>
            <RefreshCw className="h-3 w-3" /> Atualizar dados
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminLandingEditor;
