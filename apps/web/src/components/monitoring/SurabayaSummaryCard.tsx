'use client';

/**
 * SurabayaSummaryCard — the top-level (city-wide) summary shown before drilling
 * into rayons. Displays today's attendance trio for all of Surabaya
 * (Terjadwal / Hadir / Belum Hadir) and drills into the 7 rayons on click,
 * mirroring the Surabaya map node.
 */
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { AggregateRosterCounts } from '@/lib/api/monitoring-v2';

export interface SurabayaSummaryCardProps {
  roster: AggregateRosterCounts;
  onDrill: () => void;
  className?: string;
}

export function SurabayaSummaryCard({ roster, onDrill, className }: SurabayaSummaryCardProps) {
  const { t } = useTranslation();

  const metrics: { key: string; label: string; value: number; tone: string }[] = [
    {
      key: 'scheduled',
      label: t('monitoring:aggregate.scheduledLabel'),
      value: roster.scheduled,
      tone: 'text-nb-black',
    },
    {
      key: 'clocked_in',
      label: t('monitoring:aggregate.clockedInLabel'),
      value: roster.clocked_in,
      tone: 'text-nb-success-dark',
    },
    {
      key: 'not_clocked_in',
      label: t('monitoring:aggregate.notClockedInLabel'),
      value: roster.not_clocked_in,
      tone: 'text-nb-danger-dark',
    },
  ];

  return (
    <button
      type="button"
      onClick={onDrill}
      className={cn(
        'pointer-events-auto flex w-full items-center gap-3 rounded-nb-md border-2 border-nb-black bg-nb-white px-4 py-3 text-left shadow-nb-md transition-transform hover:-translate-y-0.5 active:translate-y-0',
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-nb-h3 font-bold text-nb-black">
          {t('monitoring:surabaya.title')}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {metrics.map((m) => (
            <span key={m.key} className="flex items-baseline gap-1.5">
              <span className={cn('font-mono text-xl font-bold tabular-nums', m.tone)}>
                {m.value}
              </span>
              <span className="text-xs font-semibold text-nb-gray-600">{m.label}</span>
            </span>
          ))}
        </div>
        <div className="mt-1 text-xs text-nb-gray-500">{t('monitoring:surabaya.tapHint')}</div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-nb-gray-400" aria-hidden="true" />
    </button>
  );
}
