/**
 * i18next configuration for the mobile app.
 *
 * Default language is Indonesian (`id`); English (`en`) is the alternate.
 * Resources are bundled (imported JSON). The persisted choice is hydrated from
 * AsyncStorage by `bootstrapLanguage()` at startup and, once signed in, the
 * profile's `preferred_language` is applied by `LanguageSync`.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { resources, NAMESPACES, DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './resources';

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    ns: NAMESPACES as unknown as string[],
    defaultNS: 'common',
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    // React Native has no Intl plural rules for some locales by default; keep
    // interpolation simple and let React handle escaping.
    interpolation: { escapeValue: false },
    returnNull: false,
    compatibilityJSON: 'v4',
  });
}

export default i18n;
