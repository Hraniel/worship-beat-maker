import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Loader2, Plus, Trash2, GripVertical, X, Palette } from 'lucide-react';
import { icons } from 'lucide-react';

interface CategoryGroup {
  name: string;
  icon: string;
  subs: string[];
}

const ICON_OPTIONS = [
  'drum', 'piano', 'mic', 'wind', 'repeat', 'music', 'waves', 'sparkles',
  'headphones', 'volume-2', 'layers', 'audio-waveform', 'guitar', 'radio',
];

interface FooterLink {
  label: string;
  url: string;
}

const AdminStoreEditor: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Record<string, { id: string; value: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  // Text fields
  const [storeTitle, setStoreTitle] = useState('');
  const [storeSubtitle, setStoreSubtitle] = useState('');
  const [libraryTitle, setLibraryTitle] = useState('');
  const [activeLabel, setActiveLabel] = useState('');
  const [removedLabel, setRemovedLabel] = useState('');
  const [searchPlaceholder, setSearchPlaceholder] = useState('');

  // Color fields
  const [colors, setColors] = useState<Record<string, string>>({
    store_title_color: '#ffffff',
    store_subtitle_color: '#a1a1aa',
    library_title_color: '#ffffff',
    active_label_color: '#a78bfa',
    removed_label_color: '#f87171',
    search_placeholder_color: '#71717a',
    community_title_color: '#111827',
    community_subtitle_color: '#6b7280',
    community_button_color: '#111827',
    footer_text_color: '#9ca3af',
    footer_bg_color: '#f8f8fa',
  });

  // Filters
  const [filterAll, setFilterAll] = useState('');
  const [filterPurchased, setFilterPurchased] = useState('');
  const [filterAvailable, setFilterAvailable] = useState('');
  const [filterRemoved, setFilterRemoved] = useState('');

  // Categories
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [newSubInput, setNewSubInput] = useState<Record<number, string>>({});

  // Community fields
  const [communityTitle, setCommunityTitle] = useState('');
  const [communitySubtitle, setCommunitySubtitle] = useState('');
  const [communityButtonLabel, setCommunityButtonLabel] = useState('');
  const [communityEmptyText, setCommunityEmptyText] = useState('');
  const [communityLoginText, setCommunityLoginText] = useState('');

  // Footer fields
  const [footerText, setFooterText] = useState('');
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>([]);

  const dragRef = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('store_config' as any).select('*').order('config_key');
      if (data) {
        const map: Record<string, { id: string; value: string }> = {};
        (data as any[]).forEach((r: any) => { map[r.config_key] = { id: r.id, value: r.config_value }; });
        setRows(map);

        setStoreTitle(map['store_title']?.value ?? 'Glory Store');
        setStoreSubtitle(map['store_subtitle']?.value ?? '');
        setLibraryTitle(map['library_title']?.value ?? 'Minha Biblioteca');
        setActiveLabel(map['library_active_label']?.value ?? 'Ativos');
        setRemovedLabel(map['library_removed_label']?.value ?? 'Removidos');
        setSearchPlaceholder(map['search_placeholder']?.value ?? '');

        // Load colors
        try {
          const savedColors = JSON.parse(map['text_colors']?.value ?? '{}');
          setColors(prev => ({ ...prev, ...savedColors }));
        } catch { /* keep defaults */ }

        try {
          const fl = JSON.parse(map['filter_labels']?.value ?? '{}');
          setFilterAll(fl.all ?? 'Todos');
          setFilterPurchased(fl.purchased ?? 'Adquiridos');
          setFilterAvailable(fl.available ?? 'Disponíveis');
          setFilterRemoved(fl.removed ?? 'Removidos');
        } catch { /* keep defaults */ }

        try {
          const parsed = JSON.parse(map['categories']?.value ?? '[]');
          setCategories(Array.isArray(parsed) ? parsed.map((c: any) => ({ ...c, subs: Array.isArray(c.subs) ? c.subs : [] })) : []);
        } catch { /* keep defaults */ }

        // Community
        setCommunityTitle(map['community_title']?.value ?? 'Comunidade — Próximas Atualizações');
        setCommunitySubtitle(map['community_subtitle']?.value ?? 'Vote nas ideias que você quer ver no Glory Pads. Sua voz molda o app.');
        setCommunityButtonLabel(map['community_button_label']?.value ?? 'Sugerir ideia');
        setCommunityEmptyText(map['community_empty_text']?.value ?? 'Nenhuma sugestão ainda. Seja o primeiro!');
        setCommunityLoginText(map['community_login_text']?.value ?? 'Faça login para curtir as sugestões que você quer ver no app.');

        // Footer
        setFooterText(map['footer_text']?.value ?? 'Glory Pads — Feito com amor para adoradores.');
        try {
          setFooterLinks(JSON.parse(map['footer_links']?.value ?? '[]'));
        } catch { setFooterLinks([]); }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const saveKey = async (key: string, value: string) => {
    setSaving(key);
    try {
      const existing = rows[key];
      if (existing?.id) {
        await supabase.from('store_config' as any).update({ config_value: value } as any).eq('id', existing.id);
      } else {
        await supabase.from('store_config' as any).insert({ config_key: key, config_value: value } as any);
      }
      setRows(prev => ({ ...prev, [key]: { id: prev[key]?.id ?? '', value } }));
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveTexts = async () => {
    setSaving('texts');
    try {
      await Promise.all([
        saveKey('store_title', storeTitle),
        saveKey('store_subtitle', storeSubtitle),
        saveKey('library_title', libraryTitle),
        saveKey('library_active_label', activeLabel),
        saveKey('library_removed_label', removedLabel),
        saveKey('search_placeholder', searchPlaceholder),
        saveKey('text_colors', JSON.stringify(colors)),
      ]);
      toast.success('Textos e cores salvos!');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveFilters = async () => {
    const obj = { all: filterAll, purchased: filterPurchased, available: filterAvailable, removed: filterRemoved };
    await saveKey('filter_labels', JSON.stringify(obj));
    toast.success('Filtros salvos!');
  };

  const handleSaveCategories = async () => {
    await saveKey('categories', JSON.stringify(categories));
    toast.success('Categorias salvas!');
  };

  const handleSaveCommunity = async () => {
    setSaving('community');
    try {
      await Promise.all([
        saveKey('community_title', communityTitle),
        saveKey('community_subtitle', communitySubtitle),
        saveKey('community_button_label', communityButtonLabel),
        saveKey('community_empty_text', communityEmptyText),
        saveKey('community_login_text', communityLoginText),
        saveKey('text_colors', JSON.stringify(colors)),
      ]);
      toast.success('Comunidade salva!');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveFooter = async () => {
    setSaving('footer');
    try {
      await Promise.all([
        saveKey('footer_text', footerText),
        saveKey('footer_links', JSON.stringify(footerLinks)),
        saveKey('text_colors', JSON.stringify(colors)),
      ]);
      toast.success('Rodapé salvo!');
    } finally {
      setSaving(null);
    }
  };

  const addFooterLink = () => setFooterLinks(prev => [...prev, { label: '', url: '' }]);
  const removeFooterLink = (idx: number) => setFooterLinks(prev => prev.filter((_, i) => i !== idx));
  const updateFooterLink = (idx: number, field: keyof FooterLink, value: string) => {
    setFooterLinks(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const updateColor = (key: string, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  // Category helpers
  const addCategory = () => {
    setCategories(prev => [...prev, { name: 'Nova Categoria', icon: 'music', subs: [] }]);
  };

  const removeCategory = (idx: number) => {
    setCategories(prev => prev.filter((_, i) => i !== idx));
  };

  const updateCategory = (idx: number, field: keyof CategoryGroup, value: any) => {
    setCategories(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const addSub = (catIdx: number) => {
    const val = (newSubInput[catIdx] ?? '').trim();
    if (!val) return;
    setCategories(prev => prev.map((c, i) => i === catIdx ? { ...c, subs: [...c.subs, val] } : c));
    setNewSubInput(prev => ({ ...prev, [catIdx]: '' }));
  };

  const removeSub = (catIdx: number, subIdx: number) => {
    setCategories(prev => prev.map((c, i) => i === catIdx ? { ...c, subs: c.subs.filter((_, si) => si !== subIdx) } : c));
  };

  // Drag reorder categories
  const handleDragStart = (idx: number) => { dragRef.current = idx; };
  const handleDragOverCat = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOver(idx); };
  const handleDropCat = (idx: number) => {
    const from = dragRef.current;
    if (from === null || from === idx) { setDragOver(null); return; }
    setCategories(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(idx, 0, moved);
      return arr;
    });
    dragRef.current = null;
    setDragOver(null);
  };

  const inputStyle = { border: '1px solid hsl(0 0% 100% / 0.1)', background: 'hsl(0 0% 100% / 0.05)', color: 'hsl(0 0% 100%)' };
  const labelStyle: React.CSSProperties = { color: 'hsl(0 0% 100% / 0.4)' };
  const sectionStyle: React.CSSProperties = { border: '1px solid hsl(0 0% 100% / 0.08)', background: 'hsl(0 0% 100% / 0.02)' };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'hsl(262 75% 65%)' }} />
      </div>
    );
  }

  const renderIcon = (name: string) => {
    const Icon = (icons as any)[name.split('-').map((s: string, i: number) => i === 0 ? s : s[0].toUpperCase() + s.slice(1)).join('')] || (icons as any)['Music'];
    return Icon ? <Icon className="h-4 w-4" /> : null;
  };

  const textFields = [
    { label: 'Título da Loja', value: storeTitle, set: setStoreTitle, colorKey: 'store_title_color' },
    { label: 'Subtítulo', value: storeSubtitle, set: setStoreSubtitle, colorKey: 'store_subtitle_color' },
    { label: 'Título "Minha Biblioteca"', value: libraryTitle, set: setLibraryTitle, colorKey: 'library_title_color' },
    { label: 'Label "Ativos"', value: activeLabel, set: setActiveLabel, colorKey: 'active_label_color' },
    { label: 'Label "Removidos"', value: removedLabel, set: setRemovedLabel, colorKey: 'removed_label_color' },
    { label: 'Placeholder de Busca', value: searchPlaceholder, set: setSearchPlaceholder, colorKey: 'search_placeholder_color' },
  ];

  return (
    <div className="space-y-4">
      {/* Section: Textos */}
      <div className="rounded-xl p-4 space-y-3" style={sectionStyle}>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold" style={{ color: 'hsl(262 75% 75%)' }}>📝 Textos da Loja</h3>
          <Palette className="h-3.5 w-3.5" style={{ color: 'hsl(262 75% 65%)' }} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {textFields.map(f => (
            <div key={f.label}>
              <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={labelStyle}>{f.label}</label>
              <div className="flex gap-1.5">
                <input className="flex-1 h-8 px-2.5 text-xs rounded-lg focus:outline-none" style={inputStyle}
                  value={f.value} onChange={e => f.set(e.target.value)} />
                <div className="relative shrink-0">
                  <input
                    type="color"
                    value={colors[f.colorKey]}
                    onChange={e => updateColor(f.colorKey, e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div
                    className="h-8 w-8 rounded-lg border border-white/10 cursor-pointer flex items-center justify-center"
                    style={{ backgroundColor: colors[f.colorKey] }}
                  >
                    <span className="text-[8px] font-mono mix-blend-difference text-white select-none">
                      {colors[f.colorKey].slice(1, 4).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
              {/* Preview */}
              <span className="text-[10px] mt-0.5 block truncate" style={{ color: colors[f.colorKey] }}>
                {f.value || 'Preview'}
              </span>
            </div>
          ))}
        </div>

        <button onClick={handleSaveTexts} disabled={saving === 'texts'}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition"
          style={{ background: 'hsl(262 75% 55% / 0.3)', color: 'hsl(262 75% 75%)' }}>
          {saving === 'texts' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Salvar Textos & Cores
        </button>
      </div>

      {/* Section: Filtros */}
      <div className="rounded-xl p-4 space-y-3" style={sectionStyle}>
        <h3 className="text-sm font-semibold" style={{ color: 'hsl(262 75% 75%)' }}>🔍 Labels dos Filtros</h3>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: 'Todos', value: filterAll, set: setFilterAll },
            { label: 'Adquiridos', value: filterPurchased, set: setFilterPurchased },
            { label: 'Disponíveis', value: filterAvailable, set: setFilterAvailable },
            { label: 'Removidos', value: filterRemoved, set: setFilterRemoved },
          ].map(f => (
            <div key={f.label}>
              <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={labelStyle}>{f.label}</label>
              <input className="w-full h-8 px-2.5 text-xs rounded-lg focus:outline-none" style={inputStyle}
                value={f.value} onChange={e => f.set(e.target.value)} />
            </div>
          ))}
        </div>

        <button onClick={handleSaveFilters} disabled={saving === 'filter_labels'}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition"
          style={{ background: 'hsl(262 75% 55% / 0.3)', color: 'hsl(262 75% 75%)' }}>
          {saving === 'filter_labels' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Salvar Filtros
        </button>
      </div>

      {/* Section: Categorias */}
      <div className="rounded-xl p-4 space-y-3" style={sectionStyle}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: 'hsl(262 75% 75%)' }}>📂 Categorias</h3>
          <button onClick={addCategory}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition"
            style={{ background: 'hsl(142 70% 45% / 0.2)', color: 'hsl(142 70% 65%)' }}>
            <Plus className="h-3 w-3" /> Adicionar
          </button>
        </div>

        <div className="space-y-2">
          {categories.map((cat, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={e => handleDragOverCat(e, idx)}
              onDrop={() => handleDropCat(idx)}
              className={`rounded-lg p-3 space-y-2 transition-colors ${dragOver === idx ? 'ring-1 ring-indigo-400/50' : ''}`}
              style={{ ...sectionStyle, background: 'hsl(0 0% 100% / 0.03)' }}
            >
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab opacity-40" />

                {/* Icon selector */}
                <select
                  value={cat.icon}
                  onChange={e => updateCategory(idx, 'icon', e.target.value)}
                  className="h-8 px-2 text-xs rounded-lg focus:outline-none shrink-0 w-28"
                  style={inputStyle}
                >
                  {ICON_OPTIONS.map(ic => (
                    <option key={ic} value={ic}>{ic}</option>
                  ))}
                </select>

                {/* Name */}
                <input
                  className="flex-1 h-8 px-2.5 text-xs rounded-lg focus:outline-none"
                  style={inputStyle}
                  value={cat.name}
                  onChange={e => updateCategory(idx, 'name', e.target.value)}
                  placeholder="Nome da categoria"
                />

                <button onClick={() => removeCategory(idx)}
                  className="shrink-0 p-1.5 rounded-lg transition hover:bg-red-500/20"
                  style={{ color: 'hsl(0 70% 60%)' }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Subcategories */}
              <div className="ml-8">
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {cat.subs.map((sub, si) => (
                    <span key={si} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ background: 'hsl(262 75% 55% / 0.15)', color: 'hsl(262 75% 75%)' }}>
                      {sub}
                      <button onClick={() => removeSub(idx, si)} className="hover:text-red-400 transition">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input
                    className="flex-1 h-7 px-2 text-[11px] rounded-lg focus:outline-none"
                    style={inputStyle}
                    placeholder="Nova subcategoria..."
                    value={newSubInput[idx] ?? ''}
                    onChange={e => setNewSubInput(prev => ({ ...prev, [idx]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addSub(idx)}
                  />
                  <button onClick={() => addSub(idx)}
                    className="shrink-0 px-2 h-7 rounded-lg text-[10px] font-medium transition"
                    style={{ background: 'hsl(262 75% 55% / 0.2)', color: 'hsl(262 75% 65%)' }}>
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={handleSaveCategories} disabled={saving === 'categories'}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition"
          style={{ background: 'hsl(262 75% 55% / 0.3)', color: 'hsl(262 75% 75%)' }}>
          {saving === 'categories' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Salvar Categorias
        </button>
      </div>

      {/* Section: Comunidade */}
      <div className="rounded-xl p-4 space-y-3" style={sectionStyle}>
        <h3 className="text-sm font-semibold" style={{ color: 'hsl(262 75% 75%)' }}>💡 Comunidade</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: 'Título', value: communityTitle, set: setCommunityTitle, colorKey: 'community_title_color' },
            { label: 'Subtítulo', value: communitySubtitle, set: setCommunitySubtitle, colorKey: 'community_subtitle_color' },
            { label: 'Label do Botão', value: communityButtonLabel, set: setCommunityButtonLabel, colorKey: 'community_button_color' },
          ].map(f => (
            <div key={f.label}>
              <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={labelStyle}>{f.label}</label>
              <div className="flex gap-1.5">
                <input className="flex-1 h-8 px-2.5 text-xs rounded-lg focus:outline-none" style={inputStyle}
                  value={f.value} onChange={e => f.set(e.target.value)} />
                <div className="relative shrink-0">
                  <input type="color" value={colors[f.colorKey]} onChange={e => updateColor(f.colorKey, e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <div className="h-8 w-8 rounded-lg border border-white/10 cursor-pointer flex items-center justify-center"
                    style={{ backgroundColor: colors[f.colorKey] }}>
                    <span className="text-[8px] font-mono mix-blend-difference text-white select-none">
                      {colors[f.colorKey].slice(1, 4).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-[10px] mt-0.5 block truncate" style={{ color: colors[f.colorKey] }}>{f.value || 'Preview'}</span>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={labelStyle}>Texto Vazio</label>
            <input className="w-full h-8 px-2.5 text-xs rounded-lg focus:outline-none" style={inputStyle}
              value={communityEmptyText} onChange={e => setCommunityEmptyText(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={labelStyle}>Texto Login</label>
            <input className="w-full h-8 px-2.5 text-xs rounded-lg focus:outline-none" style={inputStyle}
              value={communityLoginText} onChange={e => setCommunityLoginText(e.target.value)} />
          </div>
        </div>

        <button onClick={handleSaveCommunity} disabled={saving === 'community'}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition"
          style={{ background: 'hsl(262 75% 55% / 0.3)', color: 'hsl(262 75% 75%)' }}>
          {saving === 'community' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Salvar Comunidade
        </button>
      </div>

      {/* Section: Rodapé */}
      <div className="rounded-xl p-4 space-y-3" style={sectionStyle}>
        <h3 className="text-sm font-semibold" style={{ color: 'hsl(262 75% 75%)' }}>🔻 Rodapé</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={labelStyle}>Texto do Rodapé</label>
            <div className="flex gap-1.5">
              <input className="flex-1 h-8 px-2.5 text-xs rounded-lg focus:outline-none" style={inputStyle}
                value={footerText} onChange={e => setFooterText(e.target.value)} />
              <div className="relative shrink-0">
                <input type="color" value={colors.footer_text_color} onChange={e => updateColor('footer_text_color', e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <div className="h-8 w-8 rounded-lg border border-white/10 cursor-pointer flex items-center justify-center"
                  style={{ backgroundColor: colors.footer_text_color }}>
                  <span className="text-[8px] font-mono mix-blend-difference text-white select-none">
                    {colors.footer_text_color.slice(1, 4).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
            <span className="text-[10px] mt-0.5 block truncate" style={{ color: colors.footer_text_color }}>{footerText || 'Preview'}</span>
          </div>
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={labelStyle}>Cor de Fundo</label>
            <div className="flex gap-1.5 items-center">
              <div className="relative shrink-0">
                <input type="color" value={colors.footer_bg_color} onChange={e => updateColor('footer_bg_color', e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <div className="h-8 w-8 rounded-lg border border-white/10 cursor-pointer flex items-center justify-center"
                  style={{ backgroundColor: colors.footer_bg_color }}>
                  <span className="text-[8px] font-mono mix-blend-difference text-white select-none">BG</span>
                </div>
              </div>
              <div className="h-8 flex-1 rounded-lg" style={{ backgroundColor: colors.footer_bg_color, border: '1px solid hsl(0 0% 100% / 0.1)' }} />
            </div>
          </div>
        </div>

        {/* Footer links editor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-medium uppercase tracking-wider" style={labelStyle}>Links do Rodapé</label>
            <button onClick={addFooterLink}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition"
              style={{ background: 'hsl(142 70% 45% / 0.2)', color: 'hsl(142 70% 65%)' }}>
              <Plus className="h-3 w-3" /> Adicionar
            </button>
          </div>
          <div className="space-y-1.5">
            {footerLinks.map((link, idx) => (
              <div key={idx} className="flex gap-1.5 items-center">
                <input className="flex-1 h-7 px-2 text-[11px] rounded-lg focus:outline-none" style={inputStyle}
                  placeholder="Label" value={link.label} onChange={e => updateFooterLink(idx, 'label', e.target.value)} />
                <input className="flex-1 h-7 px-2 text-[11px] rounded-lg focus:outline-none" style={inputStyle}
                  placeholder="URL" value={link.url} onChange={e => updateFooterLink(idx, 'url', e.target.value)} />
                <button onClick={() => removeFooterLink(idx)}
                  className="shrink-0 p-1 rounded-lg transition hover:bg-red-500/20" style={{ color: 'hsl(0 70% 60%)' }}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleSaveFooter} disabled={saving === 'footer'}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition"
          style={{ background: 'hsl(262 75% 55% / 0.3)', color: 'hsl(262 75% 75%)' }}>
          {saving === 'footer' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Salvar Rodapé
        </button>
      </div>
    </div>
  );
};

export default AdminStoreEditor;
