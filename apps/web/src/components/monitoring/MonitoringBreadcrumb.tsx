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
   * Panel variant: the CURRENT level only, plus the way back.
   *
   * The panel is narrow at every size. A full trail there could only be shown by
   * scrolling it sideways, and a breadcrumb you have to scroll has stopped
   * answering the question it exists for — you cannot see where you are at a
   * glance. So the panel answers only that question, and ‹ handles going up.
   * The map's bar above it still carries the whole clickable trail.
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
          'flex min-w-0 flex-1 items-center gap-1 whitespace-nowrap',
          compact ? 'text-xs' : 'text-sm'
        )}
        aria-label={t('monitoring:breadcrumb.label')}
      >
        {/* Current level only — the panel always, and the map's bar below `sm`.
            In both cases there is no room for a trail, and ‹ covers going up. */}
        <span
          className={cn('min-w-0 truncate font-bold text-nb-black', !compact && 'sm:hidden')}
          aria-current="page"
        >
          {current?.label}
        </span>

        {/* Map bar at ≥sm: the whole clickable trail, so an ancestor is one press
            away rather than several. Ancestors truncate at a fixed width and the
            CURRENT level takes whatever is left — it is the one you are reading,
            so it is the last thing that should be cut. Nothing scrolls: a
            breadcrumb you have to scroll cannot be read at a glance. */}
        {!compact && (
          <span className="hidden min-w-0 flex-1 items-center gap-1 sm:flex">
            {crumbs.map((c, i) => (
              <span
                key={c.key}
                className={cn(
                  'flex items-center gap-1',
                  c.onClick ? 'shrink-0' : 'min-w-0 flex-1'
                )}
              >
                {i > 0 && (
                  <ChevronRight
                    className="h-3.5 w-3.5 shrink-0 text-nb-gray-400"
                    aria-hidden="true"
                  />
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
                  <span className="min-w-0 truncate font-bold text-nb-black" aria-current="page">
                    {c.label}
                  </span>
                )}
              </span>
            ))}
          </span>
        )}
      </nav>
    </div>
  );
}
