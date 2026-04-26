'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

const LAST_SYNC_KEY = 'sekar_last_sync';

/**
 * Offline status banner
 *
 * Renders a fixed top strip when `navigator.onLine === false`.
 * Uses `role="status"` so screen readers announce the change.
 * Shows the last known sync time from localStorage if available.
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    function readLastSync() {
      const stored = localStorage.getItem(LAST_SYNC_KEY);
      if (stored) {
        const ms = parseInt(stored, 10);
        if (!isNaN(ms)) {
          setLastSync(new Date(ms).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
        }
      }
    }

    function handleOffline() {
      setIsOffline(true);
      readLastSync();
    }

    function handleOnline() {
      setIsOffline(false);
      localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
    }

    // Reflect initial state
    setIsOffline(!navigator.onLine);
    if (!navigator.onLine) readLastSync();

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline) return null;

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
