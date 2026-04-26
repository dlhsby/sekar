'use client';

import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';

const DISMISS_KEY = 'sekar_install_dismissed';
const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWA install banner
 *
 * Captures the `beforeinstallprompt` event and renders a Neo Brutalism
 * callout prompting the user to install SEKAR as a PWA. The banner is
 * suppressed for 14 days after the user dismisses it and never shown when
 * the app is already running in standalone mode.
 */
export function InstallBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Do not show when already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Do not show within 14-day suppression window
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (!isNaN(dismissedAt) && Date.now() - dismissedAt < DISMISS_DURATION_MS) {
        return;
      }
    }

    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  function handleInstall() {
    if (!promptEvent) return;
    promptEvent.prompt();
    setVisible(false);
    setPromptEvent(null);
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
    setPromptEvent(null);
  }

  if (!visible) return null;

  return (
    <div
      role="banner"
      aria-label="Pasang aplikasi SEKAR"
      className="fixed bottom-0 left-0 right-0 z-40 p-3"
    >
      <div
        className="flex items-center justify-between gap-3 rounded-nb-base border-2 border-nb-black p-3 shadow-nb-sm"
        style={{ background: 'var(--color-bg-accent-yellow)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Download className="h-5 w-5 shrink-0 text-nb-black" aria-hidden="true" />
          <span className="text-nb-body-sm font-semibold uppercase text-nb-black tracking-wide truncate">
            Pasang Aplikasi
          </span>
          <span className="hidden sm:inline text-nb-body-sm text-nb-black">
            — Akses lebih cepat tanpa browser
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstall}
            className="rounded-nb-base border-2 border-nb-black bg-nb-primary px-3 py-1 text-nb-caption font-bold uppercase text-nb-black shadow-nb-xs transition-shadow hover:shadow-nb-sm active:shadow-none"
            aria-label="Pasang aplikasi SEKAR"
          >
            Pasang
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-nb-sm border border-nb-black bg-transparent p-1 text-nb-black hover:bg-black/10"
            aria-label="Tutup banner instalasi"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
