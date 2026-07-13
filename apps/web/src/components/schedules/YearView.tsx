'use client';

import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';

interface YearViewProps {
  year: number;
  /** WIB today, to highlight the current month. */
  today: Date;
  onSelectMonth: (monthIndex: number) => void;
  onPrevYear: () => void;
  onNextYear: () => void;
  onToday: () => void;
  localeCode: string;
}

/**
 * Year overview — 12 clickable months that drill into the month view. Per-day
 * coverage density is a follow-up (needs an aggregate endpoint; the range API
 * caps at 62 days, so a full year can't be fetched as occurrences).
 */
export function YearView({
  year,
  today,
  onSelectMonth,
  onPrevYear,
  onNextYear,
  onToday,
  localeCode,
}: YearViewProps) {
  const { t } = useTranslation(['schedules']);
  const isThisYear = today.getFullYear() === year;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-nb-base border-2 border-nb-black bg-nb-white px-4 py-2.5 shadow-nb-sm">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevYear}
          aria-label={t('schedules:calendar.navigation.prev', 'Prev')}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-nb-body font-bold tabular-nums">{year}</span>
          <Button variant="outline" size="sm" onClick={onToday}>
            {t('schedules:calendar.navigation.today')}
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onNextYear}
          aria-label={t('schedules:calendar.navigation.next', 'Next')}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }, (_, m) => {
          const label = new Date(year, m, 1).toLocaleDateString(localeCode, { month: 'long' });
          const isCurrent = isThisYear && today.getMonth() === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onSelectMonth(m)}
              className={`rounded-nb-base border-2 border-nb-black bg-nb-white px-4 py-6 text-center text-nb-body font-bold shadow-nb-sm transition-colors hover:bg-nb-gray-50 ${
                isCurrent ? 'outline outline-[3px] outline-nb-primary' : ''
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
