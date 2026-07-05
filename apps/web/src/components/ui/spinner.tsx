'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils/cn';

const spinnerVariants = cva('animate-spin text-nb-black', {
  variants: {
    size: {
      sm: 'h-4 w-4',
      default: 'h-6 w-6',
      lg: 'h-8 w-8',
    },
  },
  defaultVariants: { size: 'default' },
});

export interface SpinnerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof spinnerVariants> {
  /** Accessible label announced to screen readers. */
  label?: string;
}

/** Spinner — an accessible loading indicator (Neo Brutalism ink). */
const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size, label, ...props }, ref) => {
    const { t } = useTranslation();
    const displayLabel = label ?? t('common:actions.loading');
    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        className={cn('inline-flex items-center justify-center', className)}
        {...props}
      >
        <Loader2 className={cn(spinnerVariants({ size }))} aria-hidden />
        <span className="sr-only">{displayLabel}</span>
      </div>
    );
  }
);
Spinner.displayName = 'Spinner';

export { Spinner, spinnerVariants };
