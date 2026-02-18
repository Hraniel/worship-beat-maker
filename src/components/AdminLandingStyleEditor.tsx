import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Loader2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface ConfigRow { id: string; config_key: string; config_value: string; }

// ── Field definition ─────────────────────────────────────────────────────────
type FieldType = 'color' | 'select' | 'text' | 'range';
interface StyleField {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  min?: number; max?: number; step?: number;
  hint?: string;
}

// ── Section definitions ───────────────────────────────────────────────────────
interface StyleSection {
  id: string;
  label: string;
  emoji: string;
  fields: StyleField[];
}

const TEXT_SIZES = [
  { value: 'xs', label: 'XS (12px)' },
  { value: 'sm', label: 'SM (14px)' },
  { value: 'base', label: 'Base (16px)' },
  { value: 'lg', label: 'LG (18px)' },
  { value: 'xl', label: 'XL (20px)' },
  { value: '2xl', label: '2XL (24px)' },
  { value: '3xl', label: '3XL (30px)' },
  { value: '4xl', label: '4XL (36px)' },
  { value: '5xl', label: '5XL (48px)' },
  { value: '6xl', label: '6XL (60px)' },
  { value: '7xl', label: '7XL (72px)' },
  { value: '8xl', label: '8XL (96px)' },
];

const PADDING_OPTIONS = [
  { value: '0', label: '0px' },
  { value: '8', label: '8px (2)' },
  { value: '16', label: '16px (4)' },
  { value: '24', label: '24px (6)' },
  { value: '32', label: '32px (8)' },
  { value: '40', label: '40px (10)' },
  { value: '48', label: '48px (12)' },
  { value: '56', label: '56px (14)' },
  { value: '64', label: '64px (16)' },
  { value: '80', label: '80px (20)' },
  { value: '96', label: '96px (24)' },
  { value: '112', label: '112px (28)' },
  { value: '128', label: '128px (32)' },
];

const STYLE_SECTIONS: StyleSection[] = [
  {
    id: 'stats', label: 'Estatísticas', emoji: '📊',
    fields: [
      { key: 'stats_bg', label: 'Fundo', type: 'color' },
      { key: 'stats_value_color', label: 'Cor dos Números', type: 'color' },
      { key: 'stats_label_color', label: 'Cor dos Rótulos', type: 'color', hint: 'Suporta transparência (ex: hsl(0 0% 100% / 0.4))' },
      { key: 'stats_pt', label: 'Padding Top (px)', type: 'select', options: PADDING_OPTIONS },
      { key: 'stats_pb', label: 'Padding Bottom (px)', type: 'select', options: PADDING_OPTIONS },
    ],
  },
  {
    id: 'features', label: 'Seção Recursos', emoji: '⚡',
    fields: [
      { key: 'features_bg', label: 'Fundo da Seção', type: 'color' },
      { key: 'features_card_bg', label: 'Fundo dos Cards', type: 'color' },
      { key: 'features_card_border', label: 'Borda dos Cards', type: 'color', hint: 'Suporta transparência (ex: hsl(0 0% 0% / 0.07))' },
      { key: 'features_title_color', label: 'Cor do Título', type: 'color' },
      { key: 'features_subtitle_color', label: 'Cor do Subtítulo', type: 'color' },
      { key: 'features_pt', label: 'Padding Top (px)', type: 'select', options: PADDING_OPTIONS },
      { key: 'features_pb', label: 'Padding Bottom (px)', type: 'select', options: PADDING_OPTIONS },
    ],
  },
  {
    id: 'store', label: 'Glory Store', emoji: '🛒',
    fields: [
      { key: 'store_bg', label: 'Fundo', type: 'color' },
      { key: 'store_title_color', label: 'Cor do Título', type: 'color' },
      { key: 'store_subtitle_color', label: 'Cor do Subtítulo', type: 'color', hint: 'Suporta transparência' },
      { key: 'store_pt', label: 'Padding Top (px)', type: 'select', options: PADDING_OPTIONS },
      { key: 'store_pb', label: 'Padding Bottom (px)', type: 'select', options: PADDING_OPTIONS },
    ],
  },
  {
    id: 'howitworks', label: 'Como Funciona', emoji: '📋',
    fields: [
      { key: 'howitworks_bg', label: 'Fundo', type: 'color' },
      { key: 'howitworks_title_color', label: 'Cor do Título', type: 'color' },
      { key: 'howitworks_step_color', label: 'Cor do Número do Passo', type: 'color', hint: 'Suporta transparência (ex: hsl(0 0% 0% / 0.06))' },
      { key: 'howitworks_item_title_color', label: 'Cor do Título do Passo', type: 'color' },
      { key: 'howitworks_item_desc_color', label: 'Cor da Descrição do Passo', type: 'color' },
      { key: 'howitworks_pt', label: 'Padding Top (px)', type: 'select', options: PADDING_OPTIONS },
      { key: 'howitworks_pb', label: 'Padding Bottom (px)', type: 'select', options: PADDING_OPTIONS },
    ],
  },
  {
    id: 'pricing', label: 'Seção Planos', emoji: '💳',
    fields: [
      { key: 'pricing_bg', label: 'Fundo', type: 'color' },
      { key: 'pricing_title_color', label: 'Cor do Título', type: 'color' },
      { key: 'pricing_subtitle_color', label: 'Cor do Subtítulo', type: 'color', hint: 'Suporta transparência' },
      { key: 'pricing_pt', label: 'Padding Top (px)', type: 'select', options: PADDING_OPTIONS },
      { key: 'pricing_pb', label: 'Padding Bottom (px)', type: 'select', options: PADDING_OPTIONS },
    ],
  },
  {
    id: 'cta', label: 'CTA Final', emoji: '🚀',
    fields: [
      { key: 'cta_bg', label: 'Fundo da Seção', type: 'color' },
      { key: 'cta_card_bg', label: 'Fundo do Card', type: 'color' },
      { key: 'cta_title_color', label: 'Cor do Título', type: 'color' },
      { key: 'cta_subtitle_color', label: 'Cor do Subtítulo', type: 'color' },
      { key: 'cta_pt', label: 'Padding Top (px)', type: 'select', options: PADDING_OPTIONS },
      { key: 'cta_pb', label: 'Padding Bottom (px)', type: 'select', options: PADDING_OPTIONS },
    ],
  },
  {
    id: 'footer', label: 'Footer', emoji: '📌',
    fields: [
      { key: 'footer_bg', label: 'Fundo', type: 'color' },
      { key: 'footer_text_color', label: 'Cor do Texto', type: 'color', hint: 'Suporta transparência' },
      { key: 'footer_pt', label: 'Padding Top (px)', type: 'select', options: PADDING_OPTIONS },
      { key: 'footer_pb', label: 'Padding Bottom (px)', type: 'select', options: PADDING_OPTIONS },
    ],
  },
  {
    id: 'dividers', label: 'Divisores & Gradientes', emoji: '🎨',
    fields: [
      { key: 'divider_dark_color', label: 'Cor escura dos Divisores', type: 'color', hint: 'A cor das seções escuras (padrão: hsl(220 15% 7%))' },
    ],
  },
];

// ── HSL color input component ─────────────────────────────────────────────────
// Parses "hsl(H S% L%)" or "hsl(H S% L% / A)" and shows a native color input + text field
const ColorField: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  hint?: string;
}> = ({ value, onChange, onBlur, hint }) => {
  // Convert HSL string to hex for native input (approximate — ignores alpha)
  const hslToHex = (hslStr: string): string => {
    try {
      const m = hslStr.match(/hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/);
      if (!m) return '#888888';
      const h = parseFloat(m[1]) / 360;
      const s = parseFloat(m[2]) / 100;
      const l = parseFloat(m[3]) / 100;
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
      const g = Math.round(hue2rgb(p, q, h) * 255);
      const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    } catch {
      return '#888888';
    }
  };

  // Convert hex to HSL string (alpha preserved from existing value)
  const hexToHsl = (hex: string, existingHsl: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    const hDeg = Math.round(h * 360);
    const sPct = Math.round(s * 100);
    const lPct = Math.round(l * 100);
    // Preserve alpha if present
    const alphaMatch = existingHsl.match(/\/\s*([\d.]+)\s*\)/);
    if (alphaMatch) return `hsl(${hDeg} ${sPct}% ${lPct}% / ${alphaMatch[1]})`;
    return `hsl(${hDeg} ${sPct}% ${lPct}%)`;
  };

  const hex = hslToHex(value);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {/* Native color picker */}
        <input
          type="color"
          value={hex}
          onChange={e => onChange(hexToHsl(e.target.value, value))}
          onBlur={onBlur}
          className="h-8 w-8 rounded cursor-pointer border-0 p-0.5 shrink-0"
          style={{ background: 'transparent' }}
        />
        {/* Raw HSL text input */}
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          className="flex-1 h-8 px-2.5 text-xs rounded-lg focus:outline-none font-mono"
          style={{
            border: '1px solid hsl(0 0% 100% / 0.1)',
            background: 'hsl(0 0% 100% / 0.05)',
            color: 'hsl(0 0% 100%)',
          }}
          placeholder="hsl(H S% L%) ou hsl(H S% L% / 0.5)"
        />
        {/* Live preview swatch */}
        <div
          className="h-8 w-8 rounded-lg shrink-0 border"
          style={{ background: value, borderColor: 'hsl(0 0% 100% / 0.1)' }}
        />
      </div>
      {hint && <p className="text-[10px]" style={{ color: 'hsl(0 0% 100% / 0.3)' }}>{hint}</p>}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const AdminLandingStyleEditor: React.FC = () => {
  const [rows, setRows] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string | null>('stats');

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

  const getVal = (key: string): string => {
    return rows.find(r => r.config_key === key)?.config_value ?? '';
  };

  const setVal = (key: string, value: string) => {
    setRows(prev => {
      const exists = prev.some(r => r.config_key === key);
      if (exists) return prev.map(r => r.config_key === key ? { ...r, config_value: value } : r);
      return [...prev, { id: '', config_key: key, config_value: value }];
    });
  };

  const saveKey = async (key: string) => {
    const value = getVal(key);
    if (value === '') return;
    setSaving(key);
    try {
      // Try update first, then insert if no row matched
      const { error: updateErr, data: updateData } = await supabase
        .from('landing_config')
        .update({ config_value: value })
        .eq('config_key', key)
        .select('id');

      if (!updateErr && (!updateData || updateData.length === 0)) {
        // Row doesn't exist yet — insert
        await supabase.from('landing_config').insert({ config_key: key, config_value: value });
      } else if (updateErr) throw updateErr;

      toast.success('Salvo!');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSaving(null);
    }
  };

  const resetSection = async (section: StyleSection) => {
    if (!confirm(`Restaurar valores padrão da seção "${section.label}"?`)) return;
    // Define defaults
    const DEFAULTS: Record<string, string> = {
      hero_bg: 'hsl(0 0% 97%)',
      hero_title_color: 'hsl(220 15% 10%)',
      hero_title_size: '7xl',
      hero_subtitle_color: 'hsl(220 15% 40%)',
      hero_badge_bg: 'hsl(262 75% 55% / 0.06)',
      hero_badge_color: 'hsl(262 75% 55%)',
      hero_pt: '112', hero_pb: '80',
      stats_bg: 'hsl(220 15% 7%)',
      stats_value_color: 'hsl(0 0% 100%)',
      stats_label_color: 'hsl(0 0% 100% / 0.4)',
      stats_pt: '64', stats_pb: '64',
      features_bg: 'hsl(0 0% 97%)',
      features_card_bg: 'hsl(0 0% 100%)',
      features_card_border: 'hsl(0 0% 0% / 0.07)',
      features_title_color: 'hsl(220 15% 10%)',
      features_subtitle_color: 'hsl(220 15% 40%)',
      features_pt: '80', features_pb: '112',
      store_bg: 'hsl(220 15% 7%)',
      store_title_color: 'hsl(0 0% 100%)',
      store_subtitle_color: 'hsl(0 0% 100% / 0.45)',
      store_pt: '80', store_pb: '112',
      howitworks_bg: 'hsl(0 0% 97%)',
      howitworks_title_color: 'hsl(220 15% 10%)',
      howitworks_step_color: 'hsl(0 0% 0% / 0.06)',
      howitworks_item_title_color: 'hsl(220 15% 10%)',
      howitworks_item_desc_color: 'hsl(220 15% 40%)',
      howitworks_pt: '80', howitworks_pb: '112',
      pricing_bg: 'hsl(220 15% 7%)',
      pricing_title_color: 'hsl(0 0% 100%)',
      pricing_subtitle_color: 'hsl(0 0% 100% / 0.45)',
      pricing_pt: '80', pricing_pb: '112',
      cta_bg: 'hsl(0 0% 97%)',
      cta_card_bg: 'hsl(0 0% 100%)',
      cta_title_color: 'hsl(220 15% 10%)',
      cta_subtitle_color: 'hsl(220 15% 40%)',
      cta_pt: '80', cta_pb: '112',
      footer_bg: 'hsl(220 15% 5%)',
      footer_text_color: 'hsl(0 0% 100% / 0.35)',
      footer_pt: '40', footer_pb: '40',
      divider_dark_color: 'hsl(220 15% 7%)',
    };
    for (const field of section.fields) {
      const def = DEFAULTS[field.key];
      if (def) {
        setVal(field.key, def);
        await supabase.from('landing_config').update({ config_value: def }).eq('config_key', field.key);
      }
    }
    toast.success(`Seção "${section.label}" restaurada!`);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'hsl(262 75% 65%)' }} />
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-[11px]" style={{ color: 'hsl(0 0% 100% / 0.4)' }}>
        Edite cores, gradientes e tamanhos de texto por seção. Use o Preview ao vivo para visualizar em tempo real.
      </p>

      {STYLE_SECTIONS.map(section => {
        const isOpen = openSection === section.id;
        return (
          <div
            key={section.id}
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid hsl(0 0% 100% / 0.08)', background: 'hsl(0 0% 100% / 0.02)' }}
          >
            {/* Section header */}
            <button
              onClick={() => setOpenSection(isOpen ? null : section.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{section.emoji}</span>
                <span className="text-xs font-semibold" style={{ color: 'hsl(0 0% 100% / 0.85)' }}>
                  {section.label}
                </span>
                <span className="text-[10px]" style={{ color: 'hsl(0 0% 100% / 0.3)' }}>
                  {section.fields.length} props
                </span>
              </div>
              {isOpen
                ? <ChevronUp className="h-3.5 w-3.5" style={{ color: 'hsl(0 0% 100% / 0.4)' }} />
                : <ChevronDown className="h-3.5 w-3.5" style={{ color: 'hsl(0 0% 100% / 0.4)' }} />}
            </button>

            {/* Section body */}
            {isOpen && (
              <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: 'hsl(0 0% 100% / 0.06)' }}>
                <div className="pt-3 space-y-4">
                  {section.fields.map(field => {
                    const val = getVal(field.key);
                    return (
                      <div key={field.key}>
                        <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block"
                          style={{ color: 'hsl(0 0% 100% / 0.4)' }}>
                          {field.label}
                        </label>

                        {field.type === 'color' && (
                          <ColorField
                            value={val}
                            onChange={v => setVal(field.key, v)}
                            onBlur={() => saveKey(field.key)}
                            hint={field.hint}
                          />
                        )}

                        {field.type === 'select' && (
                          <select
                            className="w-full h-8 px-2.5 text-xs rounded-lg focus:outline-none"
                            style={{
                              border: '1px solid hsl(0 0% 100% / 0.1)',
                              background: 'hsl(0 0% 100% / 0.05)',
                              color: 'hsl(0 0% 100%)',
                            }}
                            value={val}
                            onChange={e => { setVal(field.key, e.target.value); }}
                            onBlur={() => saveKey(field.key)}
                          >
                            {field.options?.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        )}

                        {field.type === 'text' && (
                          <div className="flex gap-2">
                            <input
                              className="flex-1 h-8 px-2.5 text-xs rounded-lg focus:outline-none"
                              style={{
                                border: '1px solid hsl(0 0% 100% / 0.1)',
                                background: 'hsl(0 0% 100% / 0.05)',
                                color: 'hsl(0 0% 100%)',
                              }}
                              value={val}
                              onChange={e => setVal(field.key, e.target.value)}
                              onBlur={() => saveKey(field.key)}
                            />
                            <button
                              onClick={() => saveKey(field.key)}
                              disabled={saving === field.key}
                              className="shrink-0 p-1.5 rounded-lg transition"
                              style={{ background: 'hsl(262 75% 55% / 0.2)', color: 'hsl(262 75% 65%)' }}
                            >
                              {saving === field.key
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Save className="h-3 w-3" />}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Reset section */}
                <button
                  onClick={() => resetSection(section)}
                  className="flex items-center gap-1 text-[10px] transition mt-1"
                  style={{ color: 'hsl(0 0% 100% / 0.25)' }}
                >
                  <RefreshCw className="h-2.5 w-2.5" /> Restaurar padrões desta seção
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AdminLandingStyleEditor;
