'use client';

/**
 * ScheduleWeeklyGrid — SCH-1 weekly view (hifi-web §07).
 *
 * Worker rows × 7 day columns. A cell shows a worker's shift chip when the
 * schedule's [effective_date, end_date] range covers that day (the model is
 * date-range based, not per-weekday, so a covered day renders the assigned
 * shift; uncovered days read "libur"). Desktop = sticky-header matrix;
 * <768px collapses to per-worker cards so it stays usable on mobile.
 */

import { useMemo } from 'react';
import type { WorkerSchedule } from '@/types/models';
import { cn } from '@/lib/utils/cn';

export interface ScheduleWeeklyGridProps {
  schedules: WorkerSchedule[];
  weekStart: Date;
  loading?: boolean;
}

const DAY_LABELS = ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'];

/** Shift code → cell tint (token utilities only). */
const SHIFT_BG: Record<string, string> = {
  SHIFT1: 'bg-nb-success-light',
  SHIFT2: 'bg-nb-info-light',
  SHIFT3: 'bg-nb-warning-light',
};

interface WorkerRow {
  userId: string;
  name: string;
  role: string;
  /** Per-day shift (index 0 = Monday), or null for libur. */
  days: (WorkerSchedule['shift_definition'] | null)[];
}

/** Strip a "HH:MM:SS" time to "HH:MM". */
const hhmm = (t?: string) => (t ? t.slice(0, 5) : '');

/** Local YYYY-MM-DD for range comparison (avoids TZ drift from toISOString). */
function ymd(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Normalize a backend date to YYYY-MM-DD. The schedule columns are DATE type
 * (so they arrive as "2026-05-18"), but strip any time component defensively
 * so a boundary-day comparison stays correct even if the API ever sends
 * "2026-05-18T00:00:00Z" (lexical compare would otherwise drop the start day).
 */
const dateKey = (s: string): string => s.slice(0, 10);

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

export function ScheduleWeeklyGrid({ schedules, weekStart, loading }: ScheduleWeeklyGridProps) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const rows = useMemo<WorkerRow[]>(() => {
    const byUser = new Map<string, WorkerRow>();
    for (const s of schedules) {
      if (!s.user_id) continue;
      let row = byUser.get(s.user_id);
      if (!row) {
        row = {
          userId: s.user_id,
          name: s.user?.full_name ?? '—',
          role: s.user?.role ?? '',
          days: Array(7).fill(null),
        };
        byUser.set(s.user_id, row);
      }
      const eff = dateKey(s.effective_date);
      const end = s.end_date ? dateKey(s.end_date) : null;
      days.forEach((day, i) => {
        const key = ymd(day);
        const covers = eff <= key && (!end || end >= key);
        if (covers && !row!.days[i]) row!.days[i] = s.shift_definition ?? null;
      });
    }
    return Array.from(byUser.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [schedules, days]);

  if (loading) {
    return (
      <div className="h-64 animate-shimmer rounded-nb-md border-2 border-nb-black bg-nb-gray-300" />
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-nb-md border-2 border-dashed border-nb-gray-300 px-4 py-12 text-center text-nb-body-sm text-nb-gray-500">
        Tidak ada jadwal untuk minggu ini.
      </div>
    );
  }

  return (
    <>
      {/* Desktop / tablet matrix */}
      <div className="hidden overflow-x-auto rounded-nb-md border-2 border-nb-black shadow-nb-sm md:block">
        <div className="grid min-w-[760px] grid-cols-[140px_repeat(7,1fr)]">
          {/* header row */}
          <div className="sticky left-0 z-10 border-b-2 border-r-[1.5px] border-nb-black border-r-nb-gray-300 bg-nb-gray-50 px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wide text-nb-gray-600">
            Petugas
          </div>
          {days.map((day, i) => {
            const weekend = i >= 5;
            return (
              <div
                key={i}
                className={cn(
                  'border-b-2 border-r-[1.5px] border-nb-black border-r-nb-gray-300 px-2 py-2 text-center last:border-r-0',
                  weekend ? 'bg-nb-primary/10' : 'bg-nb-gray-50',
                )}
              >
                <div className="font-mono text-[10.5px] font-bold text-nb-black">{DAY_LABELS[i]}</div>
                <div className="font-heading text-lg font-extrabold text-nb-black">
                  {day.getDate()}
                </div>
              </div>
            );
          })}

          {/* worker rows */}
          {rows.map((row) => (
            <RowCells key={row.userId} row={row} />
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <div key={row.userId} className="rounded-nb-base border-2 border-nb-black bg-nb-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-heading font-bold text-nb-black">{row.name}</span>
              {row.role && (
                <span className="font-mono text-[10px] uppercase text-nb-gray-600">{row.role}</span>
              )}
            </div>
            <ul className="grid grid-cols-2 gap-1.5">
              {row.days.map((shift, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-nb-sm border-[1.5px] border-nb-gray-200 px-2 py-1"
                >
                  <span className="font-mono text-[10px] font-bold text-nb-gray-500">
                    {DAY_LABELS[i]} {days[i].getDate()}
                  </span>
                  <ShiftChip shift={shift} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}

function RowCells({ row }: { row: WorkerRow }) {
  return (
    <>
      <div className="sticky left-0 z-10 flex items-center gap-2 border-b-[1.5px] border-r-[1.5px] border-b-nb-gray-200 border-r-nb-gray-300 bg-nb-white px-3 py-2">
        <span className="leading-tight">
          <span className="block font-bold text-nb-black">{row.name}</span>
          {row.role && (
            <span className="font-mono text-[10px] text-nb-gray-600">{row.role}</span>
          )}
        </span>
      </div>
      {row.days.map((shift, i) => (
        <div
          key={i}
          className="border-b-[1.5px] border-r-[1.5px] border-b-nb-gray-200 border-r-nb-gray-300 p-1.5 last:border-r-0"
        >
          <ShiftChip shift={shift} />
        </div>
      ))}
    </>
  );
}

function ShiftChip({ shift }: { shift: WorkerSchedule['shift_definition'] | null }) {
  if (!shift) {
    return (
      <span className="flex items-center justify-center rounded-nb-sm bg-nb-gray-100 px-1.5 py-1 font-mono text-[10px] text-nb-gray-500">
        libur
      </span>
    );
  }
  return (
    <span
      title={shift.name}
      className={cn(
        'block rounded-nb-sm border-[1.5px] border-nb-black px-1.5 py-1 font-mono text-[10px] font-semibold text-nb-black',
        SHIFT_BG[shift.code] ?? 'bg-nb-gray-100',
      )}
    >
      {hhmm(shift.start_time)}–{hhmm(shift.end_time)}
    </span>
  );
}
