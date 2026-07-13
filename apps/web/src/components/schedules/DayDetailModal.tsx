'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
} from '@/components/ui';
import { OccurrenceChip } from '@/components/schedules/OccurrenceChip';
import type { ScheduleOccurrence } from '@/lib/api/schedule-events';

interface DayDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** WIB day (YYYY-MM-DD) whose roster is shown. */
  date: string | null;
  /** Occurrences already loaded for the visible range; filtered to `date` here. */
  occurrences: ScheduleOccurrence[];
  onOccurrenceClick: (occ: ScheduleOccurrence) => void;
  onAdd: (date: string) => void;
  canCreate: boolean;
  localeCode: string;
}

/**
 * Day-detail dialog (ADR-047 UX): clicking a day in Month/Week first shows that
 * day's roster grouped by shift, then offers "Tambah Jadwal" — no more jumping
 * straight into the create form.
 */
export function DayDetailModal({
  open,
  onOpenChange,
  date,
  occurrences,
  onOccurrenceClick,
  onAdd,
  canCreate,
  localeCode,
}: DayDetailModalProps) {
  const { t } = useTranslation(['schedules', 'common']);

  const dayOccurrences = useMemo(
    () => occurrences.filter((o) => o.schedule_date === date),
    [occurrences, date],
  );

  // Group by shift, ordered by shift start time; unshifted rows sort last.
  const groups = useMemo(() => {
    const byShift = new Map<string, { name: string; start: string; items: ScheduleOccurrence[] }>();
    for (const occ of dayOccurrences) {
      const key = occ.shift_definition?.id ?? 'none';
      const name = occ.shift_definition?.name ?? t('schedules:dayDetail.noShift');
      const start = occ.shift_definition?.start_time ?? '99:99:99';
      if (!byShift.has(key)) byShift.set(key, { name, start, items: [] });
      byShift.get(key)!.items.push(occ);
    }
    return Array.from(byShift.values()).sort((a, b) => a.start.localeCompare(b.start));
  }, [dayOccurrences, t]);

  const heading = date
    ? new Date(`${date}T00:00:00`).toLocaleDateString(localeCode, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
        </DialogHeader>

        <DialogBody>
          {dayOccurrences.length === 0 ? (
            <EmptyState variant="noData" title={t('schedules:dayDetail.empty')} />
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.name} className="space-y-2">
                  <p className="text-nb-caption font-semibold text-nb-gray-600">
                    {group.name}{' '}
                    <span className="font-normal">({group.items.length})</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((occ) => (
                      <OccurrenceChip
                        key={occ.id}
                        occurrence={occ}
                        teamName={occ.team_category?.name}
                        onClick={() => onOccurrenceClick(occ)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:actions.close')}
          </Button>
          {canCreate && date && (
            <Button leftIcon={<Plus className="size-4" />} onClick={() => onAdd(date)}>
              {t('schedules:calendar.event.createTitle')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
