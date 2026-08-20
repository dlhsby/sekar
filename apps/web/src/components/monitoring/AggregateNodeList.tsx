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
                'flex flex-1 items-center gap-3 py-2.5 pr-3 text-left transition-colors hover:bg-nb-gray-50',
                dimmed && 'opacity-40',
                !showTier && 'pl-3',
                showTier && node.type === 'district' && 'pl-3',
                showTier && node.type === 'region' && 'pl-6',
                showTier && node.type === 'location' && 'pl-9'
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {showTier && (
                    <span className="shrink-0 rounded-nb-sm border border-nb-gray-300 bg-nb-gray-50 px-1 text-[10px] font-bold uppercase text-nb-gray-500">
                      {t(`monitoring:hierarchy.${node.type === 'location' ? 'area' : node.type}`)}
                    </span>
                  )}
                  <span className="truncate text-sm font-bold text-nb-black">{node.name}</span>
                  {node.is_understaffed && (
                    <AlertTriangle
                      className="h-3.5 w-3.5 shrink-0 text-nb-danger-dark"
                      aria-label={t('monitoring:aggregate.understaffed')}
                    />
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-nb-gray-600">
                  <span className="flex items-baseline gap-1">
                    <span className="font-mono font-bold tabular-nums text-nb-black">
                      {node.roster.scheduled}
                    </span>
                    {t('monitoring:aggregate.scheduledLabel')}
                  </span>
                  <span className="flex items-baseline gap-1">
                    <span className="font-mono font-bold tabular-nums text-nb-success-dark">
                      {node.roster.clocked_in}
                    </span>
                    {t('monitoring:aggregate.clockedInLabel')}
                  </span>
                  <span className="flex items-baseline gap-1">
                    <span className="font-mono font-bold tabular-nums text-nb-warning">
                      {node.roster.belum_hadir}
                    </span>
                    {t('monitoring:aggregate.belumHadirLabel')}
                  </span>
                  <span className="flex items-baseline gap-1">
                    <span className="font-mono font-bold tabular-nums text-nb-danger-dark">
                      {node.roster.tidak_hadir}
                    </span>
                    {t('monitoring:aggregate.tidakHadirLabel')}
                  </span>
                </div>
                {/* Presence (ADR-050 axis 2) alongside the roster trio: the roster
                    says who was EXPECTED, presence says who is reachable right
                    now. A row showing only the roster cannot answer "are they
                    actually out there", which is the question the map exists for. */}
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-nb-gray-600">
                  <span className="flex items-baseline gap-1">
                    <span className="font-mono font-bold tabular-nums text-[var(--color-status-active)]">
                      {node.presence.aktif.dalam + node.presence.aktif.luar}
                    </span>
                    {t('monitoring:status.active')}
                  </span>
                  <span className="flex items-baseline gap-1">
                    <span className="font-mono font-bold tabular-nums text-[var(--color-status-idle)]">
                      {node.presence.tidak_aktif.dalam + node.presence.tidak_aktif.luar}
                    </span>
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
              <ChevronRight className="h-4 w-4 shrink-0 text-nb-gray-400" aria-hidden="true" />
            </button>
            {onToggleHidden && (
              <button
                type="button"
                onClick={() => onToggleHidden(node.id)}
                aria-label={t('monitoring:hidden.hideLabel', { name: node.name })}
                title={t('monitoring:hidden.hideLabel', { name: node.name })}
                className="shrink-0 border-l-2 border-nb-gray-100 px-2 text-nb-gray-400 transition-colors hover:bg-nb-gray-50 hover:text-nb-black"
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
                  'shrink-0 border-l-2 border-nb-gray-100 px-3 text-nb-gray-400 transition-colors hover:bg-nb-gray-50 hover:text-nb-black',
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
