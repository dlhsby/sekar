/**
 * Client-free i18n constants. Kept separate from config.ts so server-only modules
 * (e.g. server-metadata.ts used by route generateMetadata) can read the cookie name
 * without importing the client i18next init (react-i18next/LanguageDetector), which
 * would pull `createContext` into the server build and break `next build`.
 */
export const LANGUAGE_STORAGE_KEY = 'sekar_lang';
