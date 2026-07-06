'use client';

import * as React from 'react';

import { cn } from '@/lib/utils/cn';

/**
 * PageHeader — the in-content page title block (hi-fi `.web-top`).
 *
 * Renders an optional mono breadcrumb, a Space-Grotesk page title, an optional
 * description, and a right-aligned actions slot. Reused at the top of every
 * dashboard route for a consistent masthead.
 */
export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /**
   * Page title. Optional — the dashboard top bar now renders the route title +
   * breadcrumb, so most in-body usages pass only a description/actions row.
   */
  title?: React.ReactNode;
  /** Mono breadcrumb shown above the title (e.g. "Operasional · Tugas"). */
  breadcrumb?: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned actions (buttons, toggles). */
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  breadcrumb,
  description,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn('flex flex-wrap items-start justify-between gap-4', className)}
      {...props}
    >
      <div className="min-w-0">
        {breadcrumb && (
          <div className="mb-1 font-mono text-nb-mono-sm uppercase tracking-wide text-nb-gray-500">
            {breadcrumb}
          </div>
        )}
        {title && <h1 className="text-nb-h1 text-nb-black">{title}</h1>}
        {description && (
          <p className="mt-1 text-nb-body-sm text-nb-gray-600">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
