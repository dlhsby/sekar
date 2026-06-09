'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { WifiOff } from 'lucide-react';

const LAST_SYNC_KEY = 'sekar_last_sync';

/** Subscribe to browser connectivity changes. */
function subscribeOnline(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function readLastSync(): string | null {
  try {
    const stored = localStorage.getItem(LAST_SYNC_KEY);
    if (!stored) return null;
    const ms = parseInt(stored, 10);
    if (Number.isNaN(ms)) return null;
    return new Date(ms).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return null;
  }
}

/**
 * Offline status banner
 *
 * Renders a fixed top strip when `navigator.onLine === false`. Connectivity is
 * read via `useSyncExternalStore` (no setState-in-effect). `role="status"` so
 * screen readers announce the change.
 */
export function OfflineBanner() {
  const isOffline = useSyncExternalStore(
    subscribeOnline,
    () => !navigator.onLine,
    () => false // SSR snapshot: assume online
  );

  // Record the last time we were online (read back when offline). Pure
  // localStorage write — no component state, so no setState-in-effect.
  useEffect(() => {
    const recordOnline = () => localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
    if (navigator.onLine) recordOnline();
    window.addEventListener('online', recordOnline);
    return () => window.removeEventListener('online', recordOnline);
  }, []);

  if (!isOffline) return null;

  // Read on render — only reached client-side once offline.
  const lastSync = readLastSync();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Aplikasi sedang offline"
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-nb-warning px-4 py-2 text-nb-black border-b-2 border-nb-black"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="text-nb-caption font-semibold uppercase tracking-wide">
        Mode offline
        {lastSync ? ` — Data terakhir: ${lastSync}` : ''}
      </span>
    </div>
  );
}
