/**
 * User preferences (device-local) — currently the UI language.
 *
 * The language is persisted to AsyncStorage (offline fallback) and, when signed
 * in, mirrored to the user profile (`preferred_language`) so it follows the user
 * across devices. Redux holds it so the language switcher re-renders instantly.
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { SupportedLanguage } from '../../i18n/resources';
import { DEFAULT_LANGUAGE } from '../../i18n/resources';

interface PreferencesState {
  language: SupportedLanguage;
}

const initialState: PreferencesState = {
  language: DEFAULT_LANGUAGE,
};

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setLanguageState(state, action: PayloadAction<SupportedLanguage>) {
      state.language = action.payload;
    },
  },
});

export const { setLanguageState } = preferencesSlice.actions;
export default preferencesSlice.reducer;
