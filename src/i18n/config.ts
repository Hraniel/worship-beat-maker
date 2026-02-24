import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ptBR from './locales/pt-BR.json';
import ptPT from './locales/pt-PT.json';
import en from './locales/en.json';
import es from './locales/es.json';

export const SUPPORTED_LOCALES = [
  { code: 'pt-BR', label: 'Português (BR)', flag: '🇧🇷' },
  { code: 'pt-PT', label: 'Português (PT)', flag: '🇵🇹' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]['code'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': { translation: ptBR },
      'pt-PT': { translation: ptPT },
      en: { translation: en },
      es: { translation: es },
    },
    fallbackLng: 'pt-BR',
    supportedLngs: ['pt-BR', 'pt-PT', 'en', 'es'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  });

// Load translation overrides from DB (non-blocking)
async function loadOverrides() {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data } = await supabase.from('translation_overrides').select('locale, key_path, value');
    if (data && data.length > 0) {
      // Group overrides by locale and build nested objects
      const grouped: Record<string, Record<string, string>> = {};
      for (const row of data) {
        if (!grouped[row.locale]) grouped[row.locale] = {};
        grouped[row.locale][row.key_path] = row.value;
      }
      // Apply overrides using addResourceBundle with deep + overwrite
      for (const [locale, keys] of Object.entries(grouped)) {
        // Convert flat keys to nested object
        const nested: Record<string, any> = {};
        for (const [flatKey, value] of Object.entries(keys)) {
          const parts = flatKey.split('.');
          let current = nested;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) current[parts[i]] = {};
            current = current[parts[i]];
          }
          current[parts[parts.length - 1]] = value;
        }
        i18n.addResourceBundle(locale, 'translation', nested, true, true);
      }
    }
  } catch { /* silent */ }
}
loadOverrides();

export default i18n;
