'use client';

/**
 * Web i18n provider + language helpers.
 *
 * - `I18nProvider` wires react-i18next and keeps `<html lang>` in sync.
 * - `LanguageSync` applies the authenticated user's `preferred_language` once the
 *   profile loads (profile is authoritative over the local cache on sign-in).
 * - `useLanguage()` reads/sets the active language, persisting it locally (via the
 *   i18next detector cache) and best-effort to the user profile.
 */
import { ReactNode, useCallback, useEffect } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';

import i18n from './config';
import { updateMyLanguage } from '@/lib/api/profile';
import type { SupportedLanguage } from './resources';
import { SUPPORTED_LANGUAGES } from './resources';

function HtmlLangSync() {
  const { i18n: instance } = useTranslation();
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = instance.language || 'id';
    }
  }, [instance.language]);
  return null;
}

/**
 * Applies the locally-stored/detected language AFTER hydration. i18n initialises
 * at the default language (so server + client first paint match); once mounted
 * we run the detector (localStorage → cookie → `<html lang>`, which the server
 * already set from the cookie) and switch if it differs. This is a normal
 * post-hydration update, not a mismatch. `LanguageSync` (user profile) still
 * wins afterward when signed in.
 */
function LocalePreferenceSync() {
  useEffect(() => {
    const detector = i18n.services?.languageDetector as
      | { detect?: () => string | string[] | undefined }
      | undefined;
    const detected = detector?.detect?.();
    const target = normalize(Array.isArray(detected) ? detected[0] : detected);
    if (target && i18n.language !== target) {
      void i18n.changeLanguage(target);
    }
  }, []);
  return null;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <HtmlLangSync />
      <LocalePreferenceSync />
      {children}
    </I18nextProvider>
  );
}

/** Normalize any language tag ('en-US') to a supported base language. */
function normalize(lang?: string): SupportedLanguage | undefined {
  const base = lang?.split('-')[0];
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(base ?? '')
    ? (base as SupportedLanguage)
    : undefined;
}

/**
 * Applies the signed-in user's saved language preference. Mount inside the auth
 * provider. Runs whenever the preference changes; a no-op when already active.
 */
export function LanguageSync({ preferredLanguage }: { preferredLanguage?: string }) {
  useEffect(() => {
    const target = normalize(preferredLanguage);
    if (target && i18n.language !== target) {
      void i18n.changeLanguage(target);
    }
  }, [preferredLanguage]);
  return null;
}

export function useLanguage() {
  const { i18n: instance } = useTranslation();
  const language = normalize(instance.language) ?? 'id';

  const setLanguage = useCallback(async (lang: SupportedLanguage) => {
    await instance.changeLanguage(lang); // caches to localStorage + cookie via detector
    try {
      await updateMyLanguage(lang); // best-effort profile sync
    } catch {
      // Non-critical: the local switch already took effect.
    }
  }, [instance]);

  return { language, setLanguage, supported: SUPPORTED_LANGUAGES };
}
