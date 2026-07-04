/**
 * i18next configuration for the web console.
 *
 * Default language is Indonesian (`id`); English (`en`) is the alternate.
 * The active language is resolved (in order) from: an explicit user choice in
 * `localStorage`/cookie, the authenticated user's `preferred_language` (applied
 * by `LanguageSync` once the profile loads), then the `<html lang>` fallback.
 *
 * Resources are bundled (imported JSON) so the first paint is already localized
 * with no async load flash.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import {
  resources,
  NAMESPACES,
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
} from './resources';

import { LANGUAGE_STORAGE_KEY } from './constants';
export { LANGUAGE_STORAGE_KEY };

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      ns: NAMESPACES as unknown as string[],
      defaultNS: 'common',
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
      nonExplicitSupportedLngs: true,
      load: 'languageOnly',
      interpolation: {
        // React already escapes values.
        escapeValue: false,
      },
      detection: {
        order: ['localStorage', 'cookie', 'htmlTag'],
        lookupLocalStorage: LANGUAGE_STORAGE_KEY,
        lookupCookie: LANGUAGE_STORAGE_KEY,
        caches: ['localStorage', 'cookie'],
      },
      returnNull: false,
    });
}

export default i18n;
