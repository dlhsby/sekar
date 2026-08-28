'use client';

/**
 * Where you are in the drill hierarchy, and the way back out.
 *
 * Extracted because it is now rendered twice — above the map, and in the header
 * of the Wilayah/Petugas panel. Those two must never disagree about the current
 * level, and the surest way to guarantee that is for there to be one of them.
 *
 * Both instances read the same `crumbs` the page already builds, so nothing here
 * knows about scopes, drilling, or geography names.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils/cn';

export interface Crumb {
  key: string;
  label: string;
  /** Absent on the current level — it is where you already are. */
  onClick?: () => void;
}

export interface MonitoringBreadcrumbProps {
  crumbs: Crumb[];
  canGoBack: boolean;
  onBack: () => void;
  /**
   * Panel variant. The map's bar is full width and can hide the trail on small
   * screens in favour of the back button; the panel is narrow at every size, so
   * it keeps the trail and lets it scroll instead. Same markup, different
   * pressure on the space.
   */
  compact?: boolean;
  className?: string;
}

export function MonitoringBreadcrumb({
  crumbs,
  canGoBack,
  onBack,
  compact = false,
  className,
}: MonitoringBreadcrumbProps) {
  const { t } = useTranslation();
  const current = crumbs[crumbs.length - 1];

  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      {canGoBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={t('monitoring:page.backLabel')}
          className={cn(
            'flex shrink-0 items-center justify-center rounded-nb-sm text-nb-black hover:bg-nb-gray-100',
            compact ? 'h-6 w-6' : 'h-8 w-8'
          )}
        >
          <ChevronLeft className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </button>
      )}
      <nav
        className={cn(
          'flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap',
          compact ? 'text-xs' : 'text-sm'
        )}
        aria-label={t('monitoring:breadcrumb.label')}
      >
        {/* Map bar on mobile (<sm): current level only. The ‹ back handles going
            up, so intermediate crumbs (and their truncation) are dropped for
            space. The panel never does this — see `compact`. */}
        {!compact && (
          <span className="truncate font-bold text-nb-black sm:hidden" aria-current="page">
            {current?.label}
          </span>
        )}
        <span className={cn('items-center gap-1', compact ? 'flex' : 'hidden sm:flex')}>
          {crumbs.map((c, i) => (
            <span key={c.key} className="flex shrink-0 items-center gap-1">
              {i > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-nb-gray-400" aria-hidden="true" />
              )}
              {c.onClick ? (
                <button
                  type="button"
                  onClick={c.onClick}
                  className="max-w-[8rem] truncate font-semibold text-nb-gray-600 hover:text-nb-black hover:underline"
                >
                  {c.label}
                </button>
              ) : (
                <span
                  className="max-w-[10rem] truncate font-bold text-nb-black"
                  aria-current="page"
                >
                  {c.label}
                </span>
              )}
            </span>
          ))}
        </span>
      </nav>
    </div>
  );
}
