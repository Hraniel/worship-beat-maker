import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Syncs the i18n language with the user's profile locale.
 * - On mount: loads locale from profile → sets i18n language
 * - On language change: saves to profile
 */
export function useLocaleSync() {
  const { i18n } = useTranslation();
  const { user } = useAuth();

  // Load locale from profile on login
  useEffect(() => {
    if (!user?.id) return;

    supabase
      .from('profiles')
      .select('locale')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.locale && data.locale !== i18n.language) {
          i18n.changeLanguage(data.locale);
        }
      });
  }, [user?.id]);

  // Save locale to profile when language changes
  useEffect(() => {
    if (!user?.id) return;

    const handleLanguageChanged = (lng: string) => {
      supabase
        .from('profiles')
        .update({ locale: lng })
        .eq('user_id', user.id)
        .then(() => {});
    };

    i18n.on('languageChanged', handleLanguageChanged);
    return () => { i18n.off('languageChanged', handleLanguageChanged); };
  }, [user?.id, i18n]);
}
