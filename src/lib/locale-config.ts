import i18n from '@/i18n/config';

/**
 * Default locale — keys without suffix are assumed to be in this locale.
 */
const DEFAULT_LOCALE = 'pt-BR';

/**
 * Returns the locale suffix for the current i18n language.
 * For the default locale (pt-BR), returns '' (use base key).
 * For others: '_en', '_es', '_pt-PT'.
 */
export function getLocaleSuffix(locale?: string): string {
  const lang = locale ?? i18n.language ?? DEFAULT_LOCALE;
  if (lang === DEFAULT_LOCALE) return '';
  return `_${lang}`;
}

/**
 * Resolves a config key based on the current locale.
 * Tries `key_{locale}` first, then falls back to the base `key`.
 *
 * @param config - The config map (key → value)
 * @param key - The base config key (e.g., 'hero_title')
 * @param fallback - Optional fallback if neither key exists
 */
export function resolveLocalizedKey(
  config: Record<string, string>,
  key: string,
  fallback = ''
): string {
  const suffix = getLocaleSuffix();
  if (suffix) {
    const localizedKey = `${key}${suffix}`;
    if (config[localizedKey] && config[localizedKey].trim() !== '') {
      return config[localizedKey];
    }
  }
  return config[key] ?? fallback;
}

/**
 * Returns the config key with locale suffix for saving purposes.
 * For pt-BR returns the base key, for others returns key_locale.
 */
export function getLocalizedConfigKey(key: string, locale?: string): string {
  const suffix = getLocaleSuffix(locale);
  return suffix ? `${key}${suffix}` : key;
}
