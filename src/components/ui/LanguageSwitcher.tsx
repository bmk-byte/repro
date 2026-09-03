import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { setLanguagePreference, type AppLanguage } from '../../lib/languagePreference';

export interface LanguageSwitcherProps {
  className?: string;
}

/** EN/FR toggle. Persists the choice (see languagePreference.ts) and switches i18next's active language immediately. */
export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = '' }) => {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage ?? i18n.language) as AppLanguage;

  const setLanguage = (language: AppLanguage) => {
    i18n.changeLanguage(language);
    setLanguagePreference(language);
  };

  return (
    <div
      role="group"
      aria-label={t('common.language')}
      className={`inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white p-0.5 ${className}`}
    >
      <Languages className="h-3.5 w-3.5 text-stone-400 ml-1.5" aria-hidden="true" />
      {(['en', 'fr'] as const).map((language) => (
        <button
          key={language}
          type="button"
          onClick={() => setLanguage(language)}
          aria-pressed={current === language}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
            current === language
              ? 'bg-primary text-white'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          {language.toUpperCase()}
        </button>
      ))}
    </div>
  );
};
