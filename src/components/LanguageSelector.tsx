import React from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/i18n/config';
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  /** Compact mode shows only flags in a row (for nav/landing) */
  compact?: boolean;
  className?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ compact = false, className = '' }) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const handleChange = (code: SupportedLocale) => {
    i18n.changeLanguage(code);
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {SUPPORTED_LOCALES.map((loc) => (
          <button
            key={loc.code}
            onClick={() => handleChange(loc.code)}
            title={loc.label}
            className={`text-base leading-none px-1 py-0.5 rounded transition-all ${
              currentLang === loc.code || currentLang.startsWith(loc.code.split('-')[0]) && !SUPPORTED_LOCALES.some(l => l.code === currentLang)
                ? 'opacity-100 scale-110 bg-primary/10'
                : 'opacity-50 hover:opacity-80'
            }`}
          >
            {loc.flag}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        <Globe className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">{SUPPORTED_LOCALES.find(l => l.code === currentLang)?.label || 'Language'}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {SUPPORTED_LOCALES.map((loc) => {
          const isActive = currentLang === loc.code;
          return (
            <button
              key={loc.code}
              onClick={() => handleChange(loc.code)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors border ${
                isActive
                  ? 'bg-primary/10 border-primary/30 text-foreground'
                  : 'hover:bg-muted/50 border-transparent text-muted-foreground'
              }`}
            >
              <span className="text-lg">{loc.flag}</span>
              <span className="text-xs font-medium truncate">{loc.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LanguageSelector;
