'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState, useEffect } from 'react';
import { AuthProvider } from '@/lib/auth/context';

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

  // Register service worker when PWA feature flag is enabled
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NEXT_PUBLIC_FEATURE_PWA === 'true'
    ) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          // Trigger background update check on each page load
          reg.update();
          // UpdateToast component listens for registration.waiting and handles the prompt
        })
        .catch(() => {
          // SW registration is non-critical — swallow errors
        });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
