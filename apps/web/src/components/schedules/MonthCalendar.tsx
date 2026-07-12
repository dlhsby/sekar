'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { OccurrenceChip } from './OccurrenceChip';
import type { ScheduleOccurrence } from '@/lib/api/schedule-events';

export interface MonthCalendarProps {
  year: number;
  month: number;
  occurrences: ScheduleOccurrence[];
  onMonthChange: (year: number, month: number) => void;
  onDayClick: (date: string) => void;
  onOccurrenceClick: (occurrence: ScheduleOccurrence) => void;
  today: string;
}

export function MonthCalendar({
  year,
  month,
  occurrences,
  onMonthChange,
  onDayClick,
  onOccurrenceClick,
  today,
}: MonthCalendarProps) {
  const { t } = useTranslation();

  const { firstDayOfWeek, daysInMonth, prevMonthDays } = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const first = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday = 0
    const days = lastDay.getDate();
    const prev = new Date(year, month, 0).getDate();

    return {
      firstDayOfWeek: first,
      daysInMonth: days,
      prevMonthDays: prev,
    };
  }, [year, month]);

  const occurrencesByDate = useMemo(() => {
    const map = new Map<string, ScheduleOccurrence[]>();
    occurrences.forEach((occ) => {
      const key = occ.schedule_date;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(occ);
    });
    return map;
  }, [occurrences]);

  const handlePrevMonth = () => {
    if (month === 0) {
      onMonthChange(year - 1, 11);
    } else {
      onMonthChange(year, month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      onMonthChange(year + 1, 0);
    } else {
      onMonthChange(year, month + 1);
    }
  };

  const handleToday = () => {
    const d = new Date(today);
    onMonthChange(d.getFullYear(), d.getMonth());
  };

  const monthName = new Date(year, month, 1).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  const rows: (number | null)[][] = [];
  let currentRow: (number | null)[] = [];

  // Previous month padding
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    currentRow.push(null);
  }

  // Current month
  for (let day = 1; day <= daysInMonth; day++) {
    currentRow.push(day);
    if (currentRow.length === 7) {
      rows.push(currentRow);
      currentRow = [];
    }
  }

  // Next month padding
  let padDay = 1;
  while (currentRow.length > 0 && currentRow.length < 7) {
    currentRow.push(null);
    padDay++;
  }
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-nb-h2">{monthName}</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
          >
            {t('schedules:calendar.navigation.today')}
          </Button>
          <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border-2 border-nb-black rounded-nb-base overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-nb-gray-100">
          {dayNames.map((name) => (
            <div
              key={name}
              className="p-2 text-center text-nb-caption font-medium border-b-2 border-nb-black"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="divide-y-2 divide-nb-black">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-7 divide-x-2 divide-nb-black min-h-[120px]">
              {row.map((day, dayIndex) => {
                const dateStr =
                  day !== null
                    ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    : null;
                const isToday = dateStr === today;
                const dayOccurrences = dateStr ? occurrencesByDate.get(dateStr) ?? [] : [];

                return (
                  <div
                    key={`${rowIndex}-${dayIndex}`}
                    className={`p-2 cursor-pointer hover:bg-nb-gray-50 transition-colors ${
                      isToday ? 'bg-nb-primary bg-opacity-10 border-2 border-nb-primary' : ''
                    }`}
                    onClick={() => dateStr && onDayClick(dateStr)}
                  >
                    {day && (
                      <>
                        <div
                          className={`text-nb-caption font-medium mb-1 ${
                            isToday ? 'text-nb-primary font-bold' : ''
                          }`}
                        >
                          {day}
                        </div>
                        <div className="space-y-1 text-xs">
                          {dayOccurrences.slice(0, 3).map((occ, idx) => (
                            <OccurrenceChip
                              key={idx}
                              occurrence={occ}
                              compact
                              onClick={(e) => {
                                e.stopPropagation();
                                onOccurrenceClick(occ);
                              }}
                            />
                          ))}
                          {dayOccurrences.length > 3 && (
                            <button
                              className="text-nb-primary hover:underline text-xs font-medium"
                              onClick={(e) => {
                                e.stopPropagation();
                                dateStr && onDayClick(dateStr);
                              }}
                            >
                              +{dayOccurrences.length - 3} {t('common:more')}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
