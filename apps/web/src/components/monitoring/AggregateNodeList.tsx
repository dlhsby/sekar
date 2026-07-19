'use client';

/**
 * AggregateNodeList — the side-panel list for the drill-down view. Shows one
 * row per node (rayon or area) with today's attendance trio
 * (Terjadwal / Hadir / Belum Hadir); clicking a row drills into it, mirroring a
 * map node tap.
 */
import { useTranslation } from 'react-i18next';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import type { AggregateNode } from '@/lib/api/monitoring-v2';

export interface AggregateNodeListProps {
  nodes: AggregateNode[];
  onDrill: (node: AggregateNode) => void;
  /** Geo-filter selection (rayon/kawasan/lokasi id). Non-matching rows dim to
   *  match the map's spotlight. Null = no geo filter (all rows full strength). */
  activeGeoId?: string | null;
  className?: string;
}

export function AggregateNodeList({ nodes, onDrill, activeGeoId, className }: AggregateNodeListProps) {
  const { t } = useTranslation();

  if (nodes.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-nb-md border-2 border-nb-black bg-nb-white p-4',
          className
        )}
      >
        <EmptyState variant="noData" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'overflow-y-auto rounded-nb-md border-2 border-nb-black bg-nb-white',
        className
      )}
    >
      <ul className="divide-y-2 divide-nb-gray-100">
        {nodes.map((node) => {
          const dimmed = activeGeoId != null && node.id !== activeGeoId;
          return (
          <li key={node.id}>
            <button
              type="button"
              onClick={() => onDrill(node)}
              className={cn(
                'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-nb-gray-50',
                dimmed && 'opacity-40'
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
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
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-nb-gray-400" aria-hidden="true" />
            </button>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
