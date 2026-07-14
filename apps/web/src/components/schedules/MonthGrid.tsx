'use client';

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { OccurrenceChip } from './OccurrenceChip';
import type { ScheduleOccurrence } from '@/lib/api/schedule-events';
import {
  formatISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { todayJakartaISODate } from '@/lib/utils/formatters';

interface MonthGridProps {
  occurrences: ScheduleOccurrence[];
  currentMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onDayClick: (date: Date) => void;
  onOccurrenceClick?: (occurrence: ScheduleOccurrence) => void;
  locale: Locale;
  /** When a single subject (worker/location) is filtered, show chips (a personal
   * calendar); otherwise show per-day coverage density (counts + bar). */
  subjectFiltered?: boolean;
}

export function MonthGrid({
  occurrences,
  currentMonth,
  onPrevMonth,
  onNextMonth,
  onToday,
  onDayClick,
  onOccurrenceClick,
  locale,
  subjectFiltered = false,
}: MonthGridProps) {
  const { t } = useTranslation();

  // Get the first and last day of the month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Get the start and end of the week for the month view
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 }); // Sunday

  // Get all days to display
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Group occurrences by date
  const occurrencesByDate = new Map<string, ScheduleOccurrence[]>();
  occurrences.forEach((occ) => {
    const key = occ.schedule_date;
    if (!occurrencesByDate.has(key)) {
      occurrencesByDate.set(key, []);
    }
    occurrencesByDate.get(key)!.push(occ);
  });

  // Peak day count (density-bar scale), min 1 to avoid divide-by-zero.
  const maxCount = Math.max(1, ...Array.from(occurrencesByDate.values(), (list) => list.length));

  // Days of week header
  const dayNames = [
    t('schedules:calendar.event.weekdaysMon'),
    t('schedules:calendar.event.weekdaysTue'),
    t('schedules:calendar.event.weekdaysWed'),
    t('schedules:calendar.event.weekdaysThu'),
    t('schedules:calendar.event.weekdaysFri'),
    t('schedules:calendar.event.weekdaysSat'),
    t('schedules:calendar.event.weekdaysSun'),
  ];

  const monthName = new Intl.DateTimeFormat(locale.code || 'id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(currentMonth);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-nb-base border-2 border-nb-black bg-nb-background p-4">
        <Button variant="outline" size="sm" onClick={onPrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-1 items-center justify-center gap-4">
          <h2 className="text-nb-h2 font-bold">{monthName}</h2>
          <Button variant="outline" size="sm" onClick={onToday}>
            {t('schedules:calendar.navigation.today')}
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={onNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto rounded-nb-base border-2 border-nb-black">
        <div className="inline-block w-full">
          {/* Day names header */}
          <div className="grid grid-cols-7 gap-px border-b-2 border-nb-black bg-nb-black">
            {dayNames.map((name) => (
              <div
                key={name}
                className="border-r-2 border-nb-black bg-nb-background px-2 py-2 text-center font-bold last:border-r-0"
              >
                {name}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-px bg-nb-black">
            {days.map((day) => {
              const dateStr = formatISO(day, { representation: 'date' });
              const dayOccurrences = occurrencesByDate.get(dateStr) || [];
              const isDayInMonth = isSameMonth(day, currentMonth);
              // Roster days are WIB days — highlight WIB "today", not the
              // browser's local today (they differ outside UTC+7).
              const isTodayDate = dateStr === todayJakartaISODate();

              return (
                <div
                  key={dateStr}
                  onClick={() => isDayInMonth && onDayClick(day)}
                  className={`min-h-24 border-r-2 border-nb-black bg-nb-background p-2 last:border-r-0 ${
                    isDayInMonth ? 'cursor-pointer hover:bg-nb-gray-50' : 'bg-nb-gray-50'
                  } ${isTodayDate ? 'border-4 border-nb-primary' : ''}`}
                >
                  {/* Day number */}
                  <div
                    className={`mb-2 text-right text-sm font-bold ${isTodayDate ? 'text-nb-primary' : isDayInMonth ? 'text-nb-black' : 'text-nb-gray-400'}`}
                  >
                    {day.getDate()}
                  </div>

                  {/* Body: coverage density (default) or chips (subject filtered) */}
                  {subjectFiltered ? (
                    <div className="space-y-1">
                      {dayOccurrences.slice(0, 3).map((occ) => (
                        <OccurrenceChip
                          key={occ.id}
                          occurrence={occ}
                          onClick={() => {
                            if (onOccurrenceClick) onOccurrenceClick(occ);
                          }}
                          className="w-full"
                        />
                      ))}
                      {dayOccurrences.length > 3 && (
                        <div className="text-nb-caption text-nb-gray-500">
                          {t('schedules:calendar.moreCount', { count: dayOccurrences.length - 3 })}
                        </div>
                      )}
                    </div>
                  ) : (
                    dayOccurrences.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-nb-body-sm font-bold tabular-nums leading-none">
                          {dayOccurrences.length}
                          <span className="ml-1 text-nb-caption font-medium text-nb-gray-500">
                            {t('schedules:board.petugasShort')}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full border-2 border-nb-black bg-nb-gray-50">
                          <div
                            className="h-full bg-nb-primary"
                            style={{ width: `${(dayOccurrences.length / maxCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Use Intl.DateTimeFormat to get locale data
export interface Locale {
  code?: string;
}
