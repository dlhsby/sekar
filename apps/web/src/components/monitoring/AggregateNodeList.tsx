'use client';

/**
 * AggregateNodeList — the side-panel list for the drill-down view. Shows one
 * row per node (district or area) with today's attendance trio
 * (Terjadwal / Hadir / Belum Hadir); clicking a row drills into it, mirroring a
 * map node tap.
 *
 * Rows can be hidden individually — 371 rows is not a list, and hiding by tier
 * is too blunt when the thing in the way is one rayon. Hiding is presentation
 * only: the numbers on every remaining row still count what was hidden.
 */
import { useTranslation } from 'react-i18next';
import { ChevronRight, AlertTriangle, Info, EyeOff } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import type { AggregateNode } from '@/lib/api/monitoring-v2';

export interface AggregateNodeListProps {
  nodes: AggregateNode[];
  onDrill: (node: AggregateNode) => void;
  /**
   * Opens the node's detail card. Optional: when absent the row is a single
   * drill button exactly as before. When present the row splits into two
   * targets, because a button nested inside a button is invalid HTML — and a
   * whole-row click that sometimes drills and sometimes opens detail would be
   * worse than either.
   */
  onDetail?: (node: AggregateNode) => void;
  /**
   * Show each row's tier and indent it. Only meaningful when the list mixes
   * tiers (zoom mode's whole-subtree listing) — in drill mode every row is the
   * same tier and the chips would be noise.
   */
  showTier?: boolean;
  /** Geo-filter selection (district/kawasan/lokasi id). Non-matching rows dim to
   *  match the map's spotlight. Null = no geo filter (all rows full strength). */
  activeGeoId?: string | null;
  /**
   * Row-level hide (see `lib/monitoring/hidden.ts`). When present each row gains
   * an eye button, and hidden rows are dropped from the list with a restore
   * banner above it — hiding must never be silent.
   */
  isHidden?: (id: string) => boolean;
  onToggleHidden?: (id: string) => void;
  onShowAllHidden?: () => void;
  /** Bare mode drops the bordered card chrome — for embedding inside a tab panel
   *  that already provides the container. */
  bare?: boolean;
  className?: string;
}

/**
 * A count in a row, muted when it is zero.
 *
 * These lists run to hundreds of rows and most numbers on most rows are 0. With
 * every value bold and semantically coloured, a screen of nothing-to-do looked
 * exactly as loud as a screen of problems, and the eye had to read each figure
 * to find out which. Zero is the resting state, so it recedes; a number that is
 * actually there keeps its colour and its weight.
 *
 * Muted to `gray-500` and no lighter. It is still a number the operator may need
 * to read, so it has to clear WCAG AA — 4.80:1 on white here, where gray-400 is
 * 2.52:1 and gray-300 only 1.49:1. "De-emphasised" is a contrast budget, not a
 * licence to make text invisible.
 */
function Count({ value, tone }: { value: number; tone: string }): React.JSX.Element {
  return (
    <span
      className={cn(
        'font-mono tabular-nums',
        value > 0 ? cn('font-bold', tone) : 'text-nb-gray-500'
      )}
    >
      {value}
    </span>
  );
}

export function AggregateNodeList({
  nodes,
  onDrill,
  onDetail,
  showTier,
  activeGeoId,
  isHidden,
  onToggleHidden,
  onShowAllHidden,
  bare,
  className,
}: AggregateNodeListProps) {
  const { t } = useTranslation();

  // Counts come from the SERVER over the full scope, so a hidden row changes
  // what is listed and never what is counted (see `hidden.ts`).
  const visible = isHidden ? nodes.filter((n) => !isHidden(n.id)) : nodes;
  const hiddenCount = nodes.length - visible.length;

  const restoreBanner = hiddenCount > 0 && onShowAllHidden && (
    <div className="flex items-center justify-between gap-2 border-b-2 border-nb-gray-100 bg-nb-gray-50 px-3 py-1.5 text-xs">
      <span className="font-bold text-nb-gray-600">
        {t('monitoring:hidden.count', { count: hiddenCount })}
      </span>
      <button
        type="button"
        onClick={onShowAllHidden}
        className="font-bold text-nb-black underline underline-offset-2 hover:text-nb-primary-active"
      >
        {t('monitoring:hidden.showAll')}
      </button>
    </div>
  );

  if (visible.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center p-4',
          !bare && 'rounded-nb-md border-2 border-nb-black bg-nb-white',
          className
        )}
      >
        {restoreBanner}
        <EmptyState variant="noData" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'overflow-y-auto',
        !bare && 'rounded-nb-md border-2 border-nb-black bg-nb-white',
        className
      )}
    >
      {restoreBanner}
      <ul className="divide-y-2 divide-nb-gray-100">
        {visible.map((node) => {
          const dimmed = activeGeoId != null && node.id !== activeGeoId;
          return (
          <li key={node.id} className="flex items-stretch">
            <button
              type="button"
              onClick={() => onDrill(node)}
              className={cn(
                // `min-w-0` is load-bearing, not decoration. A flex item defaults
                // to `min-width: auto`, so without it this button refuses to
                // shrink below its content — a long name ("Kawasan Manukan
                // Balongsari S.D Manukan") pushed the hide and detail buttons
                // clean off the row instead of ellipsising. The chain has to be
                // unbroken from here down to the name itself.
                'flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-3 text-left transition-colors hover:bg-nb-gray-50',
                dimmed && 'opacity-40',
                !showTier && 'pl-3',
                showTier && node.type === 'district' && 'pl-3',
                showTier && node.type === 'region' && 'pl-6',
                showTier && node.type === 'location' && 'pl-9'
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  {showTier && (
                    <span className="shrink-0 rounded-nb-sm border border-nb-gray-300 bg-nb-gray-50 px-1 text-[10px] font-bold uppercase text-nb-gray-500">
                      {t(`monitoring:hierarchy.${node.type === 'location' ? 'area' : node.type}`)}
                    </span>
                  )}
                  <span
                    className="min-w-0 truncate text-sm font-bold text-nb-black"
                    title={node.name}
                  >
                    {node.name}
                  </span>
                  {node.is_understaffed && (
                    <AlertTriangle
                      className="h-3.5 w-3.5 shrink-0 text-nb-danger-dark"
                      aria-label={t('monitoring:aggregate.understaffed')}
                    />
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-nb-gray-600">
                  <span className="flex items-baseline gap-1">
                    <Count value={node.roster.scheduled} tone="text-nb-black" />
                    {t('monitoring:aggregate.scheduledLabel')}
                  </span>
                  <span className="flex items-baseline gap-1">
                    <Count value={node.roster.clocked_in} tone="text-nb-success-dark" />
                    {t('monitoring:aggregate.clockedInLabel')}
                  </span>
                  <span className="flex items-baseline gap-1">
                    <Count value={node.roster.belum_hadir} tone="text-nb-warning" />
                    {t('monitoring:aggregate.belumHadirLabel')}
                  </span>
                  <span className="flex items-baseline gap-1">
                    <Count value={node.roster.tidak_hadir} tone="text-nb-danger-dark" />
                    {t('monitoring:aggregate.tidakHadirLabel')}
                  </span>
                </div>
                {/* Presence (ADR-050 axis 2) alongside the roster trio: the roster
                    says who was EXPECTED, presence says who is reachable right
                    now. A row showing only the roster cannot answer "are they
                    actually out there", which is the question the map exists for. */}
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-nb-gray-600">
                  <span className="flex items-baseline gap-1">
                    <Count
                      value={node.presence.aktif.dalam + node.presence.aktif.luar}
                      tone="text-[var(--color-status-active)]"
                    />
                    {t('monitoring:status.active')}
                  </span>
                  <span className="flex items-baseline gap-1">
                    <Count
                      value={node.presence.tidak_aktif.dalam + node.presence.tidak_aktif.luar}
                      tone="text-[var(--color-status-idle)]"
                    />
                    {t('monitoring:status.inactive')}
                  </span>
                  {node.presence.aktif.luar + node.presence.tidak_aktif.luar > 0 && (
                    <span className="flex items-baseline gap-1">
                      <span className="font-mono font-bold tabular-nums text-[var(--color-status-outside)]">
                        {node.presence.aktif.luar + node.presence.tidak_aktif.luar}
                      </span>
                      {t('monitoring:sidebar.outsideArea')}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-nb-gray-500" aria-hidden="true" />
            </button>
            {onToggleHidden && (
              <button
                type="button"
                onClick={() => onToggleHidden(node.id)}
                aria-label={t('monitoring:hidden.hideLabel', { name: node.name })}
                title={t('monitoring:hidden.hideLabel', { name: node.name })}
                className="shrink-0 border-l-2 border-nb-gray-100 px-2 text-nb-gray-500 transition-colors hover:bg-nb-gray-50 hover:text-nb-black"
              >
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            {onDetail && (
              <button
                type="button"
                onClick={() => onDetail(node)}
                aria-label={t('monitoring:aggregate.detailLabel', { name: node.name })}
                className={cn(
                  'shrink-0 border-l-2 border-nb-gray-100 px-3 text-nb-gray-500 transition-colors hover:bg-nb-gray-50 hover:text-nb-black',
                  dimmed && 'opacity-40'
                )}
              >
                <Info className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </li>
          );
        })}
      </ul>
    </div>
  );
}
