/**
 * Jadwal (Schedules) page — calendar-first (ADR-047), redesigned: a single
 * range select (Tahun/Bulan/Minggu/Hari, default Hari) with drill-down; the day
 * view is the Rayon▸Kawasan▸Lokasi coverage board. Rule-based ScheduleEvents sit
 * behind create/edit (this / this-and-future / series semantics).
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfMonth,
  endOfWeek,
  formatISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { Button, FormSelect, PageHeader, Skeleton } from '@/components/ui';
import { ScheduleSearch } from '@/components/schedules/ScheduleSearch';
import { MonthGrid } from '@/components/schedules/MonthGrid';
import { WeekGrid } from '@/components/schedules/WeekGrid';
import { DayBoard } from '@/components/schedules/DayBoard';
import { YearView } from '@/components/schedules/YearView';
import { ScheduleDetailModal } from '@/components/schedules/ScheduleDetailModal';
import type { BoardMasterData } from '@/lib/schedules/dayBoard';
import { ScheduleEventModal } from '@/components/schedules/ScheduleEventModal';
import { EditScopeChooser } from '@/components/schedules/EditScopeChooser';
import { DeleteScopeChooser } from '@/components/schedules/DeleteScopeChooser';
import { EditScheduleModal } from '@/components/schedules/EditScheduleModal';
import {
  scheduleOccurrenceKeys,
  useDeleteScheduleEvent,
  useScheduleEvent,
  useScheduleRange,
  type EditScope,
  type ScheduleOccurrence,
  type ScheduleRangeFilters,
} from '@/lib/api/schedule-events';
import {
  useDailyRoster,
  useDeleteSchedule,
  useUpdateRosterAreas,
  useUpdateRosterShift,
} from '@/lib/api/schedules';
import { useShiftDefinitions } from '@/lib/api/shift-definitions';
import { useRayons } from '@/lib/api/rayons';
import { useRegions } from '@/lib/api/regions';
import { useLocations } from '@/lib/api/locations';
import { usePermissions } from '@/lib/auth/usePermissions';
import { useUser } from '@/lib/auth/hooks';
import { getErrorMessage } from '@/lib/api/client';
import { todayJakartaISODate } from '@/lib/utils/formatters';

/** Calendar range, ordered highest → lowest; drilling zooms in a level. */
type CalendarView = 'year' | 'month' | 'week' | 'day';

/** Roles pinned to their own rayon server-side — they can't pick a rayon. */
const RAYON_SCOPED_ROLES = ['kepala_rayon', 'admin_rayon'];

const isoDate = (d: Date): string => formatISO(d, { representation: 'date' });

/** WIB "today" as a local-midnight Date — roster days are WIB days, so the
 * calendar anchors on the WIB calendar day even for non-WIB browsers. */
const wibTodayDate = (): Date => new Date(`${todayJakartaISODate()}T00:00:00`);

export default function SchedulesPage() {
  const { t, i18n } = useTranslation(['schedules', 'common']);
  const { can } = usePermissions();
  const user = useUser();
  const queryClient = useQueryClient();

  // Default to the day view on both web and mobile (manager board + a worker's
  // own schedule both open on today's calendar).
  const [calendarView, setCalendarView] = useState<CalendarView>('day');
  const [anchor, setAnchor] = useState<Date>(() => wibTodayDate());
  const [filters, setFilters] = useState<ScheduleRangeFilters>({});

  const lockRayon = !!user && RAYON_SCOPED_ROLES.includes(user.role);
  // The Year view spans >62 days (the range API's cap) so it doesn't fetch
  // occurrences — it's a month picker until an aggregate endpoint exists.
  const fetchOccurrences = calendarView !== 'year';

  // Visible range per calendar view (month view spans the full Mon–Sun grid;
  // stays well under the API's 62-day cap).
  const { from, to } = useMemo(() => {
    if (calendarView === 'week') {
      return {
        from: isoDate(startOfWeek(anchor, { weekStartsOn: 1 })),
        to: isoDate(endOfWeek(anchor, { weekStartsOn: 1 })),
      };
    }
    if (calendarView === 'day' || calendarView === 'year') {
      const d = isoDate(anchor);
      return { from: d, to: d };
    }
    return {
      from: isoDate(startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 })),
      to: isoDate(endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 })),
    };
  }, [calendarView, anchor]);

  const { data: occurrences = [], isLoading } = useScheduleRange(
    from,
    to,
    filters,
    fetchOccurrences
  );

  // ── Create flow ──────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<string | undefined>();

  const openCreate = (date?: string) => {
    if (!can('schedule:create')) return;
    setCreateDate(date);
    setCreateOpen(true);
  };

  // ── Occurrence click → detail → edit/delete flows ────────────────────────
  const [chosen, setChosen] = useState<ScheduleOccurrence | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editChooserOpen, setEditChooserOpen] = useState(false);
  const [eventEdit, setEventEdit] = useState<{ scope: EditScope; fromDate?: string } | null>(null);
  const [rowEditOpen, setRowEditOpen] = useState(false);
  const [deleteChooserOpen, setDeleteChooserOpen] = useState(false);

  // The full rule (event) behind the chosen occurrence, for series edits.
  const { data: chosenEvent, isError: chosenEventError } = useScheduleEvent(
    chosen?.schedule_event_id ?? '',
    !!chosen?.schedule_event_id && (!!eventEdit || detailOpen)
  );
  // If the event can't be loaded the edit flow would silently never open —
  // surface it and reset the flow.
  useEffect(() => {
    if (eventEdit && chosenEventError) {
      toast.error(t('schedules:calendar.messages.loadEventError'));
      setEventEdit(null);
      setChosen(null);
    }
  }, [eventEdit, chosenEventError, t]);

  // Row-level ("this occurrence") editing reuses the roster-table machinery:
  // the day's roster is fetched and the chosen row fed to EditScheduleModal.
  // (useDailyRoster no-ops on an empty date string.)
  const { data: dayRoster } = useDailyRoster(rowEditOpen ? (chosen?.schedule_date ?? '') : '');
  const rowUnderEdit = useMemo(
    () => dayRoster?.find((r) => r.id === chosen?.id) ?? null,
    [dayRoster, chosen]
  );

  const { data: shifts = [] } = useShiftDefinitions();
  const { data: rayons = [] } = useRayons();
  const { data: regions = [] } = useRegions();
  const { data: locationsResp } = useLocations({ limit: 1000 });
  const allLocations = useMemo(() => locationsResp?.data ?? [], [locationsResp]);

  // Master data for the day board's Rayon → Kawasan → Lokasi tree.
  const boardMaster = useMemo<BoardMasterData>(
    () => ({
      rayons: rayons.map((r) => ({ id: r.id, name: r.name })),
      regions: regions.map((r) => ({ id: r.id, name: r.name, rayon_id: r.rayon_id })),
      locations: allLocations.map((l) => ({
        id: l.id,
        name: l.name,
        rayon_id: l.rayon_id,
        region_id: l.region_id ?? null,
      })),
      shifts: shifts.map((s) => ({
        id: s.id,
        name: s.name,
        start_time: s.start_time,
        end_time: s.end_time,
      })),
    }),
    [rayons, regions, allLocations, shifts]
  );

  const updateShift = useUpdateRosterShift();
  const updateAreas = useUpdateRosterAreas();
  const deleteRow = useDeleteSchedule();
  const deleteEvent = useDeleteScheduleEvent();

  const refreshCalendar = () =>
    queryClient.invalidateQueries({ queryKey: scheduleOccurrenceKeys.lists() });

  // Clicking a schedule opens a read-only detail first (Google-Calendar style),
  // not the scope prompt. Ubah/Hapus route onward from there.
  const onOccurrenceClick = (occ: ScheduleOccurrence) => {
    setChosen(occ);
    setDetailOpen(true);
  };

  const onDetailEdit = () => {
    setDetailOpen(false);
    if (chosen?.schedule_event_id) {
      setEditChooserOpen(true);
    } else {
      // Manual/ad-hoc row — no rule behind it, edit the row directly.
      setRowEditOpen(true);
    }
  };

  const onDetailDelete = () => {
    setDetailOpen(false);
    if (chosen?.schedule_event_id) {
      setDeleteChooserOpen(true);
    } else {
      void onDeleteScope('this');
    }
  };

  const onEditScope = (scope: EditScope, fromDate?: string) => {
    setEditChooserOpen(false);
    if (scope === 'this') {
      setRowEditOpen(true);
    } else {
      setEventEdit({ scope, fromDate: fromDate ?? chosen?.schedule_date });
    }
  };

  const onDeleteScope = async (scope: EditScope, date?: string) => {
    setDeleteChooserOpen(false);
    if (!chosen) return;
    try {
      if (scope === 'this' || !chosen.schedule_event_id) {
        await deleteRow.mutateAsync(chosen.id);
      } else {
        await deleteEvent.mutateAsync({
          id: chosen.schedule_event_id,
          scope,
          date: date ?? chosen.schedule_date,
        });
      }
      toast.success(t('schedules:calendar.messages.deleteSuccess'));
      refreshCalendar();
      setChosen(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const localeCode = i18n.language === 'en' ? 'en-US' : 'id-ID';

  return (
    <div className="space-y-5">
      <PageHeader
        actions={
          can('schedule:create') ? (
            <Button
              leftIcon={<Plus className="size-4" />}
              onClick={() => openCreate(isoDate(anchor))}
            >
              {t('schedules:calendar.event.createTitle')}
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <FormSelect
          label={t('schedules:controls.viewLabel')}
          value={calendarView}
          onChange={(v) => setCalendarView(v as CalendarView)}
          className="w-40"
          options={[
            { value: 'year', label: t('schedules:calendar.views.year') },
            { value: 'month', label: t('schedules:calendar.views.month') },
            { value: 'week', label: t('schedules:calendar.views.week') },
            { value: 'day', label: t('schedules:calendar.views.day') },
          ]}
        />
      </div>

      <ScheduleSearch
        filters={filters}
        onChange={setFilters}
        lockRayon={lockRayon}
        onNavigateDate={(iso) => {
          setAnchor(new Date(`${iso}T00:00:00`));
          setCalendarView('day');
        }}
      />

      {calendarView === 'year' ? (
        <YearView
          year={anchor.getFullYear()}
          today={wibTodayDate()}
          onSelectMonth={(m) => {
            setAnchor(new Date(anchor.getFullYear(), m, 1));
            setCalendarView('month');
          }}
          onPrevYear={() => setAnchor((d) => addYears(d, -1))}
          onNextYear={() => setAnchor((d) => addYears(d, 1))}
          onToday={() => setAnchor(wibTodayDate())}
          localeCode={localeCode}
        />
      ) : isLoading ? (
        <Skeleton variant="card" />
      ) : calendarView === 'month' ? (
        <MonthGrid
          occurrences={occurrences}
          currentMonth={anchor}
          onPrevMonth={() => setAnchor((d) => addMonths(d, -1))}
          onNextMonth={() => setAnchor((d) => addMonths(d, 1))}
          onToday={() => setAnchor(wibTodayDate())}
          onDayClick={(d) => {
            setAnchor(d);
            setCalendarView('day');
          }}
          onOccurrenceClick={onOccurrenceClick}
          locale={{ code: localeCode }}
          subjectFiltered={!!(filters.userId || filters.locationId)}
        />
      ) : calendarView === 'week' ? (
        <WeekGrid
          occurrences={occurrences}
          currentDate={anchor}
          onPrevWeek={() => setAnchor((d) => addWeeks(d, -1))}
          onNextWeek={() => setAnchor((d) => addWeeks(d, 1))}
          onToday={() => setAnchor(wibTodayDate())}
          onDayClick={(d) => {
            setAnchor(d);
            setCalendarView('day');
          }}
          onOccurrenceClick={onOccurrenceClick}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-nb-base border-2 border-nb-black bg-nb-white px-4 py-2.5 shadow-nb-sm">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnchor((d) => addDays(d, -1))}
              aria-label={t('schedules:calendar.navigation.prev', 'Prev')}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-nb-body font-bold">
                {anchor.toLocaleDateString(localeCode, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              <Button variant="outline" size="sm" onClick={() => setAnchor(wibTodayDate())}>
                {t('schedules:calendar.navigation.today')}
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnchor((d) => addDays(d, 1))}
              aria-label={t('schedules:calendar.navigation.next', 'Next')}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <DayBoard
            occurrences={occurrences}
            master={boardMaster}
            onOccurrenceClick={onOccurrenceClick}
            canAssign={can('schedule:create')}
            onAssign={() => openCreate(isoDate(anchor))}
          />
        </div>
      )}

      {/* Read-only detail (shown first on click; Ubah/Hapus route onward) */}
      <ScheduleDetailModal
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open && !editChooserOpen && !rowEditOpen && !deleteChooserOpen) setChosen(null);
        }}
        occurrence={chosen}
        event={chosen?.schedule_event_id ? chosenEvent : null}
        onEdit={onDetailEdit}
        onDelete={onDetailDelete}
        canEdit={can('schedule:update')}
        canDelete={can('schedule:delete')}
        localeCode={localeCode}
      />

      {/* Create */}
      {createOpen && (
        <ScheduleEventModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          initialDate={createDate}
          onSuccess={refreshCalendar}
        />
      )}

      {/* Series / this-and-future edit — needs the rule behind the occurrence */}
      {eventEdit && chosenEvent && (
        <ScheduleEventModal
          open={!!eventEdit}
          onOpenChange={(open) => {
            if (!open) setEventEdit(null);
          }}
          event={chosenEvent}
          editScope={eventEdit.scope}
          fromDate={eventEdit.fromDate}
          onSuccess={() => {
            refreshCalendar();
            setEventEdit(null);
            setChosen(null);
          }}
        />
      )}

      {/* "This occurrence" edit — reuses the roster row editor (detaches the row) */}
      <EditScheduleModal
        open={rowEditOpen && !!rowUnderEdit}
        onClose={() => {
          setRowEditOpen(false);
          setChosen(null);
        }}
        roster={rowUnderEdit}
        onUpdateShift={async (id, shiftId) => {
          await updateShift.mutateAsync({ id, shift_definition_id: shiftId });
          refreshCalendar();
        }}
        onUpdateAreas={async (id, locationIds) => {
          await updateAreas.mutateAsync({ id, location_ids: locationIds });
          refreshCalendar();
        }}
        shiftLoading={updateShift.isPending}
        areasLoading={updateAreas.isPending}
        shifts={shifts}
        allRayons={rayons}
        allAreas={allLocations}
      />

      <EditScopeChooser
        open={editChooserOpen}
        onOpenChange={(open) => {
          setEditChooserOpen(open);
          if (!open && !eventEdit && !rowEditOpen && !deleteChooserOpen) setChosen(null);
        }}
        onSelect={onEditScope}
        onDelete={can('schedule:delete') ? () => setDeleteChooserOpen(true) : undefined}
        selectedDate={chosen?.schedule_date}
      />

      <DeleteScopeChooser
        open={deleteChooserOpen}
        onOpenChange={setDeleteChooserOpen}
        onSelect={onDeleteScope}
        selectedDate={chosen?.schedule_date}
      />
    </div>
  );
}
