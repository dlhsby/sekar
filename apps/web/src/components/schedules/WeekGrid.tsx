'use client';

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { OccurrenceChip } from './OccurrenceChip';
import type { ScheduleOccurrence } from '@/lib/api/schedule-events';
import { eachDayOfInterval, startOfWeek, endOfWeek, formatISO } from 'date-fns';

interface WeekGridProps {
  occurrences: ScheduleOccurrence[];
  currentDate: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onDayClick: (date: Date) => void;
  onOccurrenceClick?: (occurrence: ScheduleOccurrence) => void;
}

export function WeekGrid({
  occurrences,
  currentDate,
  onPrevWeek,
  onNextWeek,
  onToday,
  onDayClick,
  onOccurrenceClick,
}: WeekGridProps) {
  const { t } = useTranslation();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const dayNames = [
    t('schedules:calendar.event.weekdaysMon'),
    t('schedules:calendar.event.weekdaysTue'),
    t('schedules:calendar.event.weekdaysWed'),
    t('schedules:calendar.event.weekdaysThu'),
    t('schedules:calendar.event.weekdaysFri'),
    t('schedules:calendar.event.weekdaysSat'),
    t('schedules:calendar.event.weekdaysSun'),
  ];

  // Group occurrences by date and shift
  const occurrencesByDateAndShift = new Map<string, Map<string, ScheduleOccurrence[]>>();
  occurrences.forEach((occ) => {
    const dateKey = occ.schedule_date;
    const shiftKey = occ.shift_definition?.id ?? 'none';
    if (!occurrencesByDateAndShift.has(dateKey)) {
      occurrencesByDateAndShift.set(dateKey, new Map());
    }
    const shiftMap = occurrencesByDateAndShift.get(dateKey)!;
    if (!shiftMap.has(shiftKey)) {
      shiftMap.set(shiftKey, []);
    }
    shiftMap.get(shiftKey)!.push(occ);
  });

  const weekStr = `${new Intl.DateTimeFormat('id-ID', { month: 'short', day: 'numeric' }).format(weekStart)} - ${new Intl.DateTimeFormat('id-ID', { month: 'short', day: 'numeric' }).format(weekEnd)}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-nb-base border-2 border-nb-black bg-nb-background p-4">
        <Button variant="outline" size="sm" onClick={onPrevWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-1 items-center justify-center gap-4">
          <h2 className="text-nb-h2 font-bold">{weekStr}</h2>
          <Button variant="outline" size="sm" onClick={onToday}>
            {t('schedules:calendar.navigation.today')}
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={onNextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week Grid */}
      <div className="overflow-x-auto rounded-nb-base border-2 border-nb-black">
        <div className="grid grid-cols-7 gap-px bg-nb-black">
          {/* Day headers */}
          {days.map((day, i) => (
            <div key={`header-${i}`} className="border-r-2 border-nb-black bg-nb-background px-2 py-2 text-center font-bold last:border-r-0">
              <div className="text-xs">{dayNames[i]}</div>
              <div className="text-sm">{day.getDate()}</div>
            </div>
          ))}

          {/* Occurrences - simplified: one row per day showing all occurrences */}
          {days.map((day) => {
            const dateStr = formatISO(day, { representation: 'date' });
            const dayOccs = occurrencesByDateAndShift.get(dateStr) || new Map();
            const allOccs: ScheduleOccurrence[] = [];
            dayOccs.forEach((occs) => allOccs.push(...occs));

            return (
              <div
                key={dateStr}
                onClick={() => onDayClick(day)}
                className="min-h-24 border-r-2 border-nb-black bg-nb-background p-2 last:border-r-0 cursor-pointer hover:bg-nb-gray-50"
              >
                <div className="space-y-1">
                  {allOccs.slice(0, 3).map((occ) => (
                    <OccurrenceChip
                      key={occ.id}
                      occurrence={occ}
                      onClick={() => {
                        if (onOccurrenceClick) onOccurrenceClick(occ);
                      }}
                      className="w-full"
                    />
                  ))}
                  {allOccs.length > 3 && (
                    <div className="text-xs text-nb-gray-500">
                      +{allOccs.length - 3}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
