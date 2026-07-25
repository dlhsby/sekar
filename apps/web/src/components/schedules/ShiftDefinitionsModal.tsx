'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
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
  is_active: true,
};

const hhmm = (t: string): string => (t?.length >= 5 ? t.slice(0, 5) : t);

/**
 * Manage shift definitions (ADR-055 configurable shifts) from the Jadwal page.
 * The side sheet lists the day's shifts; add/edit happens in a separate modal so
 * closing that modal (save or cancel) leaves the list open. Any number of shifts
 * (a single all-day shift, two, five…); each carries a per-shift attribution
 * window. Delete is soft — historical schedules/attendance stay intact.
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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full max-w-md">
          <SheetHeader>
            <SheetTitle>{t('schedules:shiftDefs.title')}</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-4">
            <p className="text-nb-body-sm text-nb-gray-600">
              {t('schedules:shiftDefs.description')}
            </p>

            {isLoading ? (
              <p className="text-nb-body-sm text-nb-gray-500">{t('common:loading')}</p>
            ) : (
              <ul className="space-y-2">
                {sorted.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 rounded-nb-base border-2 border-nb-black bg-nb-white p-3 shadow-nb-sm"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-nb-body font-medium">{s.name}</span>
                        {!s.is_active && (
                          <Badge variant="outline">{t('schedules:shiftDefs.inactive')}</Badge>
                        )}
                      </div>
                      <div className="text-nb-caption text-nb-gray-600">
                        {hhmm(s.start_time)}–{hhmm(s.end_time)}
                        {s.crosses_midnight ? ' (+1)' : ''} ·{' '}
                        {t('schedules:shiftDefs.window', {
                          early: s.early_window_min ?? 60,
                          cutoff: s.cutoff_grace_min ?? 60,
                        })}
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(s)}
                          aria-label={t('common:actions.edit')}
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(s)}
                          aria-label={t('common:actions.delete')}
                        >
                          <Trash2 className="h-4 w-4 text-nb-danger" aria-hidden />
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
                {sorted.length === 0 && (
                  <li className="text-nb-body-sm text-nb-gray-500">
                    {t('schedules:shiftDefs.empty')}
                  </li>
                )}
              </ul>
            )}

            {canManage && (
              <Button variant="outline" onClick={openCreate} className="w-full">
                <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                {t('schedules:shiftDefs.add')}
              </Button>
            )}
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
