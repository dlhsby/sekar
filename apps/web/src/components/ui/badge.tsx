'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 border-2 border-nb-black rounded-nb-sm shadow-nb-xs font-semibold uppercase transition-colors',
  {
    variants: {
      variant: {
        // Ink-on-color (WCAG AA): white on sage/coral is ~2.2:1; ink is 6.8-7.6:1
        default: 'bg-nb-primary text-nb-ink',
        secondary: 'bg-nb-gray-100 text-nb-black',
        destructive: 'bg-nb-danger text-nb-ink',
        success: 'bg-nb-success text-nb-ink',
        warning: 'bg-nb-warning text-nb-ink',
        outline: 'bg-transparent text-nb-black',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        default: 'px-3 py-1 text-sm',
        lg: 'px-4 py-1.5 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
  onRemove?: () => void;
  /** Accessible label for the remove (✕) button. Defaults to "Hapus <label>". */
  removeLabel?: string;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, icon, onRemove, removeLabel, children, ...props }, ref) => {
    const { t } = useTranslation();
    const defaultRemoveLabel = typeof children === 'string'
      ? t('common:actions.removeLabel', { label: children })
      : t('common:actions.delete');

    return (
      <div className={cn(badgeVariants({ variant, size }), className)} ref={ref} {...props}>
        {icon && <span className="[&_svg]:size-3">{icon}</span>}
        {children}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-1 hover:opacity-70 transition-opacity"
            aria-label={removeLabel ?? defaultRemoveLabel}
          >
            <X className="size-3" />
          </button>
        )}
      </div>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
