'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  formatISO,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { todayJakartaISODate } from '@/lib/utils/formatters';

interface YearViewProps {
  year: number;
  onSelectMonth: (monthIndex: number) => void;
  onSelectDay: (isoDate: string) => void;
  localeCode: string;
  /** isoDate → occupancy count, for the load heatmap. */
  counts?: Map<string, number>;
}

const NO_COUNTS = new Map<string, number>();

/** Heatmap bucket (0–4) for a day's count relative to the year's peak. */
function bucketOf(count: number, max: number): number {
  if (count <= 0 || max <= 0) return 0;
  const r = count / max;
  if (r <= 0.25) return 1;
  if (r <= 0.5) return 2;
  if (r <= 0.75) return 3;
  return 4;
}

/**
 * Green ramp by bucket. Uses opacity tints of the (theme-flipping) nb-primary
 * over the flipping card, with inherited (flipping) text — so contrast holds in
 * both light and dark mode (a fixed ink on a non-flipping fill would not).
 */
const BUCKET_BG = ['', 'bg-nb-primary/25', 'bg-nb-primary/45', 'bg-nb-primary/70', 'bg-nb-primary'];

/**
 * Year overview — 12 mini month calendars (Google-Calendar style) with a load
 * heatmap. Click a month name to open the month view; click a day to open it.
 */
export function YearView({
  year,
  onSelectMonth,
  onSelectDay,
  localeCode,
  counts = NO_COUNTS,
}: YearViewProps) {
  const { t } = useTranslation(['schedules']);
  const todayIso = todayJakartaISODate();
  const maxCount = useMemo(() => Math.max(0, ...counts.values()), [counts]);

  // Monday-first single-letter weekday headers.
  const weekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        new Date(2024, 0, 1 + i).toLocaleDateString(localeCode, { weekday: 'narrow' })
      ),
    [localeCode]
  );

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, m) => {
        const monthStart = startOfMonth(new Date(year, m, 1));
        const days = eachDayOfInterval({
          start: startOfWeek(monthStart, { weekStartsOn: 1 }),
          end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 }),
        });
        return {
          index: m,
          label: monthStart.toLocaleDateString(localeCode, { month: 'long' }),
          days,
          monthStart,
        };
      }),
    [year, localeCode]
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {months.map((month) => (
        <div
          key={month.index}
          className="rounded-nb-base border-2 border-nb-black bg-nb-white p-3 shadow-nb-sm"
        >
          <button
            type="button"
            onClick={() => onSelectMonth(month.index)}
            className="mb-2 block text-nb-body font-bold hover:text-nb-primary"
          >
            {month.label}
          </button>
          <div className="grid grid-cols-7 gap-0.5">
            {weekdays.map((w, i) => (
              <span
                key={`h${i}`}
                className="py-0.5 text-center text-[10px] font-bold uppercase text-nb-gray-500"
              >
                {w}
              </span>
            ))}
            {month.days.map((d) => {
              const iso = formatISO(d, { representation: 'date' });
              const inMonth = isSameMonth(d, month.monthStart);
              const isToday = iso === todayIso;
              const count = inMonth ? (counts.get(iso) ?? 0) : 0;
              const heat = inMonth ? BUCKET_BG[bucketOf(count, maxCount)] : '';
              const base = heat
                ? heat
                : inMonth
                  ? 'text-nb-black hover:bg-nb-gray-100'
                  : 'text-nb-gray-400 hover:bg-nb-gray-50';
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => onSelectDay(iso)}
                  title={count > 0 ? t('schedules:board.petugasCount', { count }) : undefined}
                  className={`aspect-square rounded-full text-center text-[11px] font-medium tabular-nums transition-colors ${base} ${
                    isToday ? 'font-bold outline outline-2 outline-nb-black' : ''
                  }`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {maxCount > 0 && (
        <div className="col-span-full flex items-center justify-end gap-2 text-nb-caption text-nb-gray-500">
          <span>{t('schedules:year.legendLow')}</span>
          {[1, 2, 3, 4].map((b) => (
            <span
              key={b}
              className={`inline-block size-4 rounded-nb-sm border-2 border-nb-black ${BUCKET_BG[b].split(' ')[0]}`}
              aria-hidden
            />
          ))}
          <span>{t('schedules:year.legendHigh')}</span>
        </div>
      )}
    </div>
  );
}
