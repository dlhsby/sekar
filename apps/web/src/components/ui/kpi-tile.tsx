'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

/**
 * KpiTile + KpiGrid — dashboard / rayon-detail summary tiles.
 *
 * Mirrors the hi-fi `.card.kpi` + `.kpi-h/.kpi-v/.kpi-d` primitives:
 * mono uppercase eyebrow, Space-Grotesk numeral, optional delta with arrow.
 */

const kpiTileVariants = cva(
  'flex flex-col rounded-nb-md border-2 border-nb-black p-5 shadow-nb-sm',
  {
    variants: {
      tone: {
        white: 'bg-nb-white',
        yellow: 'bg-nb-primary-soft',
        mint: 'bg-accent-mint',
        pink: 'bg-accent-pink',
        lilac: 'bg-accent-lilac',
        paper: 'bg-nb-paper',
      },
    },
    defaultVariants: { tone: 'white' },
  }
);

export interface KpiTileProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof kpiTileVariants> {
  label: string;
  value: React.ReactNode;
  /** Optional sub-line; pair with `deltaDirection` to show a coloured arrow. */
  delta?: string;
  deltaDirection?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}

const KpiTile = React.forwardRef<HTMLDivElement, KpiTileProps>(
  ({
    label,
    value,
    delta,
    deltaDirection = 'neutral',
    icon,
    tone,
    className,
    ...props
  }, ref) => (
    <div className={cn(kpiTileVariants({ tone }), className)} ref={ref} {...props}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="font-mono text-nb-mono-sm font-bold uppercase tracking-wide text-nb-gray-600">
          {label}
        </p>
        {icon && <span className="text-nb-gray-600 [&_svg]:size-4">{icon}</span>}
      </div>
      <p className="mb-1.5 font-heading text-[32px] font-extrabold leading-none tracking-tight text-nb-black">
        {value}
      </p>
      {delta && (
        <p
          className={cn(
            'flex items-center gap-1 font-mono text-nb-mono-sm font-semibold',
            deltaDirection === 'up' && 'text-status-active',
            deltaDirection === 'down' && 'text-status-missing',
            deltaDirection === 'neutral' && 'text-nb-gray-600'
          )}
        >
          {deltaDirection === 'up' && <ArrowUpRight className="size-3.5" />}
          {deltaDirection === 'down' && <ArrowDownRight className="size-3.5" />}
          {delta}
        </p>
      )}
    </div>
  )
);

KpiTile.displayName = 'KpiTile';

export interface KpiGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Columns at the widest breakpoint (default 4). */
  columns?: 2 | 3 | 4;
}

const COLS: Record<NonNullable<KpiGridProps['columns']>, string> = {
  2: 'sm:grid-cols-2',
  3: 'grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
};

const KpiGrid = React.forwardRef<HTMLDivElement, KpiGridProps>(
  ({ columns = 4, className, ...props }, ref) => (
    <div className={cn('grid gap-4', COLS[columns], className)} ref={ref} {...props} />
  )
);

KpiGrid.displayName = 'KpiGrid';

export { KpiTile, KpiGrid, kpiTileVariants };
