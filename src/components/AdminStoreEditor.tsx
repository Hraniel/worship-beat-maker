import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Loader2, Plus, Trash2, GripVertical, X } from 'lucide-react';
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

  // Filters
  const [filterAll, setFilterAll] = useState('');
  const [filterPurchased, setFilterPurchased] = useState('');
  const [filterAvailable, setFilterAvailable] = useState('');
  const [filterRemoved, setFilterRemoved] = useState('');

  // Categories
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [newSubInput, setNewSubInput] = useState<Record<number, string>>({});

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

        try {
          const fl = JSON.parse(map['filter_labels']?.value ?? '{}');
          setFilterAll(fl.all ?? 'Todos');
          setFilterPurchased(fl.purchased ?? 'Adquiridos');
          setFilterAvailable(fl.available ?? 'Disponíveis');
          setFilterRemoved(fl.removed ?? 'Removidos');
        } catch { /* keep defaults */ }

        try {
          setCategories(JSON.parse(map['categories']?.value ?? '[]'));
        } catch { /* keep defaults */ }
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
      ]);
      toast.success('Textos salvos!');
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

  return (
    <div className="space-y-4">
      {/* Section: Textos */}
      <div className="rounded-xl p-4 space-y-3" style={sectionStyle}>
        <h3 className="text-sm font-semibold" style={{ color: 'hsl(262 75% 75%)' }}>📝 Textos da Loja</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: 'Título da Loja', value: storeTitle, set: setStoreTitle },
            { label: 'Subtítulo', value: storeSubtitle, set: setStoreSubtitle },
            { label: 'Título "Minha Biblioteca"', value: libraryTitle, set: setLibraryTitle },
            { label: 'Label "Ativos"', value: activeLabel, set: setActiveLabel },
            { label: 'Label "Removidos"', value: removedLabel, set: setRemovedLabel },
            { label: 'Placeholder de Busca', value: searchPlaceholder, set: setSearchPlaceholder },
          ].map(f => (
            <div key={f.label}>
              <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={labelStyle}>{f.label}</label>
              <input className="w-full h-8 px-2.5 text-xs rounded-lg focus:outline-none" style={inputStyle}
                value={f.value} onChange={e => f.set(e.target.value)} />
            </div>
          ))}
        </div>

        <button onClick={handleSaveTexts} disabled={saving === 'texts'}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition"
          style={{ background: 'hsl(262 75% 55% / 0.3)', color: 'hsl(262 75% 75%)' }}>
          {saving === 'texts' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Salvar Textos
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
    </div>
  );
};

export default AdminStoreEditor;
