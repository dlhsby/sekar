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
import { CalendarOff, } from 'lucide-react';
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
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  CreateButton,
  Skeleton,
} from '@/components/ui';
import { ScheduleSearch } from '@/components/schedules/ScheduleSearch';
import { ScheduleFilterChips } from '@/components/schedules/ScheduleFilterChips';
import { DateNav } from '@/components/schedules/DateNav';
import { MonthGrid } from '@/components/schedules/MonthGrid';
import { WeekGrid } from '@/components/schedules/WeekGrid';
import { DayBoard, type AssignContext } from '@/components/schedules/DayBoard';
import { YearView } from '@/components/schedules/YearView';
import { ScheduleDetailModal } from '@/components/schedules/ScheduleDetailModal';
import { AreaMapModal, type AreaMapSubject } from '@/components/schedules/AreaMapModal';
import { CapacityModal } from '@/components/schedules/CapacityModal';
import { HolidayManagerModal } from '@/components/schedules/HolidayManagerModal';
import type { BoardMasterData } from '@/lib/schedules/dayBoard';
import { ScheduleEventModal } from '@/components/schedules/ScheduleEventModal';
import { EditScopeChooser } from '@/components/schedules/EditScopeChooser';
import { DeleteScopeChooser } from '@/components/schedules/DeleteScopeChooser';
import {
  EditScheduleModal,
  type PendingScheduleEdit,
} from '@/components/schedules/EditScheduleModal';
import {
  scheduleOccurrenceKeys,
  useDeleteScheduleEvent,
  useScheduleEvent,
  useScheduleRange,
  useScheduleYearSummary,
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
import {
  useStaffRequirements,
  requirementTotalMap,
  requirementRoleMap,
  type StaffSubject,
} from '@/lib/api/location-staff-requirements';
import { resolveDayType, useSpecialDayOverrides } from '@/lib/api/special-day-overrides';
import { useShiftDefinitions } from '@/lib/api/shift-definitions';
import { useDistricts } from '@/lib/api/districts';
import { useRegions } from '@/lib/api/regions';
import { useLocations } from '@/lib/api/locations';
import { usePermissions } from '@/lib/auth/usePermissions';
import { useUser } from '@/lib/auth/hooks';
import { getErrorMessage } from '@/lib/api/client';
import { todayJakartaISODate } from '@/lib/utils/formatters';
import { runAction } from '@/lib/hooks/use-action';

/** Calendar range, ordered highest → lowest; drilling zooms in a level. */
type CalendarView = 'year' | 'month' | 'week' | 'day';

/** Roles pinned to their own district server-side — they can't pick a district. */
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

  const lockDistrict = !!user && RAYON_SCOPED_ROLES.includes(user.role);
  // Only admin_system/superadmin can set capacity (matches the backend gate).
  const canManageCapacity = !!user && ['admin_system', 'superadmin'].includes(user.role);
  const [capacitySubject, setCapacitySubject] = useState<StaffSubject | null>(null);
  const [holidayOpen, setHolidayOpen] = useState(false);
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

  // Year view: per-day occupancy counts drive the load heatmap.
  const { data: yearCounts = [] } = useScheduleYearSummary(
    anchor.getFullYear(),
    filters,
    calendarView === 'year'
  );
  const yearCountMap = useMemo(
    () => new Map(yearCounts.map((d) => [d.date, d.count])),
    [yearCounts]
  );

  // ── Create flow ──────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<string | undefined>();
  // Pre-fill context when "+ Tugaskan" is clicked on a specific board row.
  const [createCtx, setCreateCtx] = useState<AssignContext | undefined>();
  // Boundary map for a board container — fetched (and its map bundle loaded)
  // only once one is actually asked for.
  const [mapSubject, setMapSubject] = useState<AreaMapSubject | null>(null);

  const openCreate = (date?: string, ctx?: AssignContext) => {
    if (!can('schedule:create')) return;
    setCreateDate(date);
    setCreateCtx(ctx);
    setCreateOpen(true);
  };

  // ── Occurrence click → detail → edit/delete flows ────────────────────────
  const [chosen, setChosen] = useState<ScheduleOccurrence | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editChooserOpen, setEditChooserOpen] = useState(false);
  /**
   * The edit the form collected, held UNWRITTEN until "Ubah Yang Mana?" is
   * answered. Cancelling that dialog drops it; nothing reaches the API.
   */
  const [pendingEdit, setPendingEdit] = useState<PendingScheduleEdit | null>(null);
  /** Which scope button is mid-write, so it alone shows a spinner. */
  const [pendingScope, setPendingScope] = useState<EditScope | null>(null);
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
  const { data: districts = [] } = useDistricts();
  const { data: regions = [] } = useRegions();
  const { data: locationsResp } = useLocations({ limit: 1000 });
  const allLocations = useMemo(() => locationsResp?.data ?? [], [locationsResp]);

  // Special-day overrides (holidays/days off) → the anchor's staffing day type,
  // matching monitoring's DayTypeService (holiday requirements fire on holidays).
  const year = anchor.getFullYear();
  const { data: overrides = [] } = useSpecialDayOverrides(
    `${year}-01-01`,
    `${year}-12-31`,
    calendarView === 'day'
  );
  const overrideMap = useMemo(
    () => new Map(overrides.map((o) => [o.date, o.day_type])),
    [overrides]
  );

  // Staffing requirements → understaffing pills on the day board (per day type).
  const { data: requirementRows = [] } = useStaffRequirements(calendarView === 'day');
  const capacities = useMemo(
    () => requirementTotalMap(requirementRows, resolveDayType(isoDate(anchor), overrideMap)),
    [requirementRows, anchor, overrideMap]
  );
  // Per-role targets: the aggregate above can't say which role is short, which
  // is what the hint and the shift+role cards need.
  const roleCapacities = useMemo(
    () => requirementRoleMap(requirementRows, resolveDayType(isoDate(anchor), overrideMap)),
    [requirementRows, anchor, overrideMap]
  );

  // Master data for the day board's Rayon → Kawasan → Lokasi tree.
  const boardMaster = useMemo<BoardMasterData>(
    () => ({
      // staffing_level must survive this mapping: it decides which single tier
      // (district / kawasan / lokasi) may edit capacity. Dropping it here is what
      // made the board offer the capacity control on every tier but the district.
      districts: districts.map((r) => ({ id: r.id, name: r.name, staffing_level: r.staffing_level })),
      regions: regions.map((r) => ({ id: r.id, name: r.name, district_id: r.district_id })),
      locations: allLocations.map((l) => ({
        id: l.id,
        name: l.name,
        district_id: l.district_id,
        region_id: l.region_id ?? null,
      })),
      shifts: shifts.map((s) => ({
        id: s.id,
        name: s.name,
        start_time: s.start_time,
        end_time: s.end_time,
      })),
    }),
    [districts, regions, allLocations, shifts]
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

  /**
   * Editing ALWAYS opens the form first.
   *
   * An event-backed occurrence used to open "Ubah Yang Mana?" *before* the form,
   * while a manual row went straight to it — two different flows for the same
   * button. Worse, it asked for the blast radius before the user knew what they
   * were changing. The recurrence question now comes on SAVE (see
   * `onRowEditSaved`), and only when there is a recurrence behind the row.
   */
  const onDetailEdit = () => {
    setDetailOpen(false);
    setRowEditOpen(true);
  };

  /**
   * The form was submitted. A row backed by a rule now asks which occurrences the
   * change should touch; a manual row has no rule, so what was just saved is all
   * there is.
   */
  const onRowEditSubmit = (change: PendingScheduleEdit) => {
    setRowEditOpen(false);
    // A row backed by a rule asks WHICH occurrences first — and nothing is
    // written until that question is answered, so cancelling it leaves the
    // schedule untouched (it used to save first and ask afterwards).
    if (chosen?.schedule_event_id) {
      setPendingEdit(change);
      setEditChooserOpen(true);
      return;
    }
    void applyRowEdit(change).then((ok) => {
      if (ok) setChosen(null);
    });
  };

  /**
   * Persist a confirmed edit. Returns false when either write fails, so the
   * caller can keep the dialog open instead of reporting success over an error.
   */
  const applyRowEdit = async (change: PendingScheduleEdit): Promise<boolean> => {
    let ok = true;
    if (change.shiftChanged) {
      ok = await runAction(() =>
        updateShift.mutateAsync({ id: change.rosterId, shift_definition_id: change.shiftId }),
      );
    }
    if (ok && change.scopeChanged) {
      ok = await runAction(() =>
        updateAreas.mutateAsync({
          id: change.rosterId,
          location_ids: change.locationIds,
          district_id: change.districtId,
          // At most one kawasan per occurrence (ADR-053).
          region_id: change.regionIds[0] ?? null,
        }),
      );
    }
    // One toast for the whole edit, not one per field that happened to change.
    if (ok) toast.success(t('schedules:messages.editSuccess'));
    refreshCalendar();
    return ok;
  };

  const onDetailDelete = () => {
    setDetailOpen(false);
    if (chosen?.schedule_event_id) {
      setDeleteChooserOpen(true);
    } else {
      void onDeleteScope('this');
    }
  };

  const onEditScope = async (scope: EditScope, fromDate?: string) => {
    // Answering this dialog is what WRITES the edit the form collected.
    if (pendingEdit) {
      setPendingScope(scope);
      const ok = await applyRowEdit(pendingEdit);
      setPendingScope(null);
      // Failed → stay open on the same choice so the error is actionable.
      if (!ok) return;
      setPendingEdit(null);
    }
    setEditChooserOpen(false);
    if (scope === 'this') {
      setChosen(null);
      return;
    }
    setEventEdit({ scope, fromDate: fromDate ?? chosen?.schedule_date });
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

  // Compact date-nav label + step, driven by the current range.
  const dateLabel = useMemo(() => {
    if (calendarView === 'year') return String(anchor.getFullYear());
    if (calendarView === 'month')
      return anchor.toLocaleDateString(localeCode, { month: 'long', year: 'numeric' });
    if (calendarView === 'week') {
      const ws = startOfWeek(anchor, { weekStartsOn: 1 });
      const we = endOfWeek(anchor, { weekStartsOn: 1 });
      const f = (d: Date) => d.toLocaleDateString(localeCode, { day: 'numeric', month: 'short' });
      return `${f(ws)} – ${f(we)} ${we.getFullYear()}`;
    }
    return anchor.toLocaleDateString(localeCode, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [calendarView, anchor, localeCode]);

  const navStep = (dir: 1 | -1) =>
    setAnchor((d) =>
      calendarView === 'year'
        ? addYears(d, dir)
        : calendarView === 'month'
          ? addMonths(d, dir)
          : calendarView === 'week'
            ? addWeeks(d, dir)
            : addDays(d, dir)
    );

  return (
    <div className="space-y-5">
      {/* Same toolbar shape as every list page (see specs/platforms/web/data-tables.md):
          date nav, then a LEFT slot holding search, then the right-hand group.
          Search used to sit inside the right cluster, which put it furthest from
          the edge it belongs on. `w-full` below `sm` keeps it on a row of its own
          so the group wraps underneath. The parent stays `relative` — an active
          search overlays the whole row. */}
      <div className="relative flex flex-wrap items-center gap-3">
        <DateNav
          label={dateLabel}
          onPrev={() => navStep(-1)}
          onNext={() => navStep(1)}
          onToday={() => setAnchor(wibTodayDate())}
        />
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <ScheduleSearch
            filters={filters}
            onChange={setFilters}
            lockDistrict={lockDistrict}
            onNavigateDate={(iso) => {
              setAnchor(new Date(`${iso}T00:00:00`));
              setCalendarView('day');
            }}
          />
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={calendarView} onValueChange={(v) => setCalendarView(v as CalendarView)}>
            <SelectTrigger className="w-32" aria-label={t('schedules:controls.viewLabel')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="year">{t('schedules:calendar.views.year')}</SelectItem>
              <SelectItem value="month">{t('schedules:calendar.views.month')}</SelectItem>
              <SelectItem value="week">{t('schedules:calendar.views.week')}</SelectItem>
              <SelectItem value="day">{t('schedules:calendar.views.day')}</SelectItem>
            </SelectContent>
          </Select>
          {/* The standard toolbar icon button — this was a hand-rolled <button>
              with its own size/border, so it didn't match the filter/refresh
              buttons it sits beside on every other page. */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHolidayOpen(true)}
            aria-label={t('schedules:holidays.manage')}
            title={t('schedules:holidays.manage')}
          >
            <CalendarOff className="h-4 w-4" aria-hidden />
            {/* `manage` ("Hari Libur"), not `title` ("Hari Libur & Hari Khusus")
                — the latter is the panel's heading and is far too long here. */}
            <span className="ml-1.5 hidden sm:inline">{t('schedules:holidays.manage')}</span>
          </Button>
          {can('schedule:create') && (
            <CreateButton
              label={t('schedules:calendar.event.createTitle')}
              onClick={() => openCreate(isoDate(anchor))}
            />
          )}
        </div>
      </div>

      <ScheduleFilterChips filters={filters} onChange={setFilters} lockDistrict={lockDistrict} />

      {calendarView === 'year' ? (
        <YearView
          year={anchor.getFullYear()}
          onSelectMonth={(m) => {
            setAnchor(new Date(anchor.getFullYear(), m, 1));
            setCalendarView('month');
          }}
          onSelectDay={(iso) => {
            setAnchor(new Date(`${iso}T00:00:00`));
            setCalendarView('day');
          }}
          localeCode={localeCode}
          counts={yearCountMap}
        />
      ) : isLoading ? (
        <Skeleton variant="card" />
      ) : calendarView === 'month' ? (
        <MonthGrid
          occurrences={occurrences}
          currentMonth={anchor}
          master={boardMaster}
          onDayClick={(d) => {
            setAnchor(d);
            setCalendarView('day');
          }}
          onOccurrenceClick={onOccurrenceClick}
          subjectFiltered={!!(filters.userId || filters.locationId)}
        />
      ) : calendarView === 'week' ? (
        <WeekGrid
          occurrences={occurrences}
          currentDate={anchor}
          master={boardMaster}
          onDayClick={(d) => {
            setAnchor(d);
            setCalendarView('day');
          }}
          onOccurrenceClick={onOccurrenceClick}
          subjectFiltered={!!(filters.userId || filters.locationId)}
        />
      ) : (
        <DayBoard
          occurrences={occurrences}
          master={boardMaster}
          capacities={capacities}
          roleCapacities={roleCapacities}
          onOccurrenceClick={onOccurrenceClick}
          canAssign={can('schedule:create')}
          onAssign={(ctx) => openCreate(isoDate(anchor), ctx)}
          onEditCapacity={canManageCapacity ? (subject) => setCapacitySubject(subject) : undefined}
          filters={filters}
          onClearFilters={() => setFilters({})}
          onShowMap={setMapSubject}
        />
      )}

      <AreaMapModal subject={mapSubject} onOpenChange={(o) => !o && setMapSubject(null)} />

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

      {/* Holidays / days-off manager (reachable from the Jadwal page) */}
      <HolidayManagerModal
        open={holidayOpen}
        onOpenChange={setHolidayOpen}
        year={year}
        canManage={can('schedule:create')}
      />

      {/* Staffing capacity editor (admin_system/superadmin) */}
      <CapacityModal
        open={capacitySubject !== null}
        onOpenChange={(open) => {
          if (!open) setCapacitySubject(null);
        }}
        subject={capacitySubject}
      />

      {/* Create */}
      {createOpen && (
        <ScheduleEventModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          initialDate={createDate}
          initialDistrictId={createCtx?.district_id}
          initialRegionId={createCtx?.region_id}
          initialLocationId={createCtx?.location_id}
          initialShiftId={createCtx?.shiftId}
          initialCityWide={createCtx?.city}
          initialTeam={createCtx?.team}
          initialRole={createCtx?.role}
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
        onSubmit={onRowEditSubmit}
        roster={rowUnderEdit}
        loading={updateShift.isPending || updateAreas.isPending}
        shifts={shifts}
        allDistricts={districts}
        allAreas={allLocations}
        allRegions={regions}
      />

      <EditScopeChooser
        open={editChooserOpen}
        onOpenChange={(open) => {
          setEditChooserOpen(open);
          // Cancelling DISCARDS the collected edit — nothing was written.
          if (!open) setPendingEdit(null);
          if (!open && !eventEdit && !rowEditOpen && !deleteChooserOpen) setChosen(null);
        }}
        onSelect={onEditScope}
        onDelete={can('schedule:delete') ? () => setDeleteChooserOpen(true) : undefined}
        selectedDate={chosen?.schedule_date}
        pendingScope={pendingScope}
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
