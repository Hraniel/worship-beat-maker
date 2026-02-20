import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StoreConfigMap {
  [key: string]: string;
}

const DEFAULTS: StoreConfigMap = {
  store_title: 'Glory Store',
  store_subtitle: 'Descubra novos sons, packs e texturas para elevar seu louvor.',
  library_title: 'Minha Biblioteca',
  library_active_label: 'Ativos',
  library_removed_label: 'Removidos',
  search_placeholder: 'Buscar packs por nome ou descrição...',
  filter_labels: '{"all":"Todos","purchased":"Adquiridos","available":"Disponíveis","removed":"Removidos"}',
  categories: '[]',
  text_colors: '{"store_title_color":"#ffffff","store_subtitle_color":"#a1a1aa","library_title_color":"#ffffff","active_label_color":"#a78bfa","removed_label_color":"#f87171","search_placeholder_color":"#71717a","community_title_color":"#111827","community_subtitle_color":"#6b7280","community_button_color":"#111827","footer_text_color":"#9ca3af","footer_bg_color":"#f8f8fa"}',
  community_title: 'Comunidade — Próximas Atualizações',
  community_subtitle: 'Vote nas ideias que você quer ver no Glory Pads. Sua voz molda o app.',
  community_button_label: 'Sugerir ideia',
  community_empty_text: 'Nenhuma sugestão ainda. Seja o primeiro!',
  community_login_text: 'Faça login para curtir as sugestões que você quer ver no app.',
  footer_text: 'Glory Pads — Feito com amor para adoradores.',
  footer_links: '[{"label":"Termos","url":"/termos"},{"label":"Privacidade","url":"/privacidade"},{"label":"Contato","url":"mailto:contato@glorypads.com"}]',
};

export function useStoreConfig() {
  const [config, setConfig] = useState<StoreConfigMap>({});
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('store_config' as any)
        .select('config_key, config_value')
        .order('config_key');
      if (data) {
        const map: StoreConfigMap = {};
        (data as any[]).forEach((r: any) => { map[r.config_key] = r.config_value; });
        setConfig(map);
      }
    } catch (e) {
      console.error('Failed to load store config', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const get = useCallback((key: string): string => {
    return config[key] ?? DEFAULTS[key] ?? '';
  }, [config]);

  const getJSON = useCallback(<T = any>(key: string, fallback?: T): T => {
    const val = config[key] ?? DEFAULTS[key];
    if (!val) return (fallback ?? [] as any);
    try { return JSON.parse(val); } catch { return (fallback ?? [] as any); }
  }, [config]);

  return { config, get, getJSON, loading, refetch: fetchConfig };
}
