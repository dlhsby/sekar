'use client';

/**
 * ThemeToggle — light/dark switch for the top bar.
 * Renders a stable icon until mounted to avoid a hydration mismatch (the real
 * theme is decided by the no-flash inline script, not by SSR).
 */
import { useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/stores/theme';
import { cn } from '@/lib/utils/cn';

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useThemeStore((s) => s.theme);
  const init = useThemeStore((s) => s.init);
  const toggle = useThemeStore((s) => s.toggle);

  // Sync the store to the class the no-flash script already applied. The store
  // defaults to 'light' on both server and first client render (init runs after
  // paint), so there's no hydration mismatch.
  useEffect(() => {
    init();
  }, [init]);

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
      title={isDark ? 'Mode terang' : 'Mode gelap'}
      className={cn(
        'flex size-10 items-center justify-center rounded-nb-base border-2 border-nb-black bg-nb-white text-nb-black shadow-nb-sm transition-colors hover:bg-nb-gray-50',
        'focus-visible:outline focus-visible:outline-4 focus-visible:outline-nb-primary/50 focus-visible:outline-offset-2',
        className
      )}
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
