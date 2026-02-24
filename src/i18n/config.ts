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
    if (data) {
      for (const row of data) {
        i18n.addResource(row.locale, 'translation', row.key_path, row.value);
      }
    }
  } catch { /* silent */ }
}
loadOverrides();

export default i18n;
