'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Input,
  Label,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
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
  code: '',
  start_time: '06:00',
  end_time: '15:00',
  early_window_min: 60,
  cutoff_grace_min: 60,
  is_active: true,
};

const hhmm = (t: string): string => (t?.length >= 5 ? t.slice(0, 5) : t);

/**
 * Manage shift definitions (ADR-055 configurable shifts) from the Jadwal page —
 * add / edit / remove the day's shifts (3 today, but any number: a single
 * all-day shift, two, five…). The attribution window (early/cutoff, minutes) is
 * per shift. A soft delete keeps historical schedules/attendance intact.
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
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ShiftDefinitionInput>(EMPTY_FORM);

  const sorted = useMemo(
    () => [...(shifts ?? [])].sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [shifts],
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };
  const openEdit = (s: ShiftDefinition) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      code: s.code,
      start_time: hhmm(s.start_time),
      end_time: hhmm(s.end_time),
      early_window_min: s.early_window_min ?? 60,
      cutoff_grace_min: s.cutoff_grace_min ?? 60,
      is_active: s.is_active,
    });
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const submit = async () => {
    if (!form.name.trim() || !form.code.trim()) {
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-md">
        <SheetHeader>
          <SheetTitle>{t('schedules:shiftDefs.title')}</SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-4">
          <p className="text-nb-body-sm text-nb-gray-600">{t('schedules:shiftDefs.description')}</p>

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
                      {s.code} · {hhmm(s.start_time)}–{hhmm(s.end_time)}
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

          {canManage && !showForm && (
            <Button variant="outline" onClick={openCreate} className="w-full">
              <Plus className="mr-1.5 h-4 w-4" aria-hidden />
              {t('schedules:shiftDefs.add')}
            </Button>
          )}

          {canManage && showForm && (
            <div className="space-y-3 rounded-nb-base border-2 border-nb-black bg-nb-gray-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-nb-body font-medium">
                  {editingId ? t('schedules:shiftDefs.editTitle') : t('schedules:shiftDefs.addTitle')}
                </span>
                <Button variant="ghost" size="icon" onClick={closeForm} aria-label={t('common:actions.cancel')}>
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="sd-name">{t('schedules:shiftDefs.fields.name')}</Label>
                  <Input
                    id="sd-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="sd-code">{t('schedules:shiftDefs.fields.code')}</Label>
                  <Input
                    id="sd-code"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <Label htmlFor="sd-start">{t('schedules:shiftDefs.fields.start')}</Label>
                  <Input
                    id="sd-start"
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="sd-end">{t('schedules:shiftDefs.fields.end')}</Label>
                  <Input
                    id="sd-end"
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
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

              <div className="flex gap-2">
                <Button variant="outline" onClick={closeForm} className="flex-1">
                  {t('common:actions.cancel')}
                </Button>
                <Button onClick={submit} loading={saving} className="flex-1">
                  {t('common:actions.save')}
                </Button>
              </div>
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

export default ShiftDefinitionsModal;
