'use client';

/**
 * Segmented language switcher (ID / EN). Persists locally and best-effort to the
 * user profile via `useLanguage`. Neo-Brutalism styled to match the settings UI.
 */
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/lib/i18n/provider';
import type { SupportedLanguage } from '@/lib/i18n/resources';

const OPTIONS: { value: SupportedLanguage; labelKey: string }[] = [
  { value: 'id', labelKey: 'common:language.id' },
  { value: 'en', labelKey: 'common:language.en' },
];

export function LanguageSwitcher() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  return (
    <div
      role="radiogroup"
      aria-label={t('common:language.label')}
      className="inline-flex rounded-nb-base border-2 border-nb-black bg-nb-white p-0.5"
    >
      {OPTIONS.map((opt) => {
        const active = language === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => void setLanguage(opt.value)}
            className={`min-h-touch rounded-nb-sm px-3 text-nb-body-sm font-semibold transition-colors ${
              active
                ? 'bg-nb-primary text-nb-black'
                : 'bg-transparent text-nb-gray-600 hover:bg-nb-gray-100'
            }`}
          >
            {t(opt.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
