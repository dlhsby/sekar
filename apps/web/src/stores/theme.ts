/**
 * Theme store (Phase 4-R — dark mode)
 *
 * Light/dark toggle persisted to localStorage under `sekar-theme` AND mirrored
 * to a same-named cookie. The cookie lets the root layout render the `.dark`
 * class server-side (no inline no-flash script → no React "raw <script>"
 * warning). `init()` resolves the effective theme on mount (stored → system
 * preference), applies it, and syncs the cookie for the next SSR.
 */
import { create } from 'zustand';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'sekar-theme';

const applyTheme = (theme: Theme) => {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

const writeThemeCookie = (theme: Theme) => {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${THEME_STORAGE_KEY}=${theme}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // ignore (cookies disabled)
  }
};

const readStoredTheme = (): Theme | null => {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === 'dark' || v === 'light' ? v : null;
  } catch {
    return null;
  }
};

interface ThemeState {
  theme: Theme;
  /** Resolve stored → system theme, apply it, and sync the SSR cookie. */
  init: () => void;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  init: () => {
    if (typeof document === 'undefined') return;
    const stored = readStoredTheme();
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const theme: Theme = stored ?? (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
    writeThemeCookie(theme);
    set({ theme });
  },
  setTheme: (theme) => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage failures (private mode, etc.)
    }
    writeThemeCookie(theme);
    set({ theme });
  },
  toggle: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
}));
