/**
 * Language orchestration for the mobile app.
 *
 * Ties together i18next (active language), AsyncStorage (offline persistence),
 * the Redux `preferences` slice (instant re-render), and the user profile
 * (`preferred_language`, cross-device sync).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Dispatch } from '@reduxjs/toolkit';

import i18n from './config';
import { patch } from '../services/api/apiClient';
import { setLanguageState } from '../store/slices/preferencesSlice';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from './resources';

/** Coerce any value to a supported language, else the default. */
export function normalizeLanguage(value?: string | null): SupportedLanguage {
  const base = value?.split('-')[0];
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(base ?? '')
    ? (base as SupportedLanguage)
    : DEFAULT_LANGUAGE;
}

/**
 * Read the persisted language from AsyncStorage at startup and apply it to
 * i18next + Redux. Safe to call before the first render; falls back to the
 * default when nothing is stored or storage is unavailable.
 */
export async function bootstrapLanguage(dispatch: Dispatch): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    const lang = normalizeLanguage(stored);
    if (i18n.language !== lang) {
      await i18n.changeLanguage(lang);
    }
    dispatch(setLanguageState(lang));
  } catch {
    // Storage unavailable — keep the default; non-fatal.
  }
}

/**
 * Apply a language choice: switch i18next, persist locally, update Redux, and
 * (optionally) sync to the user profile. The local switch always takes effect
 * even if the profile sync fails.
 */
export async function applyLanguage(
  lang: SupportedLanguage,
  dispatch: Dispatch,
  options: { persistProfile?: boolean } = {},
): Promise<void> {
  await i18n.changeLanguage(lang);
  dispatch(setLanguageState(lang));
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // Non-fatal: the in-memory switch already applied.
  }
  if (options.persistProfile) {
    try {
      await patch('/users/me', { preferred_language: lang });
    } catch {
      // Best-effort cross-device sync; the local choice stands regardless.
    }
  }
}
