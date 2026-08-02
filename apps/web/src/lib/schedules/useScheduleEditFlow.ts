'use client';

/**
 * The occurrence → detail → edit/delete flow.
 *
 * One state machine with several dialogs in it: a click opens the read-only
 * detail; Ubah opens the form; saving a rule-backed row then asks which
 * occurrences it should touch, and only that answer WRITES. Delete follows the
 * same shape. Lifted out of `schedules/page.tsx`, where it accounted for most of
 * the component's state and every one of its mutation handlers.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  useDeleteSchedule,
  useUpdateRosterAreas,
  useUpdateRosterShift,
  useSchedule,
  type Schedule,
} from '@/lib/api/schedules';
import { useQueryClient } from '@tanstack/react-query';
import {
  scheduleOccurrenceKeys,
  useDeleteScheduleEvent,
  useScheduleEvent,
  type EditScope,
  type ScheduleOccurrence,
} from '@/lib/api/schedule-events';
import { unscheduledKeys } from '@/lib/api/unscheduled';
import type { PendingScheduleEdit } from '@/components/schedules/EditScheduleModal';
import { getErrorMessage } from '@/lib/api/client';
import { runAction } from '@/lib/hooks/use-action';

export function useScheduleEditFlow() {
  const { t } = useTranslation(['schedules', 'common']);
  const queryClient = useQueryClient();

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
  const rowUnderEdit = useMemo<Schedule | null>(
    () => fetchedRow ?? (chosen?.is_projected ? (chosen as unknown as Schedule) : null),
    [fetchedRow, chosen]
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

  return {
    chosen,
    setChosen,
    detailOpen,
    setDetailOpen,
    editChooserOpen,
    setEditChooserOpen,
    deleteChooserOpen,
    setDeleteChooserOpen,
    rowEditOpen,
    setRowEditOpen,
    pendingEdit,
    setPendingEdit,
    pendingScope,
    eventEdit,
    setEventEdit,
    chosenEvent,
    rowUnderEdit,
    editPending: updateShift.isPending || updateAreas.isPending,
    refreshCalendar,
    onOccurrenceClick,
    onDetailEdit,
    onRowEditSubmit,
    onDetailDelete,
    onEditScope,
    onDeleteScope,
  };
}
