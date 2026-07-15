'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  DatePicker,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
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

/**
 * Selectable types. `SPECIAL` is deliberately absent: it resolves to
 * `DayType.HOLIDAY` exactly like `HOLIDAY` (backend `mapSpecialDayType`, web
 * `toDayType`) and there is no SPECIAL capacity tab, so picking it changed
 * nothing an operator could observe. The enum and `typeLabel` still handle it so
 * pre-existing SPECIAL rows keep rendering — this only stops new ones.
 */
const TYPES: SpecialDayType[] = ['HOLIDAY', 'WEEKEND'];

/**
 * Manage special-day overrides (holidays / days off) from the Jadwal page — a
 * side panel so a long list of days has room. The add form starts blank (nothing
 * preselected) so adding several in a row is quick.
 */
export function HolidayManagerModal({
  open,
  onOpenChange,
  year,
  canManage,
}: HolidayManagerModalProps) {
  const { t } = useTranslation(['schedules', 'common']);
  // In-panel year switcher so multi-year bulk entry doesn't need close/reopen.
  // Resets to the calendar's year each time the panel opens.
  const [selectedYear, setSelectedYear] = useState(year);
  useEffect(() => {
    if (open) setSelectedYear(year);
  }, [open, year]);
  const { data: overrides = [], isLoading } = useSpecialDayOverrides(
    `${selectedYear}-01-01`,
    `${selectedYear}-12-31`,
    open
  );
  const create = useCreateSpecialDayOverride();
  const remove = useDeleteSpecialDayOverride();

  // Nothing preselected — a blank form each time keeps bulk entry fast.
  const [date, setDate] = useState<string | undefined>();
  const [type, setType] = useState<SpecialDayType | ''>('');
  const [name, setName] = useState('');

  const sorted = useMemo(
    () => [...overrides].sort((a, b) => a.date.localeCompare(b.date)),
    [overrides]
  );

  const typeLabel = (ty: SpecialDayType) => t(`schedules:holidays.type.${ty}`);

  const onAdd = async () => {
    if (!date || !type) return;
    try {
      await create.mutateAsync({ date, day_type: type, name: name.trim() || undefined });
      toast.success(t('schedules:holidays.added'));
      setDate(undefined);
      setName('');
      setType('');
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* Don't auto-focus the first field — it would pop the date calendar open
          on every open; the add form should start fully blank. */}
      <SheetContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader>
          <SheetTitle>{t('schedules:holidays.title')}</SheetTitle>
          <p className="text-nb-body-sm text-nb-gray-500">{t('schedules:holidays.hint')}</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedYear((y) => y - 1)}
              aria-label={t('schedules:calendar.navigation.prev')}
              className="grid size-8 place-items-center rounded-nb-base border-2 border-nb-black bg-nb-white shadow-nb-sm hover:bg-nb-gray-50"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-16 text-center text-nb-h3 font-bold tabular-nums">
              {selectedYear}
            </span>
            <button
              type="button"
              onClick={() => setSelectedYear((y) => y + 1)}
              aria-label={t('schedules:calendar.navigation.next')}
              className="grid size-8 place-items-center rounded-nb-base border-2 border-nb-black bg-nb-white shadow-nb-sm hover:bg-nb-gray-50"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </SheetHeader>
        <SheetBody>
          {canManage && (
            <div className="mb-4 rounded-nb-base border-2 border-nb-black bg-nb-gray-50 p-3">
              <p className="mb-2 text-nb-caption font-bold uppercase tracking-wide text-nb-gray-500">
                {t('schedules:holidays.addTitle')}
              </p>
              <div className="flex flex-col gap-2">
                <DatePicker value={date} onValueChange={setDate} />
                <Select value={type} onValueChange={(v) => setType(v as SpecialDayType)}>
                  <SelectTrigger aria-label={t('schedules:holidays.typeLabel')}>
                    <SelectValue placeholder={t('schedules:holidays.typePlaceholder')} />
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
                <Button onClick={onAdd} disabled={!date || !type} loading={create.isPending}>
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
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
