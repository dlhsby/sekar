'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils/cn';

/**
 * SectionCard — titled content card (hi-fi `.card` with a header row).
 *
 * Used by the pruning-request detail, dashboard panels, settings panels:
 * a bordered card with an optional title + meta/action row above the body.
 */

const sectionCardVariants = cva('rounded-nb-md border-2 border-nb-black shadow-nb-sm', {
  variants: {
    tone: {
      white: 'bg-nb-white',
      mint: 'bg-accent-mint',
      yellow: 'bg-nb-primary-soft',
      paper: 'bg-nb-paper',
    },
  },
  defaultVariants: { tone: 'white' },
});

export interface SectionCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof sectionCardVariants> {
  title?: React.ReactNode;
  /** Right-aligned meta text or node in the header row. */
  meta?: React.ReactNode;
  /** Right-aligned action node (e.g. a button), rendered after `meta`. */
  action?: React.ReactNode;
  /** Removes the body padding (e.g. when embedding a full-bleed table). */
  flush?: boolean;
}

const SectionCard = React.forwardRef<HTMLElement, SectionCardProps>(
  ({
    title,
    meta,
    action,
    tone,
    flush = false,
    className,
    children,
    ...props
  }, ref) => (
    <section className={cn(sectionCardVariants({ tone }), className)} ref={ref} {...props}>
      {(title || meta || action) && (
        <header className="flex items-center justify-between gap-3 border-b-2 border-nb-black px-4 py-3">
          {title ? (
            <h3 className="text-nb-h3 text-nb-black">{title}</h3>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {meta && <span className="font-mono text-[11px] text-nb-gray-600">{meta}</span>}
            {action}
          </div>
        </header>
      )}
      <div className={cn(!flush && 'p-4')}>{children}</div>
    </section>
  )
);

SectionCard.displayName = 'SectionCard';

export { SectionCard, sectionCardVariants };
