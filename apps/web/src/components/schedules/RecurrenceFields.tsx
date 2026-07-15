'use client';

import { Controller, type Control, type UseFormRegister, type UseFormSetValue, type FieldErrors } from 'react-hook-form';
import type { TFunction } from 'i18next';
import { Plus, X } from 'lucide-react';
import { Badge, Button, DatePicker, FormInput, FormSelect } from '@/components/ui';
import type { FormValues } from '@/components/schedules/ScheduleEventModal';
import type { RecurrenceType } from '@/lib/api/schedule-events';

/** Monday-first display order (JS getDay() puts Sunday at 0). */
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** i18n keys for the weekday toggles, indexed by JS getDay(). */
const WEEKDAY_KEYS: Record<number, string> = {
  0: 'weekdaysSun',
  1: 'weekdaysMon',
  2: 'weekdaysTue',
  3: 'weekdaysWed',
  4: 'weekdaysThu',
  5: 'weekdaysFri',
  6: 'weekdaysSat',
};

/**
 * The recurrence half of the Buat Jadwal form: the rule select plus whichever
 * editor it implies (every-N-days interval, weekday toggles, specific dates).
 *
 * Split out of ScheduleEventModal, which had grown past the 800-line ceiling in
 * CLAUDE.md. Like TeamFields this is a natural seam — a self-contained editor
 * with its own draft state (`dateDraft`) that nothing else reads.
 */
export interface RecurrenceFieldsProps {
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  errors: FieldErrors<FormValues>;
  t: TFunction;
  recurrence: FormValues['recurrence_type'];
  recurrenceOptions: Array<{ value: RecurrenceType; label: string }>;
  dateDraft: string;
  setDateDraft: (v: string) => void;
}

const toggleWeekday = (current: number[], day: number): number[] =>
  current.includes(day) ? current.filter((d) => d !== day) : [...current, day];

export function RecurrenceFields({
  control,
  register,
  setValue,
  errors,
  t,
  recurrence: formRecurrence,
  recurrenceOptions,
  dateDraft,
  setDateDraft,
}: RecurrenceFieldsProps) {
  return (
    <>
        {/* Recurrence */}
        <FormSelect
          label={t('schedules:calendar.event.recurrenceLabel')}
          options={recurrenceOptions}
          value={formRecurrence}
          placeholder={t('schedules:calendar.event.recurrencePlaceholder')}
          onChange={(v) =>
            setValue('recurrence_type', v as RecurrenceType, { shouldValidate: true })
          }
          error={errors.recurrence_type?.message}
          required
        />

        {formRecurrence === 'every_n_days' && (
          <FormInput
            label={t('schedules:calendar.event.recurrenceEveryNDaysLabel')}
            type="number"
            min={2}
            max={30}
            error={errors.interval_n?.message}
            {...register('interval_n', { valueAsNumber: true })}
          />
        )}

        {formRecurrence === 'weekly' && (
          <Controller
            control={control}
            name="weekdays"
            render={({ field }) => (
              <div>
                <div className="flex flex-wrap gap-1">
                  {WEEKDAY_ORDER.map((day) => (
                    <Button
                      key={day}
                      type="button"
                      size="sm"
                      variant={field.value.includes(day) ? 'default' : 'outline'}
                      onClick={() => field.onChange(toggleWeekday(field.value, day))}
                    >
                      {t(`schedules:calendar.event.${WEEKDAY_KEYS[day]}`)}
                    </Button>
                  ))}
                </div>
                {errors.weekdays && (
                  <p className="mt-1 text-nb-caption text-nb-danger-dark">
                    {errors.weekdays.message}
                  </p>
                )}
              </div>
            )}
          />
        )}

        {formRecurrence === 'specific_dates' && (
          <Controller
            control={control}
            name="dates"
            render={({ field }) => (
              <div>
                <p className="mb-1 text-nb-body-sm font-medium">
                  {t('schedules:calendar.event.datesLabel')}
                </p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <DatePicker
                      value={dateDraft || undefined}
                      onValueChange={(v) => setDateDraft(v ?? '')}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!dateDraft || field.value.includes(dateDraft)}
                    onClick={() => {
                      field.onChange([...field.value, dateDraft].sort());
                      setDateDraft('');
                    }}
                  >
                    {t('common:actions.add')}
                  </Button>
                </div>
                {field.value.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {field.value.map((d) => (
                      <Badge key={d} variant="secondary" className="gap-1">
                        {d}
                        <button
                          type="button"
                          aria-label={t('common:actions.delete')}
                          onClick={() => field.onChange(field.value.filter((x) => x !== d))}
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                {errors.dates && (
                  <p className="mt-1 text-nb-caption text-nb-danger-dark">
                    {errors.dates.message}
                  </p>
                )}
              </div>
            )}
          />
        )}
    </>
  );
}
