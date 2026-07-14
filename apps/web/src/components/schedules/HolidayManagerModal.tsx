'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  DatePicker,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import {
  useCreateSpecialDayOverride,
  useDeleteSpecialDayOverride,
  useSpecialDayOverrides,
  type SpecialDayType,
} from '@/lib/api/special-day-overrides';
import { getErrorMessage } from '@/lib/api/client';

interface HolidayManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current calendar year — the list scopes to it. */
  year: number;
  /** Whether the user may add/remove entries (backend enforces too). */
  canManage: boolean;
}

const TYPES: SpecialDayType[] = ['HOLIDAY', 'WEEKEND', 'SPECIAL'];

/**
 * Manage special-day overrides (holidays / days off) from the Jadwal page. These
 * flip a date's staffing day type (HOLIDAY/WEEKEND), which the board + monitoring
 * both read for their understaffing targets.
 */
export function HolidayManagerModal({
  open,
  onOpenChange,
  year,
  canManage,
}: HolidayManagerModalProps) {
  const { t } = useTranslation(['schedules', 'common']);
  const { data: overrides = [], isLoading } = useSpecialDayOverrides(
    `${year}-01-01`,
    `${year}-12-31`,
    open
  );
  const create = useCreateSpecialDayOverride();
  const remove = useDeleteSpecialDayOverride();

  const [date, setDate] = useState<string | undefined>();
  const [type, setType] = useState<SpecialDayType>('HOLIDAY');
  const [name, setName] = useState('');

  const sorted = useMemo(
    () => [...overrides].sort((a, b) => a.date.localeCompare(b.date)),
    [overrides]
  );

  const typeLabel = (ty: SpecialDayType) => t(`schedules:holidays.type.${ty}`);

  const onAdd = async () => {
    if (!date) return;
    try {
      await create.mutateAsync({ date, day_type: type, name: name.trim() || undefined });
      toast.success(t('schedules:holidays.added'));
      setDate(undefined);
      setName('');
      setType('HOLIDAY');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onDelete = async (id: string) => {
    try {
      await remove.mutateAsync(id);
      toast.success(t('schedules:holidays.deleted'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('schedules:holidays.title')}</DialogTitle>
          <p className="text-nb-body-sm text-nb-gray-500">{t('schedules:holidays.hint')}</p>
        </DialogHeader>
        <DialogBody>
          {canManage && (
            <div className="mb-4 rounded-nb-base border-2 border-nb-black bg-nb-gray-50 p-3">
              <p className="mb-2 text-nb-caption font-bold uppercase tracking-wide text-nb-gray-500">
                {t('schedules:holidays.addTitle')}
              </p>
              <div className="flex flex-col gap-2">
                <DatePicker value={date} onValueChange={setDate} />
                <Select value={type} onValueChange={(v) => setType(v as SpecialDayType)}>
                  <SelectTrigger aria-label={t('schedules:holidays.typeLabel')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((ty) => (
                      <SelectItem key={ty} value={ty}>
                        {typeLabel(ty)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('schedules:holidays.namePlaceholder')}
                  maxLength={100}
                />
                <Button onClick={onAdd} disabled={!date} loading={create.isPending}>
                  {t('common:actions.add')}
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            {isLoading ? (
              <p className="py-4 text-center text-nb-body-sm text-nb-gray-500">
                {t('common:loading', 'Loading…')}
              </p>
            ) : sorted.length === 0 ? (
              <p className="py-4 text-center text-nb-body-sm text-nb-gray-500">
                {t('schedules:holidays.empty')}
              </p>
            ) : (
              sorted.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center gap-2 rounded-nb-base border-2 border-nb-black bg-nb-white px-3 py-2"
                >
                  <span className="font-bold tabular-nums">{o.date}</span>
                  <span className="rounded-full border-2 border-nb-black bg-nb-gray-100 px-2 text-nb-caption font-bold">
                    {typeLabel(o.day_type)}
                  </span>
                  {o.name && (
                    <span className="truncate text-nb-body-sm text-nb-gray-600">{o.name}</span>
                  )}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => onDelete(o.id)}
                      aria-label={t('common:actions.delete')}
                      title={t('common:actions.delete')}
                      className="ml-auto grid size-8 shrink-0 place-items-center rounded-nb-base border-2 border-nb-black bg-nb-white text-nb-danger shadow-nb-sm hover:bg-nb-danger-light"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
