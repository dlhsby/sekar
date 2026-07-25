'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  type ColumnDef,
  DataTable,
  type DataTableRowAction,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  StatusPill,
  TimePicker,
} from '@/components/ui';
import {
  useShiftDefinitions,
  useCreateShiftDefinition,
  useUpdateShiftDefinition,
  useDeleteShiftDefinition,
  type ShiftDefinitionInput,
} from '@/lib/api/shift-definitions';
import { getErrorMessage } from '@/lib/api/client';
import type { ShiftDefinition } from '@/types/models';

interface ShiftDefinitionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whether the user may add/edit/remove (backend enforces too). */
  canManage: boolean;
}

const EMPTY_FORM: ShiftDefinitionInput = {
  name: '',
  start_time: '06:00',
  end_time: '15:00',
  early_window_min: 60,
  cutoff_grace_min: 60,
  start_reminder_min: 15,
  end_reminder_min: null,
  is_active: true,
};

const hhmm = (t: string): string => (t?.length >= 5 ? t.slice(0, 5) : t);

/** Coerce a number input to a non-negative int, or null when blank. */
const toMinOrNull = (v: string): number | null => {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
};

/**
 * Manage shift definitions (ADR-055 configurable shifts) from the Jadwal page.
 * The side sheet lists the day's shifts as our standard sortable/filterable
 * DataTable (name + status only); add/edit happens in a separate modal so closing
 * that modal (save or cancel) leaves the list open. Any number of shifts, each
 * with its own attribution window and reminder timing. Delete is soft —
 * historical schedules/attendance stay intact.
 */
export function ShiftDefinitionsModal({
  open,
  onOpenChange,
  canManage,
}: ShiftDefinitionsModalProps) {
  const { t } = useTranslation();
  const { data: shifts, isLoading } = useShiftDefinitions();
  const createMut = useCreateShiftDefinition();
  const updateMut = useUpdateShiftDefinition();
  const deleteMut = useDeleteShiftDefinition();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ShiftDefinitionInput>(EMPTY_FORM);

  const sorted = useMemo(
    () => [...(shifts ?? [])].sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [shifts],
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };
  const openEdit = (s: ShiftDefinition) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      start_time: hhmm(s.start_time),
      end_time: hhmm(s.end_time),
      early_window_min: s.early_window_min ?? 60,
      cutoff_grace_min: s.cutoff_grace_min ?? 60,
      start_reminder_min: s.start_reminder_min ?? 15,
      end_reminder_min: s.end_reminder_min ?? null,
      is_active: s.is_active,
    });
    setFormOpen(true);
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error(t('schedules:shiftDefs.errors.required'));
      return;
    }
    try {
      if (editingId) {
        await updateMut.mutateAsync({ id: editingId, input: form });
        toast.success(t('schedules:shiftDefs.updated'));
      } else {
        await createMut.mutateAsync(form);
        toast.success(t('schedules:shiftDefs.created'));
      }
      closeForm();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onDelete = async (s: ShiftDefinition) => {
    if (!window.confirm(t('schedules:shiftDefs.confirmDelete', { name: s.name }))) return;
    try {
      await deleteMut.mutateAsync(s.id);
      toast.success(t('schedules:shiftDefs.deleted'));
      if (editingId === s.id) closeForm();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const saving = createMut.isPending || updateMut.isPending;

  const columns = useMemo<ColumnDef<ShiftDefinition>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('schedules:shiftDefs.columns.name'),
        meta: { label: t('schedules:shiftDefs.columns.name') },
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div className="min-w-0">
              <div className="text-nb-body font-medium">{s.name}</div>
              <div className="text-nb-caption text-nb-gray-600">
                {hhmm(s.start_time)}–{hhmm(s.end_time)}
                {s.crosses_midnight ? ' (+1)' : ''}
              </div>
            </div>
          );
        },
      },
      {
        id: 'status',
        accessorFn: (s) => (s.is_active ? 'active' : 'inactive'),
        header: t('schedules:shiftDefs.columns.status'),
        meta: {
          label: t('schedules:shiftDefs.columns.status'),
          filterVariant: 'enum',
          filterOptions: [
            { label: t('schedules:shiftDefs.status.active'), value: 'active' },
            { label: t('schedules:shiftDefs.status.inactive'), value: 'inactive' },
          ],
        },
        cell: ({ row }) =>
          row.original.is_active ? (
            <StatusPill tone="ok">{t('schedules:shiftDefs.status.active')}</StatusPill>
          ) : (
            <StatusPill tone="neutral">{t('schedules:shiftDefs.status.inactive')}</StatusPill>
          ),
      },
    ],
    [t],
  );

  const rowActions = (s: ShiftDefinition): DataTableRowAction<ShiftDefinition>[] => [
    { key: 'edit', label: t('common:actions.edit'), icon: Pencil, onClick: () => openEdit(s) },
    {
      key: 'delete',
      label: t('common:actions.delete'),
      icon: Trash2,
      variant: 'danger',
      onClick: () => onDelete(s),
    },
  ];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full max-w-2xl">
          <SheetHeader>
            <SheetTitle>{t('schedules:shiftDefs.title')}</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-4">
            <p className="text-nb-body-sm text-nb-gray-600">
              {t('schedules:shiftDefs.description')}
            </p>

            <DataTable
              columns={columns}
              data={sorted}
              loading={isLoading}
              searchPlaceholder={t('schedules:shiftDefs.searchPlaceholder')}
              enableColumnToggle={false}
              enablePagination={false}
              emptyTitle={t('schedules:shiftDefs.empty')}
              rowActions={canManage ? rowActions : undefined}
              createAction={{
                label: t('schedules:shiftDefs.add'),
                onClick: openCreate,
                hidden: !canManage,
              }}
            />
          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* Add / Edit modal — separate from the sheet, so closing it (save or
          cancel) keeps the list sheet open. One field per row (single column). */}
      <Dialog open={formOpen} onOpenChange={(v) => !v && closeForm()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingId ? t('schedules:shiftDefs.editTitle') : t('schedules:shiftDefs.addTitle')}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div>
              <Label htmlFor="sd-name">{t('schedules:shiftDefs.fields.name')}</Label>
              <Input
                id="sd-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="sd-start">{t('schedules:shiftDefs.fields.start')}</Label>
              <TimePicker
                id="sd-start"
                value={form.start_time}
                onValueChange={(v) => setForm({ ...form, start_time: v })}
              />
            </div>
            <div>
              <Label htmlFor="sd-end">{t('schedules:shiftDefs.fields.end')}</Label>
              <TimePicker
                id="sd-end"
                value={form.end_time}
                onValueChange={(v) => setForm({ ...form, end_time: v })}
              />
            </div>
            <div>
              <Label htmlFor="sd-early">{t('schedules:shiftDefs.fields.early')}</Label>
              <Input
                id="sd-early"
                type="number"
                min={0}
                max={1440}
                value={form.early_window_min ?? 60}
                onChange={(e) => setForm({ ...form, early_window_min: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="sd-cutoff">{t('schedules:shiftDefs.fields.cutoff')}</Label>
              <Input
                id="sd-cutoff"
                type="number"
                min={0}
                max={1440}
                value={form.cutoff_grace_min ?? 60}
                onChange={(e) => setForm({ ...form, cutoff_grace_min: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="sd-start-reminder">
                {t('schedules:shiftDefs.fields.startReminder')}
              </Label>
              <Input
                id="sd-start-reminder"
                type="number"
                min={0}
                max={1440}
                value={form.start_reminder_min ?? ''}
                onChange={(e) =>
                  setForm({ ...form, start_reminder_min: toMinOrNull(e.target.value) ?? 0 })
                }
              />
            </div>
            <div>
              <Label htmlFor="sd-end-reminder">
                {t('schedules:shiftDefs.fields.endReminder')}
              </Label>
              <Input
                id="sd-end-reminder"
                type="number"
                min={0}
                max={1440}
                value={form.end_reminder_min ?? ''}
                onChange={(e) => setForm({ ...form, end_reminder_min: toMinOrNull(e.target.value) })}
              />
            </div>
            <p className="text-nb-caption text-nb-gray-600">
              {t('schedules:shiftDefs.reminderHint')}
            </p>
            <label className="flex items-center gap-2 text-nb-body-sm">
              <input
                type="checkbox"
                checked={form.is_active ?? true}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4"
              />
              {t('schedules:shiftDefs.fields.active')}
            </label>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={submit} loading={saving}>
              {t('common:actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ShiftDefinitionsModal;
