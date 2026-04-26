'use client';

import { useEffect, useState } from 'react';
import { X, Smartphone } from 'lucide-react';
import { useAuth } from '@/lib/auth/hooks';

const DISMISS_SESSION_KEY = 'sekar_mobile_push_dismissed';

// Roles that should be directed to the native app on mobile
const NATIVE_APP_ROLES = new Set(['satgas', 'linmas', 'korlap']);

/**
 * Mobile install push banner
 *
 * Displayed only on viewports < 768px (via CSS) for satgas, linmas, and korlap
 * roles. Directs them to the Play Store or App Store for the native SEKAR app.
 * Dismissed per-session via sessionStorage.
 */
export function MobileInstallPush() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!NATIVE_APP_ROLES.has(user.role)) return;
    if (sessionStorage.getItem(DISMISS_SESSION_KEY)) return;

    setVisible(true);
  }, [user]);

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_SESSION_KEY, '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    // Hidden on md+ via CSS — no JS media query needed
    <div className="sm:hidden">
      <div
        role="complementary"
        aria-label="Unduh aplikasi SEKAR"
        className="mt-4 rounded-nb-base border-2 border-nb-black p-4 shadow-nb-sm bg-nb-background"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 rounded-nb-sm border-2 border-nb-black p-2 bg-nb-primary">
              <Smartphone className="h-5 w-5 text-nb-black" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-nb-body-sm font-bold uppercase tracking-wide text-nb-black">
                Unduh Aplikasi SEKAR
              </p>
              <p className="text-nb-caption text-nb-gray-600 mt-0.5">
                Untuk pengalaman lebih baik dengan GPS, kamera, dan notifikasi push
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 rounded-nb-sm border border-nb-black p-1 hover:bg-black/10"
            aria-label="Tutup"
          >
            <X className="h-4 w-4 text-nb-black" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <a
            href="https://play.google.com/store/apps/details?id=id.go.dlhsurabaya.sekar"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-nb-base border-2 border-nb-black bg-nb-black py-2 text-center text-nb-caption font-bold uppercase text-white shadow-nb-xs hover:shadow-nb-sm active:shadow-none"
          >
            Google Play
          </a>
          <a
            href="https://apps.apple.com/id/app/sekar-dlh-surabaya/id0"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-nb-base border-2 border-nb-black bg-nb-gray-100 py-2 text-center text-nb-caption font-bold uppercase text-nb-black shadow-nb-xs hover:shadow-nb-sm active:shadow-none"
          >
            App Store
          </a>
        </div>
      </div>
    </div>
  );
}
