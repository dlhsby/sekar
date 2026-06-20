'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import './globals.css';

/**
 * App Router global error boundary. Catches errors that escape the root layout,
 * reports them to Sentry (no-op when Sentry isn't initialized), and renders a
 * Neo-Brutalism fallback. It must render its own <html>/<body> because it
 * replaces the root layout, so it imports globals.css to get the design tokens.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="id">
      <body className="flex min-h-screen items-center justify-center bg-nb-background p-6">
        <div className="w-full max-w-[420px] rounded-nb-md border-2 border-nb-black bg-nb-white p-6 shadow-nb-lg">
          <h1 className="mb-2 text-nb-h2 text-nb-black">Terjadi kesalahan</h1>
          <p className="mb-5 text-nb-body-sm text-nb-gray-600">
            Maaf, terjadi kesalahan tak terduga. Tim kami sudah diberi tahu. Silakan coba lagi.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="min-h-touch w-full rounded-nb-base border-2 border-nb-black bg-nb-primary text-nb-body font-bold text-nb-black shadow-nb-md"
          >
            Coba lagi
          </button>
        </div>
      </body>
    </html>
  );
}
