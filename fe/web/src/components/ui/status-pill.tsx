'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils/cn';

/**
 * StatusPill — token-driven status chip (web mirror of mobile common/StatusIndicator).
 *
 * Mirrors the hi-fi `.pill` primitive (hifi-shared.css): JetBrains-Mono caption,
 * full-radius, 1.5px black border, optional leading dot. The `tone` covers both
 * the generic semantic palette (ok/warn/bad/info) and the canonical 5-status
 * monitoring palette (active/idle/outside/missing/offline) so map pins, badges
 * and KPI chips all draw from one source.
 */
const statusPillVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-nb-black px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide leading-none',
  {
    variants: {
      tone: {
        neutral: 'bg-nb-white text-nb-black',
        ok: 'bg-status-active-bg text-status-active',
        warn: 'bg-status-idle-bg text-status-idle',
        bad: 'bg-status-missing-bg text-status-missing',
        info: 'bg-nb-info-light text-nb-black',
        dark: 'bg-nb-black text-nb-primary',
        active: 'bg-status-active-bg text-status-active',
        idle: 'bg-status-idle-bg text-status-idle',
        outside: 'bg-status-outside-bg text-status-outside',
        missing: 'bg-status-missing-bg text-status-missing',
        offline: 'bg-status-offline-bg text-status-offline',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  }
);

export interface StatusPillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusPillVariants> {
  /** Show a leading dot in the current text colour. */
  dot?: boolean;
}

const StatusPill = React.forwardRef<HTMLSpanElement, StatusPillProps>(
  ({ className, tone, dot = false, children, ...props }, ref) => (
    <span className={cn(statusPillVariants({ tone }), className)} ref={ref} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  )
);

StatusPill.displayName = 'StatusPill';

export { StatusPill, statusPillVariants };
