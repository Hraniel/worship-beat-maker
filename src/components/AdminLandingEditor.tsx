import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Save, Loader2, Eye, EyeOff, RefreshCw, MonitorPlay, ChevronDown, ChevronUp } from 'lucide-react';
import AdminLandingFeaturesEditor from './AdminLandingFeaturesEditor';
import AdminImageBank from './AdminImageBank';
import LandingPreviewDrawer from './LandingPreviewDrawer';
import ImageCropperModal from './ImageCropperModal';

const LANDING_PREVIEW_URL = `${window.location.origin}/`;

interface ConfigRow {
  id: string;
  config_key: string;
  config_value: string;
}

type ActiveTab = 'navbar' | 'hero' | 'stats' | 'screenshots' | 'recursos' | 'loja' | 'steps' | 'planos' | 'cta' | 'footer' | 'midia';

const TABS: { id: ActiveTab; label: string; emoji: string }[] = [
  { id: 'navbar', label: 'Navbar', emoji: '🧭' },
  { id: 'hero', label: 'Hero', emoji: '🏠' },
  { id: 'stats', label: 'Stats', emoji: '📊' },
  { id: 'screenshots', label: 'Screenshots', emoji: '📱' },
  { id: 'recursos', label: 'Recursos', emoji: '⚡' },
  { id: 'loja', label: 'Loja', emoji: '🛒' },
  { id: 'steps', label: 'Passos', emoji: '📋' },
  { id: 'planos', label: 'Planos', emoji: '💳' },
  { id: 'cta', label: 'CTA', emoji: '🚀' },
  { id: 'footer', label: 'Footer', emoji: '📌' },
  { id: 'midia', label: 'Mídia', emoji: '🖼️' },
];

// ── Color helpers ────────────────────────────────────────────────────────────
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

const TEXT_SIZES = [
  { value: 'xs', label: 'XS' }, { value: 'sm', label: 'SM' }, { value: 'base', label: 'Base' },
  { value: 'lg', label: 'LG' }, { value: 'xl', label: 'XL' }, { value: '2xl', label: '2XL' },
  { value: '3xl', label: '3XL' }, { value: '4xl', label: '4XL' }, { value: '5xl', label: '5XL' },
  { value: '6xl', label: '6XL' }, { value: '7xl', label: '7XL' }, { value: '8xl', label: '8XL' },
];

const PADDING_OPTS = [
  { value: '0', label: '0px' }, { value: '8', label: '8px' }, { value: '16', label: '16px' },
  { value: '24', label: '24px' }, { value: '32', label: '32px' }, { value: '40', label: '40px' },
  { value: '48', label: '48px' }, { value: '56', label: '56px' }, { value: '64', label: '64px' },
  { value: '80', label: '80px' }, { value: '96', label: '96px' }, { value: '112', label: '112px' },
  { value: '128', label: '128px' },
];

const DEFAULT_CATS = [
  { name: 'Kick & Bumbo', emoji: '🥁' }, { name: 'Snare', emoji: '🪘' },
  { name: 'Hi-Hat & Pratos', emoji: '🎵' }, { name: 'Loops', emoji: '🔁' },
  { name: 'Continuous Pads', emoji: '🎹' }, { name: 'Efeitos', emoji: '✨' },
];

// ── Image upload field ───────────────────────────────────────────────────────
const ImageUploadField: React.FC<{
  keyPrefix: string; label: string; hint: string; value: string;
  onChange: (v: string) => void; onSave: () => void; saving: boolean;
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
    } catch (e: any) { toast.error(e.message || 'Erro ao enviar imagem'); }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-1.5">
      <ImageCropperModal open={cropperOpen} file={pendingFile} aspectRatio={aspectRatio} title={label}
        onSave={(f) => { setCropperOpen(false); setPendingFile(null); doUpload(f); }}
        onCancel={() => { setCropperOpen(false); setPendingFile(null); }} />
      <label className="text-[10px] font-medium uppercase tracking-wider block" style={{ color: 'hsl(0 0% 100% / 0.4)' }}>{label}</label>
      <p className="text-[9px]" style={{ color: 'hsl(262 75% 65%)' }}>📐 {hint}</p>
      <div className="flex gap-2">
        <input type="text" value={value} onChange={e => onChange(e.target.value)} onBlur={onSave}
          placeholder="URL da imagem..." className="flex-1 h-8 px-2.5 text-xs rounded-lg focus:outline-none"
          style={{ border: '1px solid hsl(0 0% 100% / 0.1)', background: 'hsl(0 0% 100% / 0.05)', color: 'hsl(0 0% 100%)' }} />
        <button onClick={() => inputRef.current?.click()} disabled={uploading}
          className="shrink-0 px-2.5 h-8 rounded-lg text-xs flex items-center gap-1 transition"
          style={{ background: 'hsl(262 75% 55% / 0.2)', color: 'hsl(262 75% 65%)' }}>
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : '↑'} Upload
        </button>
      </div>
      {value && <img src={value} alt="" className="w-full h-16 object-cover rounded-lg mt-1" style={{ border: '1px solid hsl(0 0% 100% / 0.1)' }} />}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) { setPendingFile(f); setCropperOpen(true); } e.target.value = ''; }} />
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────
const AdminLandingEditor: React.FC = () => {
  const [rows, setRows] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('hero');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [openStyle, setOpenStyle] = useState(false);

  const rowsRef = React.useRef(rows);
  React.useEffect(() => { rowsRef.current = rows; }, [rows]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('landing_config').select('*').order('config_key');
      if (data) setRows(data as ConfigRow[]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const getVal = (key: string) => rows.find(r => r.config_key === key)?.config_value ?? '';
  const setVal = (key: string, value: string) => {
    setRows(prev => {
      const exists = prev.some(r => r.config_key === key);
      const next = exists
        ? prev.map(r => r.config_key === key ? { ...r, config_value: value } : r)
        : [...prev, { id: '', config_key: key, config_value: value }];
      rowsRef.current = next;
      return next;
    });
  };

  const saveKey = async (key: string, overrideValue?: string) => {
    const value = overrideValue !== undefined ? overrideValue : (rowsRef.current.find(r => r.config_key === key)?.config_value ?? '');
    setSaving(key);
    try {
      const { data: existing } = await supabase.from('landing_config').select('id').eq('config_key', key).maybeSingle();
      if (existing) await supabase.from('landing_config').update({ config_value: value }).eq('config_key', key);
      else await supabase.from('landing_config').insert({ config_key: key, config_value: value });
    } catch (e: any) { toast.error(e.message || 'Erro ao salvar'); }
    finally { setSaving(null); }
  };

  const saveKeyAndToast = async (key: string) => { await saveKey(key); toast.success('Salvo!'); };

  const forceCacheRefresh = async () => {
    const ts = Date.now().toString();
    setVal('app_cache_version', ts);
    setSaving('app_cache_version');
    try {
      const existing = rows.find(r => r.config_key === 'app_cache_version');
      if (existing?.id) await supabase.from('landing_config').update({ config_value: ts }).eq('config_key', 'app_cache_version');
      else await supabase.from('landing_config').insert({ config_key: 'app_cache_version', config_value: ts });
      toast.success('Cache forçado!');
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'hsl(262 75% 65%)' }} />
    </div>
  );

  // ── Shared styles ──────────────────────────────────────────────────────────
  const inputStyle = { border: '1px solid hsl(0 0% 100% / 0.1)', background: 'hsl(0 0% 100% / 0.05)', color: 'hsl(0 0% 100%)' };
  const groupStyle = { border: '1px solid hsl(0 0% 100% / 0.08)', background: 'hsl(0 0% 100% / 0.02)' };
  const labelStyle = { color: 'hsl(262 75% 65%)' };
  const mutedStyle = { color: 'hsl(0 0% 100% / 0.4)' };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const renderTextField = (key: string, label: string, long = false, placeholder = '') => (
    <div key={key}>
      <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={mutedStyle}>{label}</label>
      <div className="flex gap-2">
        {long ? (
          <textarea className="flex-1 px-2.5 py-1.5 text-xs rounded-lg resize-none focus:outline-none"
            style={{ ...inputStyle, minHeight: '60px' }}
            value={getVal(key)} onChange={e => setVal(key, e.target.value)} onBlur={() => saveKey(key)} placeholder={placeholder} />
        ) : (
          <input className="flex-1 h-8 px-2.5 text-xs rounded-lg focus:outline-none" style={inputStyle}
            value={getVal(key)} onChange={e => setVal(key, e.target.value)} onBlur={() => saveKey(key)} placeholder={placeholder} />
        )}
        <button onClick={() => saveKeyAndToast(key)} disabled={saving === key}
          className="shrink-0 p-1.5 rounded-lg transition" style={{ background: 'hsl(262 75% 55% / 0.2)', color: 'hsl(262 75% 65%)' }}>
          {saving === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );

  const renderColorField = (key: string, label: string, hint?: string) => (
    <div key={key}>
      <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={mutedStyle}>{label}</label>
      <ColorFieldInline value={getVal(key)} onChange={v => setVal(key, v)} onBlur={() => saveKey(key)} hint={hint} />
    </div>
  );

  const renderSelectField = (key: string, label: string, options: { value: string; label: string }[]) => (
    <div key={key}>
      <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={mutedStyle}>{label}</label>
      <select className="w-full h-8 px-2.5 text-xs rounded-lg focus:outline-none" style={inputStyle}
        value={getVal(key)} onChange={e => { setVal(key, e.target.value); saveKey(key); }}>
        {options.map(o => <option key={o.value} value={o.value} style={{ background: 'hsl(220 15% 12%)' }}>{o.label}</option>)}
      </select>
    </div>
  );

  const renderPaddingFields = (prefix: string) => (
    <div className="grid grid-cols-2 gap-3">
      {renderSelectField(`${prefix}_pt`, 'Padding Top', PADDING_OPTS)}
      {renderSelectField(`${prefix}_pb`, 'Padding Bottom', PADDING_OPTS)}
    </div>
  );

  const renderVideoBlock = (prefix: string, label: string, hint: string) => (
    <div className="rounded-xl p-4 space-y-4" style={groupStyle}>
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>🎬 Vídeo de Fundo — {label}</p>
      <p className="text-[9px]" style={mutedStyle}>Resolução: <strong>{hint}</strong>, MP4/WebM, máx 15MB, sem áudio, loop 5–15s.</p>
      <div>
        <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={mutedStyle}>URL do Vídeo</label>
        <div className="flex gap-2">
          <input className="flex-1 h-8 px-2.5 text-xs rounded-lg focus:outline-none" style={inputStyle}
            value={getVal(`${prefix}_url`)} onChange={e => setVal(`${prefix}_url`, e.target.value)}
            onBlur={() => saveKey(`${prefix}_url`)} placeholder="https://..." />
          <button onClick={() => {
            const input = document.createElement('input');
            input.type = 'file'; input.accept = 'video/mp4,video/webm';
            input.onchange = async (e: any) => {
              const file = e.target?.files?.[0]; if (!file) return;
              if (file.size > 15 * 1024 * 1024) { toast.error('Vídeo muito grande (máx 15MB)'); return; }
              setSaving(`${prefix}_url`);
              try {
                const ext = file.name.split('.').pop() || 'mp4';
                const path = `landing/${prefix}-${Date.now()}.${ext}`;
                const { error } = await supabase.storage.from('landing-assets').upload(path, file, { upsert: true });
                if (error) throw error;
                const { data } = supabase.storage.from('landing-assets').getPublicUrl(path);
                setVal(`${prefix}_url`, data.publicUrl); await saveKey(`${prefix}_url`);
                toast.success('Vídeo enviado!');
              } catch (err: any) { toast.error(err.message); } finally { setSaving(null); }
            };
            input.click();
          }} disabled={saving === `${prefix}_url`}
            className="shrink-0 px-2.5 h-8 rounded-lg text-xs flex items-center gap-1 transition"
            style={{ background: 'hsl(262 75% 55% / 0.2)', color: 'hsl(262 75% 65%)' }}>
            {saving === `${prefix}_url` ? <Loader2 className="h-3 w-3 animate-spin" /> : '↑'} Upload
          </button>
        </div>
      </div>
      {getVal(`${prefix}_url`) && (
        <div className="space-y-2">
          <video src={getVal(`${prefix}_url`)} className="w-full h-24 object-cover rounded-lg" style={{ border: '1px solid hsl(0 0% 100% / 0.1)' }}
            autoPlay muted loop playsInline />
          <button onClick={() => { setVal(`${prefix}_url`, ''); saveKey(`${prefix}_url`, ''); }}
            className="text-[10px] px-2 py-1 rounded-lg transition"
            style={{ background: 'hsl(0 70% 50% / 0.15)', color: 'hsl(0 70% 60%)' }}>Remover vídeo</button>
        </div>
      )}
      <div>
        <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={mutedStyle}>
          Opacidade: {Math.round(parseFloat(getVal(`${prefix}_opacity`) || '0.15') * 100)}%
        </label>
        <input type="range" min={0} max={1} step={0.05}
          value={parseFloat(getVal(`${prefix}_opacity`) || '0.15')}
          onChange={e => setVal(`${prefix}_opacity`, e.target.value)}
          onMouseUp={() => saveKey(`${prefix}_opacity`)} onTouchEnd={() => saveKey(`${prefix}_opacity`)}
          className="w-full h-1.5 rounded-full accent-violet-500" />
      </div>
      {renderSelectField(`${prefix}_fit`, 'Enquadramento', [
        { value: 'cover', label: 'Cover' }, { value: 'contain', label: 'Contain' }, { value: 'fill', label: 'Fill' },
      ])}
    </div>
  );

  const renderStyleCollapsible = (children: React.ReactNode) => (
    <div className="rounded-xl overflow-hidden" style={groupStyle}>
      <button onClick={() => setOpenStyle(!openStyle)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold"
        style={{ color: 'hsl(262 75% 75%)' }}>
        🎨 Estilos da Seção
        {openStyle ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {openStyle && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <LandingPreviewDrawer open={previewOpen} onClose={() => setPreviewOpen(false)} previewUrl={LANDING_PREVIEW_URL} />

      {/* Tab bar */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 overflow-x-auto gap-0.5 bg-white/5 rounded-lg p-0.5 scrollbar-hide">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setOpenStyle(false); }}
              className={`shrink-0 h-7 px-2.5 flex items-center gap-1 rounded-md text-[11px] font-medium transition-colors ${
                activeTab === tab.id ? 'bg-violet-600 text-white shadow-sm' : 'text-white/50 hover:text-white'
              }`}>
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>
        <button onClick={() => setPreviewOpen(true)}
          className="shrink-0 flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-medium transition-all"
          style={{ background: 'hsl(262 75% 55% / 0.15)', color: 'hsl(262 75% 70%)', border: '1px solid hsl(262 75% 55% / 0.3)' }}>
          <MonitorPlay className="h-3.5 w-3.5" /> Preview
        </button>
      </div>

      {/* ── NAVBAR ── */}
      {activeTab === 'navbar' && (
        <div className="space-y-4">
          {/* Announcement */}
          <div className="rounded-xl p-4 space-y-3" style={groupStyle}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>📢 Barra de Anúncio</p>
              <Switch checked={getVal('announcement_enabled') === 'true'}
                onCheckedChange={v => { setVal('announcement_enabled', v ? 'true' : 'false'); saveKey('announcement_enabled'); }} />
            </div>
            {renderTextField('announcement_text', 'Texto', false, '🎉 Novidade!')}
            {renderTextField('announcement_link', 'Link', false, '/auth?mode=signup')}
            {renderTextField('announcement_link_label', 'Rótulo do Link', false, 'Saiba mais →')}
            {renderColorField('announcement_bg', 'Cor de Fundo')}
            {renderColorField('announcement_color', 'Cor do Texto')}
          </div>

          {/* Nav links */}
          <div className="rounded-xl p-4 space-y-3" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Links de Navegação</p>
            {[0, 1, 2].map(i => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] uppercase tracking-wider block mb-1" style={mutedStyle}>Rótulo {i + 1}</label>
                  <input className="w-full h-7 px-2 text-xs rounded-lg focus:outline-none" style={inputStyle}
                    value={getVal(`nav_link_${i}_label`)} onChange={e => setVal(`nav_link_${i}_label`, e.target.value)}
                    onBlur={() => saveKey(`nav_link_${i}_label`)} placeholder={['Recursos', 'Sons', 'Planos'][i]} />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-wider block mb-1" style={mutedStyle}>Href {i + 1}</label>
                  <input className="w-full h-7 px-2 text-xs rounded-lg focus:outline-none" style={inputStyle}
                    value={getVal(`nav_link_${i}_href`)} onChange={e => setVal(`nav_link_${i}_href`, e.target.value)}
                    onBlur={() => saveKey(`nav_link_${i}_href`)} placeholder={['#recursos', '#sons', '#planos'][i]} />
                </div>
              </div>
            ))}
          </div>

          {/* Nav buttons */}
          <div className="rounded-xl p-4 space-y-3" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Botões</p>
            {renderTextField('nav_btn_login_label', 'Rótulo "Entrar"', false, 'Entrar')}
            {renderTextField('nav_btn_signup_label', 'Rótulo "Criar Conta"', false, 'Começar grátis')}
          </div>

          {/* Nav styles */}
          {renderStyleCollapsible(<>
            {renderColorField('nav_bg', 'Fundo da Navbar', 'Suporta transparência')}
            {renderColorField('nav_border_color', 'Cor da Borda')}
            {renderColorField('nav_link_color', 'Cor dos Links')}
            {renderColorField('nav_link_hover_color', 'Cor Hover dos Links')}
            {renderColorField('nav_btn_login_bg', 'Fundo Botão Entrar')}
            {renderColorField('nav_btn_login_color', 'Cor Texto Entrar')}
            {renderColorField('nav_btn_signup_bg', 'Fundo Botão Criar Conta')}
            {renderColorField('nav_btn_signup_color', 'Cor Texto Criar Conta')}
          </>)}
        </div>
      )}

      {/* ── HERO ── */}
      {activeTab === 'hero' && (
        <div className="space-y-4">
          <div className="rounded-xl p-4 space-y-3" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Conteúdo</p>
            {renderTextField('hero_badge', 'Badge')}
            {renderTextField('hero_title', 'Título Principal', true)}
            {renderTextField('hero_subtitle', 'Subtítulo', true)}
          </div>

          {renderStyleCollapsible(<>
            {renderColorField('hero_bg', 'Fundo da Seção')}
            {renderColorField('hero_title_color', 'Cor do Título')}
            {renderColorField('hero_subtitle_color', 'Cor do Subtítulo')}
            {renderColorField('hero_badge_bg', 'Fundo do Badge', 'Suporta transparência')}
            {renderColorField('hero_badge_color', 'Cor do Badge')}
            {renderSelectField('hero_title_size', 'Tamanho do Título', TEXT_SIZES)}
            {renderPaddingFields('hero')}
          </>)}

          {renderVideoBlock('hero_video', 'Hero', '1920×1080px')}
        </div>
      )}

      {/* ── STATS ── */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          <div className="rounded-xl p-4 space-y-4" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Estatísticas</p>
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="space-y-2 pb-3" style={{ borderBottom: n < 4 ? '1px solid hsl(0 0% 100% / 0.06)' : 'none' }}>
                <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(0 0% 100% / 0.5)' }}>Stat {n}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] uppercase tracking-wider block mb-1" style={mutedStyle}>Valor</label>
                    <input className="w-full h-7 px-2 text-xs rounded-lg focus:outline-none" style={inputStyle}
                      value={getVal(`stat_${n}_value`)} onChange={e => setVal(`stat_${n}_value`, e.target.value)}
                      onBlur={() => saveKey(`stat_${n}_value`)} placeholder="10k+" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-wider block mb-1" style={mutedStyle}>Rótulo</label>
                    <input className="w-full h-7 px-2 text-xs rounded-lg focus:outline-none" style={inputStyle}
                      value={getVal(`stat_${n}_label`)} onChange={e => setVal(`stat_${n}_label`, e.target.value)}
                      onBlur={() => saveKey(`stat_${n}_label`)} placeholder="Usuários" />
                  </div>
                </div>
                <ImageUploadField keyPrefix={`stat_${n}_image`} label="Imagem (opcional)" hint="120×120px PNG transparente"
                  value={getVal(`stat_${n}_image`)} onChange={v => setVal(`stat_${n}_image`, v)}
                  onSave={() => saveKey(`stat_${n}_image`)} saving={saving === `stat_${n}_image`} aspectRatio="1:1" />
              </div>
            ))}
          </div>

          {renderStyleCollapsible(<>
            {renderColorField('stats_bg', 'Fundo da Seção')}
            {renderColorField('stats_value_color', 'Cor dos Números')}
            {renderColorField('stats_label_color', 'Cor dos Rótulos', 'Suporta transparência')}
            {renderPaddingFields('stats')}
          </>)}

          {renderVideoBlock('stats_video', 'Estatísticas', '1920×400px')}
        </div>
      )}

      {/* ── SCREENSHOTS ── */}
      {activeTab === 'screenshots' && (
        <div className="space-y-4">
          <div className="rounded-xl p-4 space-y-4" style={groupStyle}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Seção Screenshots</p>
              <div className="flex items-center gap-2">
                {getVal('screenshots_enabled') !== 'false' ? <Eye className="h-3.5 w-3.5" style={{ color: 'hsl(142 70% 50%)' }} /> : <EyeOff className="h-3.5 w-3.5" style={{ color: 'hsl(0 0% 40%)' }} />}
                <Switch checked={getVal('screenshots_enabled') !== 'false'}
                  onCheckedChange={v => { setVal('screenshots_enabled', v ? 'true' : 'false'); saveKey('screenshots_enabled'); }} />
              </div>
            </div>
            {renderTextField('screenshots_title', 'Título', false, 'Tudo que você precisa')}
            {renderTextField('screenshots_subtitle', 'Subtítulo', true, 'Interface intuitiva...')}
          </div>

          {[1, 2, 3].map(n => (
            <div key={n} className="rounded-xl p-4 space-y-3" style={groupStyle}>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Screenshot {n}</p>
              {renderTextField(`screenshot_${n}_title`, 'Título')}
              {renderTextField(`screenshot_${n}_desc`, 'Descrição', true)}
              <ImageUploadField keyPrefix={`screenshot_${n}_image`} label="Imagem" hint="9:16 (400×711px)"
                value={getVal(`screenshot_${n}_image`)} onChange={v => setVal(`screenshot_${n}_image`, v)}
                onSave={() => saveKey(`screenshot_${n}_image`)} saving={saving === `screenshot_${n}_image`} aspectRatio="free" />
            </div>
          ))}

          {renderStyleCollapsible(<>
            {renderColorField('screenshots_bg', 'Fundo da Seção')}
            {renderColorField('screenshots_title_color', 'Cor do Título')}
            {renderColorField('screenshots_subtitle_color', 'Cor do Subtítulo')}
            {renderPaddingFields('screenshots')}
          </>)}

          {renderVideoBlock('screenshots_video', 'Screenshots', '1920×800px')}
        </div>
      )}

      {/* ── RECURSOS ── */}
      {activeTab === 'recursos' && (
        <div className="space-y-4">
          <div className="rounded-xl p-4 space-y-3" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Textos da Seção</p>
            {renderTextField('features_title', 'Título', false, 'Recursos')}
            {renderTextField('features_subtitle', 'Subtítulo', true)}
          </div>

          <AdminLandingFeaturesEditor />

          {renderStyleCollapsible(<>
            {renderColorField('features_bg', 'Fundo da Seção')}
            {renderColorField('features_card_bg', 'Fundo dos Cards')}
            {renderColorField('features_card_border', 'Borda dos Cards', 'Suporta transparência')}
            {renderColorField('features_title_color', 'Cor do Título da Seção')}
            {renderColorField('features_card_title_color', 'Cor do Título dos Cards')}
            {renderColorField('features_subtitle_color', 'Cor do Subtítulo')}
            {renderPaddingFields('features')}
          </>)}

          {renderVideoBlock('features_video', 'Recursos', '1920×800px')}
        </div>
      )}

      {/* ── LOJA ── */}
      {activeTab === 'loja' && (
        <div className="space-y-4">
          <div className="rounded-xl p-4 space-y-3" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Textos da Seção</p>
            {renderTextField('store_title', 'Título', false, 'Glory Store')}
            {renderTextField('store_subtitle', 'Subtítulo', true)}
          </div>

          <div className="rounded-xl p-4 space-y-4" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Imagem de Fundo</p>
            <ImageUploadField keyPrefix="store_bg_image" label="Fundo" hint="1920×600px JPEG"
              value={getVal('store_bg_image')} onChange={v => setVal('store_bg_image', v)}
              onSave={() => saveKey('store_bg_image')} saving={saving === 'store_bg_image'} aspectRatio="16:9" />
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={mutedStyle}>
                Transparência: {Math.round(parseFloat(getVal('store_bg_image_opacity') || '0.3') * 100)}%
              </label>
              <input type="range" min={0} max={1} step={0.05}
                value={parseFloat(getVal('store_bg_image_opacity') || '0.3')}
                onChange={e => setVal('store_bg_image_opacity', e.target.value)}
                onMouseUp={() => saveKey('store_bg_image_opacity')} onTouchEnd={() => saveKey('store_bg_image_opacity')}
                className="w-full h-1.5 rounded-full accent-violet-500" />
            </div>
          </div>

          {/* Category cards */}
          <div className="rounded-xl p-4 space-y-4" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Categorias (6 cards)</p>
            {DEFAULT_CATS.map((def, i) => (
              <div key={i} className="space-y-2 pb-3" style={{ borderBottom: i < 5 ? '1px solid hsl(0 0% 100% / 0.06)' : 'none' }}>
                <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(0 0% 100% / 0.5)' }}>{def.emoji} Card {i + 1}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] uppercase tracking-wider block mb-1" style={mutedStyle}>Título</label>
                    <input className="w-full h-7 px-2 text-xs rounded-lg focus:outline-none" style={inputStyle}
                      value={getVal(`store_cat_${i}_title`) || def.name}
                      onChange={e => setVal(`store_cat_${i}_title`, e.target.value)}
                      onBlur={() => saveKey(`store_cat_${i}_title`)} />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-wider block mb-1" style={mutedStyle}>Link</label>
                    <input className="w-full h-7 px-2 text-xs rounded-lg focus:outline-none" style={inputStyle}
                      value={getVal(`store_cat_${i}_link`)} onChange={e => setVal(`store_cat_${i}_link`, e.target.value)}
                      onBlur={() => saveKey(`store_cat_${i}_link`)} placeholder="/auth?mode=signup" />
                  </div>
                </div>
                <ImageUploadField keyPrefix={`store_cat_${i}_image`} label="Imagem" hint="400×400px"
                  value={getVal(`store_cat_${i}_image`)} onChange={v => setVal(`store_cat_${i}_image`, v)}
                  onSave={() => saveKey(`store_cat_${i}_image`)} saving={saving === `store_cat_${i}_image`} aspectRatio="1:1" />
              </div>
            ))}
          </div>

          {renderStyleCollapsible(<>
            {renderColorField('store_bg', 'Fundo da Seção')}
            {renderColorField('store_title_color', 'Cor do Título')}
            {renderColorField('store_subtitle_color', 'Cor do Subtítulo', 'Suporta transparência')}
            {renderPaddingFields('store')}
          </>)}

          {renderVideoBlock('store_video', 'Loja', '1920×600px')}
        </div>
      )}

      {/* ── STEPS (Como Funciona) ── */}
      {activeTab === 'steps' && (
        <div className="space-y-4">
          <div className="rounded-xl p-4 space-y-3" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Como Funciona</p>
            {renderTextField('how_main_title', 'Título da Seção', true, 'Do ensaio ao culto em 3 passos')}
            {[1, 2, 3].map(n => (
              <div key={n} className="space-y-2 pb-3" style={{ borderBottom: n < 3 ? '1px solid hsl(0 0% 100% / 0.06)' : 'none' }}>
                <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(0 0% 100% / 0.5)' }}>Passo {n}</p>
                {renderTextField(`how_step_${n}_title`, 'Título')}
                {renderTextField(`how_step_${n}_desc`, 'Descrição', true)}
              </div>
            ))}
          </div>

          {renderStyleCollapsible(<>
            {renderColorField('howitworks_bg', 'Fundo da Seção')}
            {renderColorField('howitworks_title_color', 'Cor do Título')}
            {renderColorField('howitworks_step_color', 'Cor do Número', 'Suporta transparência')}
            {renderColorField('howitworks_item_title_color', 'Cor do Título do Passo')}
            {renderColorField('howitworks_item_desc_color', 'Cor da Descrição')}
            {renderPaddingFields('howitworks')}
          </>)}

          {renderVideoBlock('howitworks_video', 'Como Funciona', '1920×600px')}
        </div>
      )}

      {/* ── PLANOS ── */}
      {activeTab === 'planos' && (
        <div className="space-y-4">
          <div className="rounded-xl p-4 space-y-3" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Seção Planos</p>
            {renderTextField('plans_title', 'Título')}
            {renderTextField('plans_subtitle', 'Subtítulo', true)}
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-xs" style={{ color: 'hsl(0 0% 100% / 0.8)' }}>Mostrar preços</p>
                <p className="text-[10px]" style={mutedStyle}>Visibilidade da seção de preços</p>
              </div>
              <div className="flex items-center gap-2">
                {getVal('show_pricing') === 'true' ? <Eye className="h-3.5 w-3.5" style={{ color: 'hsl(142 70% 50%)' }} /> : <EyeOff className="h-3.5 w-3.5" style={{ color: 'hsl(0 0% 40%)' }} />}
                <Switch checked={getVal('show_pricing') === 'true'}
                  onCheckedChange={v => { setVal('show_pricing', v ? 'true' : 'false'); saveKey('show_pricing'); toast.success(v ? 'Preços visíveis' : 'Preços ocultos'); }} />
              </div>
            </div>
          </div>

          {renderStyleCollapsible(<>
            {renderColorField('pricing_bg', 'Fundo da Seção')}
            {renderColorField('pricing_title_color', 'Cor do Título')}
            {renderColorField('pricing_subtitle_color', 'Cor do Subtítulo', 'Suporta transparência')}
            {renderPaddingFields('pricing')}
          </>)}

          {renderVideoBlock('pricing_video', 'Planos', '1920×800px')}
        </div>
      )}

      {/* ── CTA ── */}
      {activeTab === 'cta' && (
        <div className="space-y-4">
          <div className="rounded-xl p-4 space-y-3" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>CTA Final</p>
            {renderTextField('cta_title', 'Título')}
            {renderTextField('cta_subtitle', 'Subtítulo', true)}
            {renderTextField('cta_button_label', 'Texto do Botão', false, 'Começar agora — é grátis')}
            {renderTextField('cta_button_link', 'Link do Botão', false, '/auth?mode=signup')}
          </div>

          {renderStyleCollapsible(<>
            {renderColorField('cta_bg', 'Fundo da Seção')}
            {renderColorField('cta_card_bg', 'Fundo do Card')}
            {renderColorField('cta_title_color', 'Cor do Título')}
            {renderColorField('cta_subtitle_color', 'Cor do Subtítulo')}
            {renderPaddingFields('cta')}
          </>)}

          {renderVideoBlock('cta_video', 'CTA Final', '1920×500px')}
        </div>
      )}

      {/* ── FOOTER ── */}
      {activeTab === 'footer' && (
        <div className="space-y-4">
          <div className="rounded-xl p-4 space-y-3" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Textos do Rodapé</p>
            {renderTextField('footer_tagline', 'Tagline', true, 'A ferramenta definitiva para músicos de louvor...')}
            {renderTextField('footer_copyright', 'Nome Copyright', false, 'Glory Pads')}
            <div className="space-y-2 pt-1">
              <p className="text-[9px] font-semibold uppercase tracking-wider" style={mutedStyle}>Links do Rodapé</p>
              {[0, 1, 2].map(i => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] uppercase tracking-wider block mb-1" style={mutedStyle}>Rótulo {i+1}</label>
                    <input className="w-full h-7 px-2 text-xs rounded-lg focus:outline-none" style={inputStyle}
                      value={getVal(`footer_link_${i}_label`)} onChange={e => setVal(`footer_link_${i}_label`, e.target.value)}
                      onBlur={() => saveKey(`footer_link_${i}_label`)} placeholder={['Recursos', 'Planos', 'Glory Store'][i]} />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-wider block mb-1" style={mutedStyle}>Href {i+1}</label>
                    <input className="w-full h-7 px-2 text-xs rounded-lg focus:outline-none" style={inputStyle}
                      value={getVal(`footer_link_${i}_href`)} onChange={e => setVal(`footer_link_${i}_href`, e.target.value)}
                      onBlur={() => saveKey(`footer_link_${i}_href`)} placeholder={['#recursos', '#planos', '#sons'][i]} />
                  </div>
                </div>
              ))}
            </div>
            <ImageUploadField keyPrefix="footer_logo_url" label="Logo (opcional)" hint="40×40px SVG/PNG"
              value={getVal('footer_logo_url')} onChange={v => setVal('footer_logo_url', v)}
              onSave={() => saveKey('footer_logo_url')} saving={saving === 'footer_logo_url'} aspectRatio="1:1" />
          </div>

          {renderStyleCollapsible(<>
            {renderColorField('footer_bg', 'Fundo da Seção')}
            {renderColorField('footer_text_color', 'Cor do Texto', 'Suporta transparência')}
            {renderColorField('divider_dark_color', 'Cor dos Divisores', 'Cor das seções escuras')}
            {renderPaddingFields('footer')}
          </>)}

          {renderVideoBlock('footer_video', 'Rodapé', '1920×300px')}

          {/* Cache */}
          <div className="rounded-xl p-4 space-y-3" style={groupStyle}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Cache de Usuários</p>
            <p className="text-[9px]" style={mutedStyle}>Força atualização para todos os usuários.</p>
            <button onClick={forceCacheRefresh} disabled={saving === 'app_cache_version'}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition"
              style={{ background: 'hsl(0 75% 50% / 0.15)', color: 'hsl(0 75% 65%)', border: '1px solid hsl(0 75% 50% / 0.3)' }}>
              {saving === 'app_cache_version' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Forçar Atualização
            </button>
          </div>
        </div>
      )}

      {/* ── MÍDIA ── */}
      {activeTab === 'midia' && (
        <div className="rounded-xl p-4" style={groupStyle}>
          <AdminImageBank />
        </div>
      )}

      {/* Refresh data */}
      <button onClick={fetchData} className="flex items-center gap-1 text-[10px] transition" style={mutedStyle}>
        <RefreshCw className="h-3 w-3" /> Atualizar dados
      </button>
    </div>
  );
};

export default AdminLandingEditor;
