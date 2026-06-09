'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

/**
 * Alert — inline feedback banner (web mirror of mobile NBAlert).
 *
 * Mirrors the hi-fi `.toast`/`.annot` primitives: bordered, hard-edge shadow,
 * tinted by tone, with a leading icon. For transient feedback use the existing
 * `sonner` toaster; use this for persistent in-page notices.
 */

const alertVariants = cva(
  'flex items-start gap-3 rounded-nb-base border-2 border-nb-black p-3 shadow-nb-xs',
  {
    variants: {
      tone: {
        success: 'bg-status-active-bg',
        warning: 'bg-status-idle-bg',
        danger: 'bg-status-missing-bg',
        info: 'bg-accent-mint',
      },
    },
    defaultVariants: { tone: 'info' },
  }
);

const ICONS: Record<NonNullable<AlertProps['tone']>, LucideIcon> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
};

export interface AlertProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof alertVariants> {
  title?: React.ReactNode;
}

export function Alert({ tone, title, className, children, ...props }: AlertProps) {
  const Icon = ICONS[tone ?? 'info'];
  return (
    <div role="alert" className={cn(alertVariants({ tone }), className)} {...props}>
      <Icon className="mt-0.5 size-5 shrink-0 text-nb-black" aria-hidden="true" />
      <div className="min-w-0 text-nb-body-sm text-nb-black">
        {title && <p className="font-bold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5')}>{children}</div>}
      </div>
    </div>
  );
}

export { alertVariants };
