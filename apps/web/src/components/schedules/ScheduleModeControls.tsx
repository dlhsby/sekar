'use client';

import { useTranslation } from 'react-i18next';
import { FormSelect } from '@/components/ui';

/** Top-level Jadwal display mode + (calendar-only) calendar view. */
export type ScheduleMode = 'calendar' | 'table';
export type CalendarView = 'month' | 'week' | 'day';

interface ScheduleModeControlsProps {
  mode: ScheduleMode;
  onModeChange: (mode: ScheduleMode) => void;
  calendarView: CalendarView;
  onCalendarViewChange: (view: CalendarView) => void;
}

/**
 * Mode select (Kalender / Tabel) shown first; the calendar-view select
 * (Bulan / Minggu / Hari) only appears when the mode is Kalender.
 */
export function ScheduleModeControls({
  mode,
  onModeChange,
  calendarView,
  onCalendarViewChange,
}: ScheduleModeControlsProps) {
  const { t } = useTranslation(['schedules']);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <FormSelect
        label={t('schedules:controls.modeLabel')}
        value={mode}
        onChange={(v) => onModeChange(v as ScheduleMode)}
        className="w-40"
        options={[
          { value: 'calendar', label: t('schedules:controls.modeCalendar') },
          { value: 'table', label: t('schedules:controls.modeTable') },
        ]}
      />

      {mode === 'calendar' && (
        <FormSelect
          label={t('schedules:controls.viewLabel')}
          value={calendarView}
          onChange={(v) => onCalendarViewChange(v as CalendarView)}
          className="w-40"
          options={[
            { value: 'month', label: t('schedules:calendar.views.month') },
            { value: 'week', label: t('schedules:calendar.views.week') },
            { value: 'day', label: t('schedules:calendar.views.day') },
          ]}
        />
      )}
    </div>
  );
}
