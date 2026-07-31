'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Power, Trash2 } from 'lucide-react';
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

/** New shifts are created active; activation is toggled from the row menu. */
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

type FormErrors = Partial<Record<keyof ShiftDefinitionInput, string>>;

const MINUTES_MAX = 1440;

const hhmm = (t: string): string => (t?.length >= 5 ? t.slice(0, 5) : t);

/** Digits only, leading zeros stripped ("045" → "45", "0" → "0", "" → ""). */
const sanitizeDigits = (raw: string): string =>
  raw.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
const numToStr = (n: number | null | undefined): string =>
  n === null || n === undefined ? '' : String(n);
const strToNum = (raw: string): number | null => {
  const s = sanitizeDigits(raw);
  return s === '' ? null : Number(s);
};

/**
 * Manage shift definitions (ADR-055 configurable shifts) from the Jadwal page.
 * The side sheet lists the day's shifts as our standard sortable/filterable
 * DataTable (name + status); the `…` row menu carries Ubah / Aktifkan⇄Nonaktifkan
 * / Hapus. Add/edit happens in a separate modal (new shifts are always active;
 * activation is only toggled from the menu) with inline validation. Any number of
 * shifts, each with its own attribution window and reminder timing. Delete is
 * soft — historical schedules/attendance stay intact.
 */
export function ShiftDefinitionsModal({
  open,
  onOpenChange,
  canManage,
}: ShiftDefinitionsModalProps) {
  const { t } = useTranslation();
  // Management list: include inactive shifts (shown with an "Inactive" status).
  const { data: shifts, isLoading } = useShiftDefinitions(true);
  const createMut = useCreateShiftDefinition();
  const updateMut = useUpdateShiftDefinition();
  const deleteMut = useDeleteShiftDefinition();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ShiftDefinitionInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});

  const sorted = useMemo(
    () => [...(shifts ?? [])].sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [shifts],
  );

  const setField = <K extends keyof ShiftDefinitionInput>(
    key: K,
    val: ShiftDefinitionInput[K],
  ) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
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
    setErrors({});
    setFormOpen(true);
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
  };

  /** Client-side validation → inline field errors. Required: name + all windows
   *  except the end reminder (which may be blank/0 = off). */
  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = t('schedules:shiftDefs.errors.required');

    const required: (keyof ShiftDefinitionInput)[] = [
      'early_window_min',
      'cutoff_grace_min',
      'start_reminder_min',
    ];
    for (const key of required) {
      const v = form[key] as number | null | undefined;
      if (v === null || v === undefined) e[key] = t('schedules:shiftDefs.errors.minutesRequired');
      else if (v < 0 || v > MINUTES_MAX) e[key] = t('schedules:shiftDefs.errors.minutesRange');
    }
    const end = form.end_reminder_min;
    if (end !== null && end !== undefined && (end < 0 || end > MINUTES_MAX)) {
      e.end_reminder_min = t('schedules:shiftDefs.errors.minutesRange');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) {
      toast.error(t('schedules:shiftDefs.errors.formInvalid'));
      return;
    }
    try {
      if (editingId) {
        await updateMut.mutateAsync({ id: editingId, input: form });
        toast.success(t('schedules:shiftDefs.updated'));
      } else {
        await createMut.mutateAsync({ ...form, is_active: true });
        toast.success(t('schedules:shiftDefs.created'));
      }
      closeForm();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const toggleActive = async (s: ShiftDefinition) => {
    try {
      await updateMut.mutateAsync({ id: s.id, input: { is_active: !s.is_active } });
      toast.success(
        t(s.is_active ? 'schedules:shiftDefs.deactivated' : 'schedules:shiftDefs.activated'),
      );
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
      key: 'toggle',
      label: t(
        s.is_active ? 'schedules:shiftDefs.deactivate' : 'schedules:shiftDefs.activate',
      ),
      icon: Power,
      onClick: () => toggleActive(s),
    },
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
            <FieldRow
              id="sd-name"
              label={t('schedules:shiftDefs.fields.name')}
              required
              error={errors.name}
            >
              <Input
                id="sd-name"
                value={form.name}
                aria-required
                aria-invalid={!!errors.name}
                onChange={(e) => setField('name', e.target.value)}
              />
            </FieldRow>

            <FieldRow
              id="sd-start"
              label={t('schedules:shiftDefs.fields.start')}
              required
              error={errors.start_time}
            >
              <TimePicker
                id="sd-start"
                value={form.start_time}
                onValueChange={(v) => setField('start_time', v)}
              />
            </FieldRow>

            <FieldRow
              id="sd-end"
              label={t('schedules:shiftDefs.fields.end')}
              required
              error={errors.end_time}
            >
              <TimePicker
                id="sd-end"
                value={form.end_time}
                onValueChange={(v) => setField('end_time', v)}
              />
            </FieldRow>

            <MinutesField
              id="sd-early"
              label={t('schedules:shiftDefs.fields.early')}
              hint={t('schedules:shiftDefs.fields.earlyHint')}
              required
              value={numToStr(form.early_window_min)}
              error={errors.early_window_min}
              onChange={(raw) => setField('early_window_min', strToNum(raw) ?? undefined)}
            />
            <MinutesField
              id="sd-cutoff"
              label={t('schedules:shiftDefs.fields.cutoff')}
              hint={t('schedules:shiftDefs.fields.cutoffHint')}
              required
              value={numToStr(form.cutoff_grace_min)}
              error={errors.cutoff_grace_min}
              onChange={(raw) => setField('cutoff_grace_min', strToNum(raw) ?? undefined)}
            />
            <MinutesField
              id="sd-start-reminder"
              label={t('schedules:shiftDefs.fields.startReminder')}
              required
              value={numToStr(form.start_reminder_min)}
              error={errors.start_reminder_min}
              onChange={(raw) => setField('start_reminder_min', strToNum(raw) ?? undefined)}
            />
            <MinutesField
              id="sd-end-reminder"
              label={t('schedules:shiftDefs.fields.endReminder')}
              value={numToStr(form.end_reminder_min)}
              error={errors.end_reminder_min}
              onChange={(raw) => setField('end_reminder_min', strToNum(raw))}
            />
            <p className="text-nb-caption text-nb-gray-600">
              {t('schedules:shiftDefs.reminderHint')}
            </p>
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

/** A labelled form row with a required marker + inline error message. */
function FieldRow({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  /** One line under the control explaining what the value does. */
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="text-nb-danger" aria-hidden>
            {' '}
            *
          </span>
        )}
      </Label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-nb-caption text-nb-gray-600">
          {hint}
        </p>
      )}
      {error && <p className="mt-1 text-nb-caption text-nb-danger">{error}</p>}
    </div>
  );
}

/**
 * A whole-number "minutes" input with the native stepper + min 0. Normalizes on
 * change (clamps ≥ 0, floors, strips leading zeros) and force-syncs the DOM value
 * so React's controlled-number quirk can't leave a stray "015" as you type.
 */
function MinutesField({
  id,
  label,
  required,
  value,
  error,
  hint,
  onChange,
}: {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  error?: string;
  hint?: string;
  onChange: (raw: string) => void;
}) {
  return (
    <FieldRow id={id} label={label} required={required} error={error} hint={hint}>
      <Input
        id={id}
        type="number"
        min={0}
        max={MINUTES_MAX}
        step={1}
        value={value}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={hint && !error ? `${id}-hint` : undefined}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') {
            // Required fields snap to "0" when emptied (min is 0); the optional
            // end-reminder may stay blank (= off).
            const next = required ? '0' : '';
            e.currentTarget.value = next;
            onChange(next);
            return;
          }
          const n = Math.max(0, Math.floor(Number(raw)));
          const next = Number.isFinite(n) ? String(n) : '';
          // Beat React's "value unchanged → skip DOM update" case (e.g. typing a
          // leading zero into "45" → parses back to 45 → DOM would keep "045").
          if (e.currentTarget.value !== next) e.currentTarget.value = next;
          onChange(next);
        }}
      />
    </FieldRow>
  );
}

export default ShiftDefinitionsModal;
