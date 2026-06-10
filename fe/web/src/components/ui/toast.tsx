'use client';

/**
 * Toast — NB-styled transient notification, mirroring the mobile `NBToast`
 * (levels info/success/warning/danger, hard-edge chrome, auto-dismiss).
 *
 * Usage:
 *   const { toast } = useToast();
 *   toast({ level: 'danger', title: 'Gagal Masuk', body: '...' });
 *
 * Mount `<ToastProvider>` once near the app root (see app/providers.tsx).
 */

import * as React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

export type ToastLevel = 'info' | 'success' | 'warning' | 'danger';

export interface ToastOptions {
  level: ToastLevel;
  title: string;
  body?: string;
  /** Auto-dismiss delay in ms (default 5000). */
  durationMs?: number;
}

interface ActiveToast extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
  dismiss: (id: number) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

const LEVEL_CHROME: Record<
  ToastLevel,
  { container: string; icon: React.ComponentType<{ className?: string }>; iconClass: string }
> = {
  info: {
    container: 'bg-nb-info-light border-nb-info',
    icon: Info,
    iconClass: 'text-nb-black',
  },
  success: {
    container: 'bg-nb-success-light border-nb-success',
    icon: CheckCircle2,
    iconClass: 'text-nb-success-dark',
  },
  warning: {
    container: 'bg-nb-warning-light border-nb-warning',
    icon: AlertTriangle,
    iconClass: 'text-nb-black',
  },
  danger: {
    container: 'bg-nb-danger-light border-nb-danger',
    icon: AlertCircle,
    iconClass: 'text-nb-danger-dark',
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ActiveToast[]>([]);
  const counter = React.useRef(0);
  const timers = React.useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const handle = timers.current.get(id);
    if (handle) {
      clearTimeout(handle);
      timers.current.delete(id);
    }
  }, []);

  const toast = React.useCallback(
    (options: ToastOptions) => {
      counter.current += 1;
      const id = counter.current;
      setToasts((prev) => [...prev, { ...options, id }]);

      const handle = setTimeout(() => dismiss(id), options.durationMs ?? 5000);
      timers.current.set(id, handle);
    },
    [dismiss]
  );

  React.useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((handle) => clearTimeout(handle));
      map.clear();
    };
  }, []);

  const value = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
        role="region"
        aria-label="Notifikasi"
      >
        {toasts.map((t) => {
          const chrome = LEVEL_CHROME[t.level];
          const Icon = chrome.icon;
          return (
            <div
              key={t.id}
              role="alert"
              aria-live={t.level === 'danger' ? 'assertive' : 'polite'}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-nb-md border-2 p-3 shadow-nb-md',
                chrome.container
              )}
            >
              <Icon className={cn('mt-0.5 size-5 shrink-0', chrome.iconClass)} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-nb-body-sm font-bold text-nb-black">{t.title}</p>
                {t.body && <p className="mt-0.5 text-nb-caption text-nb-black/80">{t.body}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Tutup notifikasi"
                className="shrink-0 rounded-nb-sm p-0.5 text-nb-black/60 transition-colors hover:text-nb-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-nb-black"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/** Access the toast API. Must be used within `<ToastProvider>`. */
export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
