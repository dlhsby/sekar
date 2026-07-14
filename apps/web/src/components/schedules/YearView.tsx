'use client';

import { useMemo } from 'react';
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
}

/**
 * Year overview — 12 mini month calendars (Google-Calendar style). Click a month
 * name to open the month view; click a day to open that day.
 */
export function YearView({ year, onSelectMonth, onSelectDay, localeCode }: YearViewProps) {
  const todayIso = todayJakartaISODate();

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
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => onSelectDay(iso)}
                  className={`aspect-square rounded-full text-center text-[11px] font-medium tabular-nums transition-colors ${
                    isToday
                      ? 'bg-nb-primary font-bold text-white'
                      : inMonth
                        ? 'text-nb-black hover:bg-nb-gray-100'
                        : 'text-nb-gray-400 hover:bg-nb-gray-50'
                  }`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
