'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState, useEffect } from 'react';
import { AuthProvider } from '@/lib/auth/context';
import { ToastProvider } from '@/components/ui/toast';
import { I18nProvider, LanguageSync } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/auth/hooks';

/** Applies the signed-in user's saved language once the profile loads. */
function AuthLanguageSync() {
  const { user } = useAuth();
  return <LanguageSync preferredLanguage={user?.preferred_language} />;
}

/**
 * Providers component wrapping the app with necessary providers
 * - TanStack Query for server state management
 * - Auth Provider for authentication state
 * - Service Worker registration (feature-flagged via NEXT_PUBLIC_FEATURE_PWA)
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  // Register the service worker when the PWA flag is on; otherwise actively
  // tear down any previously-registered SW so flipping the flag off (or a client
  // that registered while it was on) doesn't leave a stale worker behind — a
  // stuck "waiting" worker otherwise re-triggers the update toast on every load.
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    if (process.env.NEXT_PUBLIC_FEATURE_PWA === 'true') {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          // Trigger background update check on each page load.
          reg.update();
          // UpdateToast listens for registration.waiting and handles the prompt.
        })
        .catch(() => {
          // SW registration is non-critical — swallow errors.
        });
    } else {
      // Kill switch: unregister existing workers and drop their caches.
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((reg) => reg.unregister()))
        .catch(() => {});
      if ('caches' in window) {
        caches
          .keys()
          .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
          .catch(() => {});
      }
    }
  }, []);

  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <AuthLanguageSync />
            {children}
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
}
