'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { OccurrenceChip } from './OccurrenceChip';
import type { ScheduleOccurrence } from '@/lib/api/schedule-events';
import {
  buildWeekCoverage,
  COUNTABLE_ROLES,
  type BoardMasterData,
  type WeekShiftBreakdown,
} from '@/lib/schedules/dayBoard';
import { eachDayOfInterval, startOfWeek, endOfWeek, formatISO } from 'date-fns';
import { todayJakartaISODate } from '@/lib/utils/formatters';

interface WeekGridProps {
  occurrences: ScheduleOccurrence[];
  currentDate: Date;
  master: BoardMasterData;
  onDayClick: (date: Date) => void;
  onOccurrenceClick?: (occurrence: ScheduleOccurrence) => void;
  /** Single subject filtered → chip strip; otherwise the coverage grid. */
  subjectFiltered?: boolean;
}

export function WeekGrid({
  occurrences,
  currentDate,
  master,
  onDayClick,
  onOccurrenceClick,
  subjectFiltered = false,
}: WeekGridProps) {
  const { t } = useTranslation();

  const { days, dateStrs } = useMemo(() => {
    const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
    const we = endOfWeek(currentDate, { weekStartsOn: 1 });
    const dd = eachDayOfInterval({ start: ws, end: we });
    return { days: dd, dateStrs: dd.map((d) => formatISO(d, { representation: 'date' })) };
  }, [currentDate]);

  const dayNames = [
    t('schedules:calendar.event.weekdaysMon'),
    t('schedules:calendar.event.weekdaysTue'),
    t('schedules:calendar.event.weekdaysWed'),
    t('schedules:calendar.event.weekdaysThu'),
    t('schedules:calendar.event.weekdaysFri'),
    t('schedules:calendar.event.weekdaysSat'),
    t('schedules:calendar.event.weekdaysSun'),
  ];

  // Show every rayon (even with no schedule) so gaps are visible.
  const coverage = useMemo(
    () => buildWeekCoverage(occurrences, master, dateStrs),
    [occurrences, master, dateStrs]
  );

  // Chip strip (subject filtered): occurrences grouped by day.
  const byDate = useMemo(() => {
    const m = new Map<string, ScheduleOccurrence[]>();
    for (const o of occurrences)
      (m.get(o.schedule_date) ?? m.set(o.schedule_date, []).get(o.schedule_date)!).push(o);
    return m;
  }, [occurrences]);

  return (
    <div className="space-y-4">
      {subjectFiltered ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {days.map((day, i) => {
            const dateStr = dateStrs[i];
            const occs = byDate.get(dateStr) ?? [];
            const isToday = dateStr === todayJakartaISODate();
            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => onDayClick(day)}
                className={`flex min-h-24 flex-col gap-1 rounded-nb-base border-2 border-nb-black bg-nb-white p-2 text-left hover:bg-nb-gray-50 ${isToday ? 'outline outline-[3px] outline-nb-primary' : ''}`}
              >
                <span className="text-nb-caption font-bold text-nb-gray-500">
                  {dayNames[i]} {day.getDate()}
                </span>
                {occs.slice(0, 3).map((occ) => (
                  <OccurrenceChip
                    key={occ.id}
                    occurrence={occ}
                    onClick={() => onOccurrenceClick?.(occ)}
                    className="w-full"
                  />
                ))}
                {occs.length > 3 && (
                  <span className="text-nb-caption text-nb-gray-500">+{occs.length - 3}</span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-nb-base border-2 border-nb-black">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 border-b-2 border-r-2 border-nb-black bg-nb-gray-50 px-3 py-2 text-left text-nb-caption font-bold uppercase tracking-wide text-nb-gray-500">
                  {t('schedules:filters.rayonLabel')}
                </th>
                {days.map((day, i) => (
                  <th
                    key={dateStrs[i]}
                    className="border-b-2 border-r-2 border-nb-black bg-nb-gray-50 px-2 py-2 text-center text-nb-caption font-bold uppercase last:border-r-0"
                  >
                    {dayNames[i]}
                    <span className="block font-medium tabular-nums text-nb-gray-500">
                      {day.getDate()}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coverage.map((row) => (
                <tr key={row.rayonId}>
                  <td className="sticky left-0 border-b border-r-2 border-nb-black bg-nb-white px-3 py-2 align-top font-bold">
                    {row.rayonName}
                    <span className="mt-0.5 block text-nb-caption font-medium tabular-nums text-nb-gray-500">
                      {t('schedules:board.petugasCount', { count: row.total })}
                    </span>
                  </td>
                  {row.cells.map((dayShifts, i) => (
                    <td
                      key={dateStrs[i]}
                      onClick={() => onDayClick(days[i])}
                      className="min-w-[7rem] cursor-pointer border-b border-r-2 border-nb-black bg-nb-white px-1.5 py-2 align-top last:border-r-0 hover:bg-nb-gray-50"
                    >
                      {dayShifts.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {dayShifts.map((s) => (
                            <ShiftBreakdown key={s.shiftId} shift={s} />
                          ))}
                        </div>
                      ) : (
                        <span className="block text-center text-nb-gray-300">–</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {coverage.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-6 text-center text-nb-body-sm text-nb-gray-500"
                  >
                    {t('schedules:dayDetail.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** One shift's per-role summary inside a week cell: S{n} + satgas/linmas/others/team. */
function ShiftBreakdown({ shift }: { shift: WeekShiftBreakdown }) {
  const { t } = useTranslation(['schedules']);
  const satgas = shift.roleCounts['satgas'] ?? 0;
  const linmas = shift.roleCounts['linmas'] ?? 0;
  const others = Object.entries(shift.roleCounts)
    .filter(([role]) => !COUNTABLE_ROLES.includes(role))
    .reduce((sum, [, n]) => sum + n, 0);

  return (
    <div className="flex flex-wrap items-center gap-1">
      <span
        title={shift.name}
        className="rounded-full border-2 border-nb-black bg-nb-gray-100 px-1.5 text-nb-caption font-bold tabular-nums"
      >
        S{shift.label}
      </span>
      {satgas > 0 && (
        <RoleCount value={satgas} label={t('schedules:week.roleSatgas')} tone="primary" />
      )}
      {linmas > 0 && (
        <RoleCount value={linmas} label={t('schedules:week.roleLinmas')} tone="info" />
      )}
      {others > 0 && (
        <RoleCount value={others} label={t('schedules:week.roleOther')} tone="muted" />
      )}
      {shift.teams > 0 && (
        <RoleCount value={shift.teams} label={t('schedules:week.roleTeam')} tone="secondary" />
      )}
    </div>
  );
}

function RoleCount({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: 'primary' | 'info' | 'secondary' | 'muted';
}) {
  // Opacity tints over the flipping card + inherited (flipping) text — dark-safe
  // (a fixed ink on these non-flipping colored fills would drop out in dark mode).
  const cls = {
    primary: 'bg-nb-primary/25',
    info: 'bg-nb-info/25',
    secondary: 'bg-nb-warning/30',
    muted: 'bg-nb-gray-100 text-nb-gray-600',
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 text-nb-caption font-bold tabular-nums ${cls}`}
    >
      {value}
      <span className="font-medium">{label}</span>
    </span>
  );
}
