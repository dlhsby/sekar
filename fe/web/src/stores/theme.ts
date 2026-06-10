/**
 * Theme store (Phase 4-R — dark mode)
 *
 * Light/dark toggle persisted to localStorage under `sekar-theme`. The actual
 * `.dark` class is applied to <html> by a no-flash inline script in the root
 * layout BEFORE first paint; this store mirrors that and lets the toggle flip
 * it. `init()` syncs the store to whatever the inline script already applied.
 */
import { create } from 'zustand';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'sekar-theme';

const applyTheme = (theme: Theme) => {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

interface ThemeState {
  theme: Theme;
  /** Sync the store to the class the no-flash script already set on <html>. */
  init: () => void;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  init: () => {
    const isDark =
      typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    set({ theme: isDark ? 'dark' : 'light' });
  },
  setTheme: (theme) => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage failures (private mode, etc.)
    }
    set({ theme });
  },
  toggle: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
}));
