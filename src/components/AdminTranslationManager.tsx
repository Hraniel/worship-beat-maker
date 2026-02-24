import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { SUPPORTED_LOCALES } from '@/i18n/config';
import { toast } from 'sonner';
import { Search, Save, RotateCcw, Globe, ChevronDown, ChevronRight, Loader2, Badge } from 'lucide-react';

import ptBR from '@/i18n/locales/pt-BR.json';
import ptPT from '@/i18n/locales/pt-PT.json';
import en from '@/i18n/locales/en.json';
import es from '@/i18n/locales/es.json';

type FlatEntries = Record<string, string>;

function flattenObject(obj: Record<string, any>, prefix = ''): FlatEntries {
  const result: FlatEntries = {};
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(result, flattenObject(obj[key], fullKey));
    } else {
      result[fullKey] = String(obj[key]);
    }
  }
  return result;
}

const staticResources: Record<string, FlatEntries> = {
  'pt-BR': flattenObject(ptBR),
  'pt-PT': flattenObject(ptPT),
  en: flattenObject(en),
  es: flattenObject(es),
};

interface Override {
  id: string;
  locale: string;
  key_path: string;
  value: string;
}

const NAMESPACES = ['common', 'auth', 'landing', 'settings', 'store', 'dashboard', 'tickets', 'help', 'profile', 'notifications', 'tapTempo', 'adminTranslations'];

export default function AdminTranslationManager() {
  const { t, i18n } = useTranslation();
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocale, setSelectedLocale] = useState<string>('pt-BR');
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedNs, setExpandedNs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchOverrides();
  }, []);

  const fetchOverrides = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('translation_overrides')
      .select('*')
      .order('key_path');
    setOverrides((data || []) as Override[]);
    setLoading(false);
  };

  const overrideMap = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    for (const o of overrides) {
      if (!map[o.locale]) map[o.locale] = {};
      map[o.locale][o.key_path] = o.value;
    }
    return map;
  }, [overrides]);

  const currentKeys = useMemo(() => {
    const base = staticResources[selectedLocale] || staticResources['pt-BR'];
    const entries = Object.entries(base);
    return entries
      .filter(([key]) => {
        if (selectedNamespace && !key.startsWith(selectedNamespace + '.')) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return key.toLowerCase().includes(q) || base[key].toLowerCase().includes(q);
        }
        return true;
      })
      .sort(([a], [b]) => a.localeCompare(b));
  }, [selectedLocale, selectedNamespace, searchQuery]);

  const handleSave = async (keyPath: string, value: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('translation_overrides')
        .upsert({ locale: selectedLocale, key_path: keyPath, value, updated_at: new Date().toISOString() }, { onConflict: 'locale,key_path' });
      if (error) throw error;
      toast.success(t('adminTranslations.saved'));
      // Apply override to i18n in real-time
      i18n.addResource(selectedLocale, 'translation', keyPath, value);
      fetchOverrides();
      setEditingKey(null);
    } catch {
      toast.error(t('adminTranslations.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (keyPath: string) => {
    try {
      await supabase
        .from('translation_overrides')
        .delete()
        .eq('locale', selectedLocale)
        .eq('key_path', keyPath);
      // Restore original
      const original = staticResources[selectedLocale]?.[keyPath];
      if (original) i18n.addResource(selectedLocale, 'translation', keyPath, original);
      toast.success(t('adminTranslations.resetConfirm'));
      fetchOverrides();
      setEditingKey(null);
    } catch {
      toast.error(t('adminTranslations.error'));
    }
  };

  const getNamespace = (key: string) => key.split('.')[0];

  const groupedByNs = useMemo(() => {
    const groups: Record<string, [string, string][]> = {};
    for (const entry of currentKeys) {
      const ns = getNamespace(entry[0]);
      if (!groups[ns]) groups[ns] = [];
      groups[ns].push(entry);
    }
    return groups;
  }, [currentKeys]);

  const toggleNs = (ns: string) => {
    setExpandedNs(prev => ({ ...prev, [ns]: !prev[ns] }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Globe className="h-4 w-4 text-indigo-400" />
        <h3 className="text-sm font-bold text-white">{t('adminTranslations.title')}</h3>
      </div>
      <p className="text-xs text-gray-400">{t('adminTranslations.description')}</p>

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        {/* Locale selector */}
        <select
          value={selectedLocale}
          onChange={e => setSelectedLocale(e.target.value)}
          className="h-8 px-2 rounded-lg bg-slate-800 border border-slate-600 text-xs text-white"
        >
          {SUPPORTED_LOCALES.map(l => (
            <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
          ))}
        </select>

        {/* Namespace filter */}
        <select
          value={selectedNamespace}
          onChange={e => setSelectedNamespace(e.target.value)}
          className="h-8 px-2 rounded-lg bg-slate-800 border border-slate-600 text-xs text-white"
        >
          <option value="">{t('adminTranslations.allNamespaces')}</option>
          {NAMESPACES.map(ns => (
            <option key={ns} value={ns}>{ns}</option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
          <input
            type="text"
            placeholder={t('adminTranslations.searchKeys')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-7 pr-2 rounded-lg bg-slate-800 border border-slate-600 text-xs text-white placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-[10px] text-gray-500">
        <span>{currentKeys.length} chaves</span>
        <span>·</span>
        <span>{overrides.filter(o => o.locale === selectedLocale).length} overrides</span>
      </div>

      {/* Grouped keys */}
      <div className="space-y-1 max-h-[500px] overflow-y-auto">
        {Object.entries(groupedByNs).map(([ns, entries]) => {
          const isExpanded = expandedNs[ns] !== false; // default expanded
          const overrideCount = entries.filter(([key]) => overrideMap[selectedLocale]?.[key]).length;
          return (
            <div key={ns} className="rounded-lg border border-slate-700 overflow-hidden">
              <button
                onClick={() => toggleNs(ns)}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/50 hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronRight className="h-3 w-3 text-gray-400" />}
                  <span className="text-xs font-semibold text-white">{ns}</span>
                  <span className="text-[10px] text-gray-500">{entries.length} chaves</span>
                  {overrideCount > 0 && (
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full">{overrideCount} editados</span>
                  )}
                </div>
              </button>
              {isExpanded && (
                <div className="divide-y divide-slate-700/50">
                  {entries.map(([key, originalValue]) => {
                    const isOverridden = !!overrideMap[selectedLocale]?.[key];
                    const currentValue = overrideMap[selectedLocale]?.[key] ?? originalValue;
                    const isEditing = editingKey === key;

                    return (
                      <div key={key} className="px-3 py-2 hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-[10px] font-mono text-gray-500 truncate">{key.replace(ns + '.', '')}</span>
                              {isOverridden && (
                                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded">{t('adminTranslations.overridden')}</span>
                              )}
                            </div>
                            {isEditing ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  className="flex-1 h-7 px-2 rounded bg-slate-900 border border-indigo-500/50 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  autoFocus
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSave(key, editValue);
                                    if (e.key === 'Escape') setEditingKey(null);
                                  }}
                                />
                                <button
                                  onClick={() => handleSave(key, editValue)}
                                  disabled={saving}
                                  className="h-7 px-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-medium disabled:opacity-50"
                                >
                                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                </button>
                                {isOverridden && (
                                  <button
                                    onClick={() => handleReset(key)}
                                    className="h-7 px-2 rounded bg-slate-700 hover:bg-slate-600 text-gray-300 text-[10px]"
                                    title={t('adminTranslations.reset')}
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => { setEditingKey(key); setEditValue(currentValue); }}
                                className="text-left w-full"
                              >
                                <span className="text-xs text-gray-300 break-words">{currentValue}</span>
                              </button>
                            )}
                          </div>
                        </div>
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
  );
}