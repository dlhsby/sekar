/**
 * Jadwal (Schedules) page — calendar-first (ADR-047), redesigned: a single
 * range select (Tahun/Bulan/Minggu/Hari, default Hari) with drill-down; the day
 * view is the Rayon▸Kawasan▸Lokasi coverage board. Rule-based ScheduleEvents sit
 * behind create/edit (this / this-and-future / series semantics).
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CalendarOff, RefreshCw, UserPlus } from 'lucide-react';
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
import { UnscheduledWorkersSheet } from '@/components/schedules/UnscheduledWorkersSheet';
import { unscheduledKeys } from '@/lib/api/unscheduled';
import { YearView } from '@/components/schedules/YearView';
import { ScheduleDetailModal } from '@/components/schedules/ScheduleDetailModal';
import { AreaMapModal, type AreaMapSubject } from '@/components/schedules/AreaMapModal';
import { CapacityModal } from '@/components/schedules/CapacityModal';
import { HolidayManagerModal } from '@/components/schedules/HolidayManagerModal';
import { ShiftDefinitionsModal } from '@/components/schedules/ShiftDefinitionsModal';
import {
  CITY_NODE_ID,
  containerTotal,
  indexDaySummary,
  type BoardMasterData,
} from '@/lib/schedules/dayBoard';
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
  useDaySummary,
  useRangeSummary,
  containerOccurrencesQuery,
  type ContainerTier,
  useScheduleYearSummary,
  type EditScope,
  type ScheduleOccurrence,
  type ScheduleRangeFilters,
} from '@/lib/api/schedule-events';
import {
  useDeleteSchedule,
  useSchedule,
  useUpdateRosterAreas,
  useUpdateRosterShift,
  type Schedule,
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
import { useLocationLookup } from '@/lib/api/locations';
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
  const [shiftDefsOpen, setShiftDefsOpen] = useState(false);
  const currentUser = useUser();
  // Shift definitions are system config — only system managers may edit (backend
  // enforces via USER_MANAGERS); others see a read-only list.
  const canManageShifts =
    currentUser?.role === 'admin_system' || currentUser?.role === 'superadmin';
  /** "Belum Dijadwalkan" panel (ADR-054) — the complement of the board. */
  const [unscheduledOpen, setUnscheduledOpen] = useState(false);
  const [createUserId, setCreateUserId] = useState<string | undefined>();
  /** Name for `createUserId` — the worker combobox is server-paged and can't resolve it. */
  const [createUserName, setCreateUserName] = useState<string | undefined>();
  /**
   * Buat Jadwal was opened FROM the gap panel, so closing it — saved or
   * cancelled — should hand the operator back to the list. Filling a day means
   * placing several people, and bouncing to the board after each one turns one
   * task into N round trips.
   */
  const [returnToUnscheduled, setReturnToUnscheduled] = useState(false);
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

  // The DAY view no longer pulls the whole day's rows. Its collapsed cards are
  // counts, so it reads the aggregate and fetches a container's rows only when
  // that card is opened — 3.9 MB of JSON became ~80 KB.
  //
  // Week and month are unchanged here and still fetch rows. They have the same
  // problem (an unfiltered month is 57 MB) and the same shape of fix, but they
  // need a per-(date, district) aggregate this endpoint doesn't answer — see
  // the follow-up noted in the changelog.
  const dayView = calendarView === 'day';
  // Week and month draw occurrence CHIPS only when narrowed to a worker or a
  // lokasi; otherwise they render headcounts, which the aggregate answers. This
  // is the single definition — the grids receive it as `subjectFiltered`, and it
  // decides whether the rows are fetched at all, so the two cannot disagree and
  // leave a chip view with nothing to draw.
  const subjectFiltered = !!(filters.userId || filters.locationId);
  const rangeNeedsRows = !dayView && subjectFiltered;
  const {
    data: occurrences = [],
    isLoading,
    isFetching,
  } = useScheduleRange(from, to, filters, fetchOccurrences && rangeNeedsRows);

  const {
    data: daySummaryPayload,
    isLoading: summaryLoading,
    isFetching: summaryFetching,
  } = useDaySummary(from, filters, dayView);
  const {
    data: rangeSummary,
    isLoading: rangeSummaryLoading,
    isFetching: rangeSummaryFetching,
  } = useRangeSummary(from, to, filters, fetchOccurrences && !dayView && !subjectFiltered);

  const daySummary = useMemo(
    () => (daySummaryPayload ? indexDaySummary(daySummaryPayload) : undefined),
    [daySummaryPayload]
  );
  // The "memperbarui jadwal…" line and the spinning refresh icon must follow
  // whichever query the CURRENT view is actually driven by.
  const viewFetching = dayView
    ? summaryFetching
    : rangeNeedsRows
      ? isFetching
      : rangeSummaryFetching;
  const viewLoading = dayView ? summaryLoading : rangeNeedsRows ? isLoading : rangeSummaryLoading;

  // Rows for the containers the operator has opened, merged into one list for
  // the board. Each container is its own cached query, so re-opening a card is
  // instant and closing one costs nothing.
  const [openContainers, setOpenContainers] = useState<string[]>([]);
  const onExpandContainer = useCallback((id: string) => {
    setOpenContainers((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);
  // A new day or a new filter invalidates what was open — the ids may not even
  // exist in the new result set.
  const containerResetKey = `${from}|${JSON.stringify(filters)}`;
  const [seenContainerKey, setSeenContainerKey] = useState(containerResetKey);
  if (seenContainerKey !== containerResetKey) {
    setSeenContainerKey(containerResetKey);
    setOpenContainers([]);
  }

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

  const openCreate = (
    date?: string,
    ctx?: AssignContext,
    user?: { id: string; name: string },
  ) => {
    if (!can('schedule:create')) return;
    setCreateDate(date);
    setCreateCtx(ctx);
    // Cleared unless this call prefilled one — otherwise a worker picked in the
    // gap panel would haunt the next Buat Jadwal opened from anywhere else.
    setCreateUserId(user?.id);
    setCreateUserName(user?.name);
    setCreateOpen(true);
  };

  /** Close Buat Jadwal, returning to the gap panel when it came from there. */
  const closeCreate = (open: boolean) => {
    setCreateOpen(open);
    if (!open && returnToUnscheduled) {
      setReturnToUnscheduled(false);
      setUnscheduledOpen(true);
    }
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

  // Row-level ("this occurrence") editing reuses the roster-table machinery.
  //
  // This used to fetch the WHOLE day's roster, unscoped, and `.find()` the one
  // row on the client — 190 MB and 5.4 s on staging-sized data to read a single
  // record. It now asks for that record. A projected occurrence has no row to
  // fetch (its id is `projected:…`), so `useSchedule` skips those and the board's
  // own copy is used instead.
  const { data: fetchedRow } = useSchedule(rowEditOpen ? chosen?.id : null);
  const rowUnderEdit = useMemo(
    () => fetchedRow ?? (chosen?.is_projected ? (chosen as unknown as Schedule) : null),
    [fetchedRow, chosen]
  );

  const { data: shifts = [] } = useShiftDefinitions();
  const { data: districts = [] } = useDistricts();
  const { data: regions = [] } = useRegions();
  // Four fields per lokasi, not the whole entity. `useLocations({ limit: 1000 })`
  // sends no page/limit, so the backend returned all 952 areas as FULL entities —
  // nested district, boundary polygon and all — 12.5 MB on every page load.
  // The BOARD includes deactivated lokasi; the pickers below do not.
  //
  // A live schedule row at a deactivated lokasi still has a worker standing in
  // it, and the rayon's headcount counts that row — but with the lokasi missing
  // from the master list the tree had no node to hang them on, so the people
  // were invisible while the number above them included them. The cell
  // contradicted its own header.
  const { data: allLocations = [] } = useLocationLookup();
  const placeable = useMemo(
    () => allLocations.filter((l): l is typeof l & { district_id: string } => !!l.district_id),
    [allLocations]
  );

  /**
   * The board's lokasi. A deactivated one appears ONLY when it still holds
   * assignments — otherwise every closed lokasi would add an empty card — and it
   * carries `is_active` so the card can say why it is there.
   */
  const boardLocations = useMemo(
    () =>
      placeable
        .filter((l) => l.is_active !== false || (containerTotal(daySummary, l.id) ?? 0) > 0)
        .map((l) => ({
          id: l.id,
          name: l.name,
          district_id: l.district_id,
          region_id: l.region_id ?? null,
          is_active: l.is_active !== false,
        })),
    [placeable, daySummary]
  );

  /** Pickers offer only lokasi you can actually roster someone into. */
  const pickerLocations = useMemo(
    () =>
      placeable
        .filter((l) => l.is_active !== false)
        .map((l) => ({
          id: l.id,
          name: l.name,
          district_id: l.district_id,
          region_id: l.region_id ?? null,
        })),
    [placeable]
  );

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
      // A lokasi with no rayon has no place in a Rayon → Kawasan → Lokasi tree,
      // so it is dropped rather than rendered under a missing parent.
      locations: boardLocations,
      shifts: shifts.map((s) => ({
        id: s.id,
        name: s.name,
        start_time: s.start_time,
        end_time: s.end_time,
      })),
    }),
    [districts, regions, boardLocations, shifts]
  );

  // Which tier a container id belongs to, so the leaf fetch knows which filter
  // to scope by. Resolved from master data the page already holds.
  const containerTier = useCallback(
    (id: string): ContainerTier | null => {
      if (id === CITY_NODE_ID) return 'city';
      if (boardLocations.some((l) => l.id === id)) return 'location';
      if (regions.some((r) => r.id === id)) return 'region';
      if (districts.some((d) => d.id === id)) return 'district';
      return null;
    },
    [boardLocations, regions, districts]
  );

  // One cached query per opened container. `useQueries` keeps them independent:
  // opening a second card doesn't refetch the first, and closing one keeps its
  // rows warm for the next open.
  const containerQueries = useQueries({
    queries: openContainers.map((id) => {
      const tier = containerTier(id);
      // The summary already knows whether this container holds anything; an
      // empty one needs no request at all.
      return containerOccurrencesQuery(
        from,
        tier ? { id, tier } : null,
        filters,
        containerTotal(daySummary, id)
      );
    }),
  });
  const containerOccurrences = useMemo(
    () => containerQueries.flatMap((q) => q.data ?? []),
    [containerQueries]
  );
  const loadingContainers = useMemo(
    () => new Set(openContainers.filter((_, i) => containerQueries[i]?.isLoading)),
    [openContainers, containerQueries]
  );

  const updateShift = useUpdateRosterShift();
  const updateAreas = useUpdateRosterAreas();
  const deleteRow = useDeleteSchedule();
  const deleteEvent = useDeleteScheduleEvent();

  /**
   * Manual refresh (the "Muat Ulang" button). The board is cached and nothing
   * pushes, so a write by another operator — or the materializer cron — is
   * otherwise invisible without a page reload.
   *
   * Writes made HERE no longer call this: every roster mutation now invalidates
   * what it touched, and awaits it, so `mutateAsync` resolves with the board
   * already correct. This used to run after each save on top of what the
   * mutation hooks had already invalidated — two passes, sequential, and still
   * missing the summary key.
   */
  const refreshCalendar = async () => {
    await queryClient.invalidateQueries({ queryKey: scheduleOccurrenceKeys.all });
    await queryClient.invalidateQueries({ queryKey: unscheduledKeys.all });
  };

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
    // The mutations have already refreshed the board by the time they resolve,
    // so this is claimed only once it is true on screen.
    if (ok) toast.success(t('schedules:messages.editSuccess'));
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
          value={isoDate(anchor)}
          // Picking a day resolves to the period containing it — the current
          // view is preserved, so a month view jumps to that day's month.
          onValueChange={(iso) => setAnchor(new Date(`${iso}T00:00:00`))}
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
            <SelectTrigger className="w-32 h-10" aria-label={t('schedules:controls.viewLabel')}>
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
          {/* Shift settings (ADR-055 configurable shifts) — sits to the LEFT of
              Hari Libur, both being schedule-wide config. */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShiftDefsOpen(true)}
            aria-label={t('schedules:shiftDefs.title')}
            title={t('schedules:shiftDefs.title')}
          >
            <CalendarClock className="h-4 w-4" aria-hidden />
            <span className="ml-1.5 hidden sm:inline">{t('schedules:shiftDefs.buttonLabel')}</span>
          </Button>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUnscheduledOpen(true)}
              aria-label={t('schedules:unscheduled.title')}
              title={t('schedules:unscheduled.description')}
            >
              <UserPlus className="h-4 w-4" aria-hidden />
              <span className="ml-1.5 hidden sm:inline">
                {t('schedules:unscheduled.buttonLabel')}
              </span>
            </Button>
          )}
          {/* Manual refresh. The board is cached for 30 s and a write elsewhere
              (another operator, the materializer cron) will not push, so an
              explicit "reload" is the only way to see it without a page reload. */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refreshCalendar()}
            disabled={viewFetching}
            aria-label={t('common:actions.refresh')}
            title={t('common:actions.refresh')}
          >
            <RefreshCw
              className={`h-4 w-4 ${viewFetching ? 'animate-spin' : ''}`}
              aria-hidden
            />
            <span className="ml-1.5 hidden sm:inline">{t('common:actions.refresh')}</span>
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

      {/* A background refetch keeps the STALE board on screen, so after saving a
          schedule the success toast landed while the row was still missing —
          which reads as "it didn't work". Say the board is catching up. */}
      {viewFetching && !viewLoading && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-nb-caption text-nb-gray-600"
        >
          <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
          {t('schedules:calendar.refreshing')}
        </div>
      )}

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
      ) : viewLoading ? (
        <Skeleton variant="card" />
      ) : calendarView === 'month' ? (
        <MonthGrid
          occurrences={occurrences}
          summary={subjectFiltered ? undefined : rangeSummary}
          currentMonth={anchor}
          master={boardMaster}
          onDayClick={(d) => {
            setAnchor(d);
            setCalendarView('day');
          }}
          onOccurrenceClick={onOccurrenceClick}
          subjectFiltered={subjectFiltered}
        />
      ) : calendarView === 'week' ? (
        <WeekGrid
          occurrences={occurrences}
          summary={subjectFiltered ? undefined : rangeSummary}
          currentDate={anchor}
          master={boardMaster}
          onDayClick={(d) => {
            setAnchor(d);
            setCalendarView('day');
          }}
          onOccurrenceClick={onOccurrenceClick}
          subjectFiltered={subjectFiltered}
        />
      ) : (
        <DayBoard
          // Only the opened containers' rows — the counts come from `summary`.
          occurrences={containerOccurrences}
          summary={daySummary}
          onExpandContainer={onExpandContainer}
          loadingContainers={loadingContainers}
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
      <ShiftDefinitionsModal
        open={shiftDefsOpen}
        onOpenChange={setShiftDefsOpen}
        canManage={canManageShifts}
      />
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
          onOpenChange={closeCreate}
          initialDate={createDate}
          initialDistrictId={createCtx?.district_id}
          initialRegionId={createCtx?.region_id}
          initialLocationId={createCtx?.location_id}
          initialShiftId={createCtx?.shiftId}
          initialCityWide={createCtx?.city}
          initialTeam={createCtx?.team}
          initialRole={createCtx?.role}
          initialUserId={createUserId}
          initialUserName={createUserName}
          // From the gap panel the geography/shift are the panel's FILTERS, not
          // a clicked board cell — a prefill to adjust, not a fact to obey.
          lockPrefill={!returnToUnscheduled}
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
            // No refresh here: `useUpdateScheduleEvent` invalidates and awaits it,
            // so the board is already current when this fires.
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
        pendingEdit={pendingEdit}
        loading={updateShift.isPending || updateAreas.isPending}
        shifts={shifts}
        allDistricts={districts}
        allAreas={pickerLocations}
        allRegions={regions}
      />

      <UnscheduledWorkersSheet
        open={unscheduledOpen}
        onOpenChange={setUnscheduledOpen}
        initialDate={isoDate(anchor)}
        shifts={shifts}
        districts={districts}
        regions={regions}
        locations={pickerLocations}
        onSchedule={(worker, target) => {
          // Hand off to the normal create flow. The WORKER and their role are
          // facts — they were picked from the list — so they lock. The target is
          // a suggestion: it prefills but stays editable (`lockPrefill={false}`),
          // because the filters describe where the operator was looking, not
          // necessarily where this particular person should go.
          setUnscheduledOpen(false);
          setReturnToUnscheduled(true);
          openCreate(
            target.date,
            {
              shiftId: target.shiftId ?? '',
              role: worker.role,
              district_id: target.districtId ?? undefined,
              region_id: target.regionId ?? undefined,
              location_id: target.locationId ?? undefined,
            },
            { id: worker.id, name: worker.full_name },
          );
        }}
      />

      <EditScopeChooser
        open={editChooserOpen}
        onOpenChange={(open) => {
          setEditChooserOpen(open);
          // Cancelling DISCARDS the collected edit — nothing was written. Going
          // BACK re-opens the form, so `rowEditOpen` guards the edit from being
          // dropped on the way there.
          if (!open && !rowEditOpen) setPendingEdit(null);
          if (!open && !eventEdit && !rowEditOpen && !deleteChooserOpen) setChosen(null);
        }}
        onSelect={onEditScope}
        // Back to the form, edit intact. Deleting is NOT offered mid-edit — it
        // lives on the row's detail modal, which is where the user meant to go.
        onBack={() => {
          setEditChooserOpen(false);
          setRowEditOpen(true);
        }}
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
