'use client';

/**
 * AggregateNodeList — the side-panel list for the "Ringkasan" view. Shows one
 * row per aggregate node (rayon or area) with online/required staffing and a
 * status breakdown; clicking a row drills into it, mirroring a map bubble tap.
 */
import { useTranslation } from 'react-i18next';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import { STATUS_DOT_CLASSES } from '@/lib/constants/monitoring';
import type { AggregateNode } from '@/lib/api/monitoring-v2';
import type { TrackingStatus } from '@/lib/api/monitoring-types';

export interface AggregateNodeListProps {
  nodes: AggregateNode[];
  onDrill: (node: AggregateNode) => void;
  className?: string;
}

const STATUS_ORDER: TrackingStatus[] = ['active', 'inactive', 'outside_area', 'missing'];

export function AggregateNodeList({ nodes, onDrill, className }: AggregateNodeListProps) {
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
        {nodes.map((node) => (
          <li key={node.id}>
            <button
              type="button"
              onClick={() => onDrill(node)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-nb-gray-50"
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
                <div className="mt-1 flex items-center gap-2 text-xs text-nb-gray-600">
                  <span className="font-mono tabular-nums text-nb-black">
                    {t('monitoring:aggregate.onlineOfRequired', {
                      online: node.online_count,
                      required: node.required,
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    {STATUS_ORDER.map((s) => {
                      const count = node.counts_by_status[s];
                      if (!count) return null;
                      return (
                        <span key={s} className="flex items-center gap-0.5">
                          <span
                            className={cn('h-2 w-2 rounded-full', STATUS_DOT_CLASSES[s])}
                            aria-hidden="true"
                          />
                          <span className="font-mono tabular-nums">{count}</span>
                        </span>
                      );
                    })}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-nb-gray-400" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
