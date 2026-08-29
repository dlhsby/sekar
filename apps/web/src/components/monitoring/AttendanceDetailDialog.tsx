'use client';

/**
 * AttendanceDetailDialog — who clocked in on a given service-day, and who did not.
 *
 * Parity W3: mobile has had this since Phase 4 (`AttendanceDetailModal` +
 * `UserAttendanceModal`); a supervisor at a desk had no way to ask "who is
 * missing today" beyond reading the map. Two levels, matching mobile: pick a
 * date and a side, then open one worker for their sessions.
 *
 * Reads `/monitoring/attendance`, not the superseded `/supervisor` endpoint.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ArrowLeft, MapPin, Clock, AlertTriangle } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DatePicker } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils/cn';
import { intlLocale } from '@/lib/i18n/date-locale';
import { todayJakartaISODate } from '@/lib/utils/formatters';
import { ROLE_LABELS } from '@/lib/constants/roles';
import {
  useMonitoringAttendance,
  useUserAttendance,
  type ClockedInWorker,
  type NotClockedInWorker,
} from '@/lib/api/monitoring';
import type { UserRole } from '@/types/models';

export interface AttendanceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Side = 'clocked_in' | 'not_clocked_in';

/** Same local-parts shift as the timeline stepper — never `new Date(iso)`. */
function shiftISODate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString(intlLocale(), { hour: '2-digit', minute: '2-digit' });
}

function roleLabel(role: string): string {
  return ROLE_LABELS[role as UserRole] ?? role;
}

export function AttendanceDetailDialog({ open, onOpenChange }: AttendanceDetailDialogProps) {
  const { t } = useTranslation(['monitoring', 'common']);
  const today = todayJakartaISODate();
  const [date, setDate] = useState(today);
  const [side, setSide] = useState<Side>('clocked_in');
  const [openUserId, setOpenUserId] = useState<string | null>(null);

  const { data, isLoading, isError } = useMonitoringAttendance(date, 1, open);
  const detail = useUserAttendance(openUserId, date);

  const clockedIn = data?.clocked_in.data ?? [];
  const notClockedIn = data?.not_clocked_in.data ?? [];
  const rows: (ClockedInWorker | NotClockedInWorker)[] =
    side === 'clocked_in' ? clockedIn : notClockedIn;

  const tile = (key: Side, label: string, count: number, tone: string) => (
    <button
      type="button"
      onClick={() => { setSide(key); setOpenUserId(null); }}
      aria-pressed={side === key}
      data-testid={`attendance-tile-${key}`}
      className={cn(
        'flex-1 rounded-nb-base border-2 border-nb-black p-2 text-left shadow-nb-sm transition-colors',
        side === key ? tone : 'bg-white hover:bg-nb-gray-50',
      )}
    >
      <div className="text-lg font-black text-nb-black">{count}</div>
      <div className="text-xs font-semibold text-nb-gray-600">{label}</div>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('monitoring:attendance.title')}</DialogTitle>
        </DialogHeader>

        {/* A worker is open — show their sessions instead of the list. */}
        {openUserId ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setOpenUserId(null)}
              className="flex items-center gap-1 text-xs font-bold text-nb-gray-600 hover:text-nb-black"
              data-testid="attendance-back"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              {t('common:actions.back')}
            </button>

            {detail.isLoading && <Skeleton className="h-24 w-full" />}
            {detail.data && (
              <div className="space-y-2">
                <div>
                  <div className="text-sm font-black text-nb-black">{detail.data.user.full_name}</div>
                  <div className="text-xs text-nb-gray-600">
                    {roleLabel(detail.data.user.role)}
                    {detail.data.user.area ? ` · ${detail.data.user.area.name}` : ''}
                  </div>
                </div>

                {detail.data.shifts.length === 0 ? (
                  <p className="text-xs text-nb-gray-600">{t('monitoring:attendance.noSessions')}</p>
                ) : (
                  <ul className="space-y-1.5">
                    {detail.data.shifts.map((s) => (
                      <li
                        key={s.id}
                        className="rounded-nb-base border-2 border-nb-black bg-white p-2 shadow-nb-xs"
                      >
                        <div className="flex items-center gap-2 text-xs">
                          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span className="font-semibold text-nb-black">
                            {timeOf(s.clock_in_time)} –{' '}
                            {s.clock_out_time
                              ? timeOf(s.clock_out_time)
                              : t('monitoring:attendance.stillOpen')}
                          </span>
                          {s.duration_minutes != null && (
                            <span className="ml-auto text-nb-gray-600">
                              {t('monitoring:attendance.minutes', { count: s.duration_minutes })}
                            </span>
                          )}
                        </div>
                        {(s.clock_in_outside_boundary || s.clock_out_outside_boundary) && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-nb-danger-dark">
                            <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                            {t('monitoring:attendance.outsideBoundary')}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Date, with the same one-click stepping as the trail timeline. */}
            <div className="flex items-stretch gap-1">
              <button
                type="button"
                onClick={() => setDate(shiftISODate(date, -1))}
                aria-label={t('monitoring:timeline.previousDay')}
                data-testid="attendance-prev-day"
                className="shrink-0 rounded-nb-base border-2 border-nb-black bg-white px-1.5 shadow-nb-sm hover:bg-nb-gray-100"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="min-w-0 flex-1">
                <DatePicker value={date} onValueChange={(v) => setDate(v ?? today)} />
              </div>
              <button
                type="button"
                onClick={() => setDate(shiftISODate(date, 1))}
                disabled={date >= today}
                aria-label={t('monitoring:timeline.nextDay')}
                data-testid="attendance-next-day"
                className="shrink-0 rounded-nb-base border-2 border-nb-black bg-white px-1.5 shadow-nb-sm hover:bg-nb-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {isLoading && <Skeleton className="h-40 w-full" />}
            {isError && <EmptyState variant="error" />}

            {data && (
              <>
                <div className="flex gap-2">
                  {tile(
                    'clocked_in',
                    t('monitoring:attendance.clockedIn'),
                    data.clocked_in_count,
                    'bg-nb-success-light',
                  )}
                  {tile(
                    'not_clocked_in',
                    t('monitoring:attendance.notClockedIn'),
                    data.total_workers - data.clocked_in_count,
                    'bg-nb-warning-light',
                  )}
                </div>

                {rows.length === 0 ? (
                  <p className="py-4 text-center text-xs text-nb-gray-600">
                    {t('monitoring:attendance.emptySide')}
                  </p>
                ) : (
                  <ul className="max-h-72 space-y-1 overflow-y-auto">
                    {rows.map((w) => (
                      <li key={w.id}>
                        <button
                          type="button"
                          onClick={() => setOpenUserId(w.id)}
                          data-testid={`attendance-row-${w.id}`}
                          className="flex w-full items-center gap-2 rounded-nb-base border-2 border-nb-black bg-white p-2 text-left shadow-nb-xs transition-colors hover:bg-nb-gray-50"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-bold text-nb-black">
                              {w.full_name}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-nb-gray-600">
                              <span>{roleLabel(w.role)}</span>
                              {w.area && (
                                <>
                                  <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                                  <span className="truncate">{w.area.name}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {'clock_in_time' in w && (
                            <span className="shrink-0 text-[11px] font-semibold text-nb-gray-600">
                              {timeOf(w.clock_in_time)}
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 shrink-0 text-nb-gray-500" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
