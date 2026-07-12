'use client';

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { OccurrenceChip } from './OccurrenceChip';
import type { ScheduleOccurrence } from '@/lib/api/schedule-events';
import { formatISO } from 'date-fns';

interface DayGridProps {
  occurrences: ScheduleOccurrence[];
  currentDate: Date;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  onOccurrenceClick?: (occurrence: ScheduleOccurrence) => void;
}

export function DayGrid({
  occurrences,
  currentDate,
  onPrevDay,
  onNextDay,
  onToday,
  onOccurrenceClick,
}: DayGridProps) {
  const { t } = useTranslation();

  const dateStr = formatISO(currentDate, { representation: 'date' });
  const dayOccurrences = occurrences.filter(o => o.schedule_date === dateStr);

  // Group by shift
  const byShift = new Map<string, ScheduleOccurrence[]>();
  dayOccurrences.forEach((occ) => {
    const key = occ.shift_definition?.id ?? 'none';
    if (!byShift.has(key)) byShift.set(key, []);
    byShift.get(key)!.push(occ);
  });

  const dateDisplay = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(currentDate);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-nb-base border-2 border-nb-black bg-nb-background p-4">
        <Button variant="outline" size="sm" onClick={onPrevDay}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-1 items-center justify-center gap-4">
          <h2 className="text-nb-h2 font-bold">{dateDisplay}</h2>
          <Button variant="outline" size="sm" onClick={onToday}>
            {t('schedules:calendar.navigation.today')}
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={onNextDay}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Occurrences by shift */}
      <div className="space-y-3 rounded-nb-base border-2 border-nb-black bg-nb-background p-4">
        {byShift.size === 0 ? (
          <p className="text-center text-nb-body-sm text-nb-gray-500">
            {t('schedules:calendar.empty.noEvents')}
          </p>
        ) : (
          Array.from(byShift.entries()).map(([shiftId, occs]) => (
            <div key={shiftId} className="rounded-nb-base border-nb-gray-200 border bg-nb-gray-50 p-3">
              <div className="mb-2 text-sm font-bold text-nb-gray-700">
                {occs[0]?.shift_definition?.name}
              </div>
              <div className="space-y-1">
                {occs.map((occ) => (
                  <OccurrenceChip
                    key={occ.id}
                    occurrence={occ}
                    onClick={() => {
                      if (onOccurrenceClick) onOccurrenceClick(occ);
                    }}
                    className="w-full"
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
