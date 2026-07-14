'use client';

/**
 * Create/edit a ScheduleEvent (ADR-047): individual or team, static (location)
 * or mobile (region) scope, and structured recurrence (none / daily / every N
 * days / weekly / specific dates). On save the backend materializes in-horizon
 * occurrences and reports per-member conflicts, surfaced here as a warning.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  Button,
  Badge,
  DatePicker,
  FormInput,
  FormSelect,
  FormCombobox,
  Label,
} from '@/components/ui';
import { AsyncUserCombobox } from '@/components/forms/AsyncUserCombobox';
import {
  useCreateScheduleEvent,
  useUpdateScheduleEvent,
  type CreateScheduleEventInput,
  type UpdateScheduleEventInput,
  type EditScope,
  type MaterializationEntry,
  type RecurrenceType,
  type ScheduleEvent,
} from '@/lib/api/schedule-events';
import { useShiftDefinitions } from '@/lib/api/shift-definitions';
import { useUsers } from '@/lib/api/users';
import { useTeamCategories } from '@/lib/api/teams';
import { useLocations } from '@/lib/api/locations';
import { useRegions } from '@/lib/api/regions';
import { useRayons } from '@/lib/api/rayons';
import { usePermissions } from '@/lib/auth/usePermissions';
import { getErrorMessage } from '@/lib/api/client';

export interface ScheduleEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: ScheduleEvent;
  editScope?: EditScope;
  fromDate?: string;
  initialDate?: string;
  onSuccess?: () => void;
}

/** Roles that can appear on a schedule (ADR-047). */
const SCHEDULABLE_ROLES = ['satgas', 'linmas', 'korlap'];

/** Display order Mon..Sun; values are JS getDay() (0=Sunday). */
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const WEEKDAY_KEYS: Record<number, string> = {
  0: 'weekdaysSun',
  1: 'weekdaysMon',
  2: 'weekdaysTue',
  3: 'weekdaysWed',
  4: 'weekdaysThu',
  5: 'weekdaysFri',
  6: 'weekdaysSat',
};

type TFn = (key: string, opts?: Record<string, unknown>) => string;

function createSchema(t: TFn) {
  return z
    .object({
      title: z.string().max(120).optional(),
      kind: z.enum(['individual', 'team']),
      user_id: z.string().optional(),
      team_category_id: z.string().optional(),
      pic_user_id: z.string().optional(),
      member_ids: z.array(z.string()),
      shift_definition_id: z.string().min(1, t('validation:required')),
      // Geography cascade — rayon is required; kawasan/lokasi are optional and
      // narrow the scope (lokasi → static, kawasan → mobile, rayon-only → rayon).
      location_id: z.string().optional(),
      region_id: z.string().optional(),
      rayon_id: z.string().optional(),
      /** Seluruh Surabaya (Tim Patroli) — no rayon/kawasan/lokasi (city scope). */
      city_wide: z.boolean(),
      recurrence_type: z.enum(['none', 'daily', 'every_n_days', 'weekly', 'specific_dates']),
      // Registered with valueAsNumber (plain z.number keeps RHF input/output
      // types aligned — z.coerce diverges them and breaks the resolver types).
      interval_n: z.number().int().optional(),
      weekdays: z.array(z.number()),
      dates: z.array(z.string()),
      start_date: z.string().min(1, t('validation:required')),
      end_date: z.string().optional(),
      notes: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.kind === 'individual' && !data.user_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['user_id'],
          message: t('validation:required'),
        });
      }
      if (data.kind === 'team') {
        if (!data.team_category_id) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['team_category_id'],
            message: t('validation:required'),
          });
        }
        if (!data.pic_user_id) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['pic_user_id'],
            message: t('validation:required'),
          });
        }
      }
      // Rayon is required unless the event is city-wide (Seluruh Surabaya);
      // kawasan/lokasi are optional (they only narrow the scope).
      if (!data.city_wide && !data.rayon_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rayon_id'],
          message: t('validation:required'),
        });
      }
      if (data.recurrence_type === 'every_n_days') {
        if (!data.interval_n || data.interval_n < 2 || data.interval_n > 30) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['interval_n'],
            message: t('schedules:calendar.validation.intervalRange'),
          });
        }
      }
      if (data.recurrence_type === 'weekly' && data.weekdays.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['weekdays'],
          message: t('schedules:calendar.validation.weekdaysRequired'),
        });
      }
      if (data.recurrence_type === 'specific_dates' && data.dates.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dates'],
          message: t('schedules:calendar.validation.datesRequired'),
        });
      }
      if (data.end_date && data.start_date && data.end_date < data.start_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['end_date'],
          message: t('schedules:calendar.validation.endBeforeStart'),
        });
      }
    });
}

type FormValues = z.infer<ReturnType<typeof createSchema>>;

export function ScheduleEventModal({
  open,
  onOpenChange,
  event,
  editScope = 'series',
  fromDate,
  initialDate,
  onSuccess,
}: ScheduleEventModalProps) {
  const { t } = useTranslation(['schedules', 'common', 'validation']);
  const { can } = usePermissions();

  const isEditing = !!event;
  const isDisabled = isEditing ? !can('schedule:update') : !can('schedule:create');

  const schema = useMemo(() => createSchema(t as TFn), [t]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: event?.title ?? '',
      kind: event?.is_team ? 'team' : 'individual',
      user_id: event?.user_id ?? '',
      team_category_id: event?.team_category_id ?? '',
      pic_user_id: event?.pic_user_id ?? '',
      member_ids: event?.members?.map((m) => m.user_id) ?? [],
      shift_definition_id: event?.shift_definition_id ?? '',
      location_id: event?.location_id ?? '',
      region_id: event?.region_id ?? '',
      rayon_id: event?.rayon_id ?? '',
      city_wide: event?.scope === 'city',
      recurrence_type: event?.recurrence_type ?? 'none',
      interval_n: event?.recurrence_config?.interval_n ?? 2,
      weekdays: event?.recurrence_config?.weekdays ?? [],
      dates: event?.recurrence_config?.dates ?? [],
      start_date: event?.start_date ?? initialDate ?? '',
      end_date: event?.end_date ?? '',
      notes: event?.notes ?? '',
    },
  });

  const createMutation = useCreateScheduleEvent();
  const updateMutation = useUpdateScheduleEvent();

  const { data: shifts = [] } = useShiftDefinitions();
  const { data: usersResp } = useUsers({ limit: 1000 });
  const { data: teamCategories = [] } = useTeamCategories(
    can('schedule:create') || can('schedule:update')
  );
  const { data: locationsResp } = useLocations({ limit: 1000 });
  const { data: regions = [] } = useRegions();
  const { data: rayons = [] } = useRayons();

  const schedulableUsers = useMemo(
    () => (usersResp?.data ?? []).filter((u) => SCHEDULABLE_ROLES.includes(u.role)),
    [usersResp]
  );
  const userNameById = useMemo(
    () => new Map((usersResp?.data ?? []).map((u) => [u.id, u.full_name])),
    [usersResp]
  );
  const locations = locationsResp?.data ?? [];

  const formKind = watch('kind');
  const formCityWide = watch('city_wide');
  const formRayon = watch('rayon_id');
  const formRegion = watch('region_id');
  const formRecurrence = watch('recurrence_type');
  const formPic = watch('pic_user_id');
  const [dateDraft, setDateDraft] = useState('');

  const shiftOptions = shifts.map((s) => ({ value: s.id, label: s.name }));
  const teamCategoryOptions = teamCategories
    .filter((tt) => tt.is_active)
    .map((tt) => ({ value: tt.id, label: tt.name }));
  const rayonOptions = rayons.map((r) => ({ value: r.id, label: r.name }));
  // Kawasan options cascade from the chosen rayon; lokasi from the chosen kawasan.
  const regionOptions = regions
    .filter((r) => r.rayon_id === formRayon)
    .map((r) => ({ value: r.id, label: r.name }));
  const locationOptions = locations
    .filter((l) => l.region_id === formRegion)
    .map((l) => ({ value: l.id, label: l.name }));

  // Editing a static/mobile event: backfill the rayon → kawasan cascade from the
  // event's location/region once master data is loaded, so the selects show the
  // current placement (the event only carries the deepest id).
  const backfilled = useRef(false);
  useEffect(() => {
    if (!event || backfilled.current) return;
    if (event.location_id) {
      const loc = locations.find((l) => l.id === event.location_id);
      if (!loc) return;
      if (loc.region_id) setValue('region_id', loc.region_id);
      setValue('rayon_id', loc.rayon_id);
      backfilled.current = true;
    } else if (event.region_id) {
      const reg = regions.find((r) => r.id === event.region_id);
      if (!reg) return;
      setValue('rayon_id', reg.rayon_id);
      backfilled.current = true;
    } else {
      backfilled.current = true; // rayon-scope / manual — defaults already suffice
    }
  }, [event, locations, regions, setValue]);
  const recurrenceOptions: Array<{ value: RecurrenceType; label: string }> = [
    { value: 'none', label: t('schedules:calendar.event.recurrenceNone') },
    { value: 'daily', label: t('schedules:calendar.event.recurrenceDaily') },
    { value: 'every_n_days', label: t('schedules:calendar.event.recurrenceEveryNDays') },
    { value: 'weekly', label: t('schedules:calendar.event.recurrenceWeekly') },
    { value: 'specific_dates', label: t('schedules:calendar.event.recurrenceSpecificDates') },
  ];

  const warnConflicts = (result: {
    skipped?: MaterializationEntry[];
    conflicts?: MaterializationEntry[];
  }) => {
    const { skipped = [], conflicts = [] } = result;
    const hasWarnings = conflicts.length > 0 || skipped.length > 0;
    if (!hasWarnings) return false;

    const messages: string[] = [];

    if (conflicts.length > 0) {
      const conflictLines = conflicts
        .slice(0, 3)
        .map(
          (c) =>
            `${userNameById.get(c.user_id) ?? c.user_id} ${c.date}${c.conflicting_shift ? ` (${c.conflicting_shift})` : ''}`
        )
        .join('; ');
      const conflictMore =
        conflicts.length > 3
          ? ` ${t('schedules:calendar.conflicts.more', { count: conflicts.length - 3 })}`
          : '';
      messages.push(
        `${t('schedules:calendar.conflicts.createdWarning')} ${conflictLines}${conflictMore}`
      );
    }

    if (skipped.length > 0) {
      const skipLines = skipped
        .slice(0, 3)
        .map((s) => `${userNameById.get(s.user_id) ?? s.user_id} ${s.date}`)
        .join('; ');
      const skipMore =
        skipped.length > 3
          ? ` ${t('schedules:calendar.conflicts.more', { count: skipped.length - 3 })}`
          : '';
      messages.push(`${t('schedules:calendar.conflicts.skipped')} ${skipLines}${skipMore}`);
    }

    toast.warning(messages.join(' · '));
    return true;
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const recurrenceConfig =
        data.recurrence_type === 'every_n_days'
          ? { interval_n: data.interval_n }
          : data.recurrence_type === 'weekly'
            ? { weekdays: [...data.weekdays].sort((a, b) => a - b) }
            : data.recurrence_type === 'specific_dates'
              ? { dates: [...data.dates].sort() }
              : undefined;

      // Derive the scope: city-wide wins; else from how deep the geography
      // cascade is filled: lokasi → static, kawasan (no lokasi) → mobile,
      // rayon-only → rayon.
      const scope = data.city_wide
        ? 'city'
        : data.location_id
          ? 'static'
          : data.region_id
            ? 'mobile'
            : 'rayon';

      const payload: CreateScheduleEventInput = {
        title: data.title || undefined,
        recurrence_type: data.recurrence_type,
        start_date: data.start_date,
        end_date: data.end_date || null,
        recurrence_config: recurrenceConfig,
        shift_definition_id: data.shift_definition_id,
        scope,
        location_id: scope === 'static' ? data.location_id : null,
        region_id: scope === 'mobile' ? data.region_id : null,
        rayon_id: scope === 'rayon' ? data.rayon_id : null,
        is_team: data.kind === 'team',
        user_id: data.kind === 'individual' ? data.user_id : null,
        team_category_id: data.kind === 'team' ? data.team_category_id : null,
        pic_user_id: data.kind === 'team' ? data.pic_user_id : null,
        member_ids:
          data.kind === 'team' ? data.member_ids.filter((id) => id !== data.pic_user_id) : [],
        notes: data.notes || undefined,
      };

      if (isEditing && event) {
        // Kind (individual/team target) is immutable on the backend — strip it.

        const {
          is_team: _,
          user_id: __,
          team_category_id: ___,
          pic_user_id: ____,
          ...updatable
        } = payload;
        const result = await updateMutation.mutateAsync({
          id: event.id,
          // member_ids only applies to team events — the backend rejects it
          // on individual events.
          input: {
            ...updatable,
            ...(event.is_team ? { member_ids: payload.member_ids } : {}),
          } as UpdateScheduleEventInput,
          editScope,
          fromDate,
        });
        if (!warnConflicts(result.materialization)) {
          toast.success(t('schedules:calendar.messages.updateSuccess'));
        }
      } else {
        const result = await createMutation.mutateAsync(payload);
        if (!warnConflicts(result.materialization)) {
          toast.success(t('schedules:calendar.messages.createSuccess'));
        }
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const toggleWeekday = (current: number[], day: number): number[] =>
    current.includes(day) ? current.filter((d) => d !== day) : [...current, day];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t('schedules:calendar.event.editTitle')
              : t('schedules:calendar.event.createTitle')}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form id="event-form" className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {/* Kind: individual vs team (immutable when editing) */}
            <FormSelect
              label={t('schedules:calendar.event.kindLabel')}
              options={[
                { value: 'individual', label: t('schedules:calendar.event.kindIndividual') },
                { value: 'team', label: t('schedules:calendar.event.kindTeam') },
              ]}
              value={formKind}
              onChange={(v) => setValue('kind', v as 'individual' | 'team')}
              disabled={isEditing}
            />

            {formKind === 'individual' && (
              <AsyncUserCombobox
                label={t('schedules:calendar.event.workerLabel')}
                required
                roles={SCHEDULABLE_ROLES}
                value={watch('user_id') || ''}
                onValueChange={(v) => setValue('user_id', v, { shouldValidate: true })}
                initialLabel={event?.user?.full_name}
                placeholder={t('schedules:calendar.event.workerPlaceholder')}
                error={errors.user_id?.message}
                disabled={isEditing}
              />
            )}

            {formKind === 'team' && (
              <>
                <FormCombobox
                  label={t('schedules:calendar.event.teamCategoryLabel')}
                  options={teamCategoryOptions}
                  value={watch('team_category_id') || ''}
                  onChange={(v) => setValue('team_category_id', v, { shouldValidate: true })}
                  placeholder={t('schedules:calendar.event.teamCategoryPlaceholder')}
                  error={errors.team_category_id?.message}
                  disabled={isEditing}
                />
                <AsyncUserCombobox
                  label={t('schedules:calendar.event.picLabel')}
                  required
                  roles={SCHEDULABLE_ROLES}
                  value={formPic || ''}
                  onValueChange={(v) => setValue('pic_user_id', v, { shouldValidate: true })}
                  initialLabel={event?.pic_user?.full_name}
                  placeholder={t('schedules:calendar.event.picPlaceholder')}
                  error={errors.pic_user_id?.message}
                />
                <Controller
                  control={control}
                  name="member_ids"
                  render={({ field }) => (
                    <div>
                      <p className="mb-1 text-nb-body-sm font-medium">
                        {t('schedules:calendar.event.memberLabel')}
                      </p>
                      <div className="max-h-40 space-y-1 overflow-y-auto rounded-nb-base border-2 border-nb-black p-2">
                        {schedulableUsers
                          .filter((u) => u.id !== formPic)
                          .map((u) => (
                            <label key={u.id} className="flex items-center gap-2 text-nb-body-sm">
                              <input
                                type="checkbox"
                                checked={field.value.includes(u.id)}
                                onChange={() =>
                                  field.onChange(
                                    field.value.includes(u.id)
                                      ? field.value.filter((id) => id !== u.id)
                                      : [...field.value, u.id]
                                  )
                                }
                              />
                              <span className="truncate">{u.full_name}</span>
                            </label>
                          ))}
                      </div>
                    </div>
                  )}
                />
              </>
            )}

            <FormCombobox
              label={t('schedules:calendar.event.shiftLabel')}
              options={shiftOptions}
              value={watch('shift_definition_id') || ''}
              onChange={(v) => setValue('shift_definition_id', v, { shouldValidate: true })}
              placeholder={t('schedules:calendar.event.shiftPlaceholder')}
              error={errors.shift_definition_id?.message}
              required
            />

            {/* City-wide (Seluruh Surabaya / Tim Patroli): no rayon/kawasan/lokasi. */}
            <label className="flex items-start gap-2 rounded-nb-base border-2 border-nb-black bg-nb-gray-50 p-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-nb-primary"
                checked={formCityWide}
                onChange={(e) => {
                  setValue('city_wide', e.target.checked, { shouldValidate: true });
                  if (e.target.checked) {
                    setValue('rayon_id', '');
                    setValue('region_id', '');
                    setValue('location_id', '');
                  }
                }}
              />
              <span>
                <span className="block text-nb-body-sm font-bold">
                  {t('schedules:calendar.event.cityWideLabel')}
                </span>
                <span className="block text-nb-caption text-nb-gray-500">
                  {t('schedules:calendar.event.cityWideHint')}
                </span>
              </span>
            </label>

            {/* Placement cascade: Rayon (required) → Kawasan (optional) → Lokasi.
                The deepest level filled decides monitoring scope on save. Hidden
                for city-wide events. */}
            {!formCityWide && (
              <FormCombobox
                label={t('schedules:calendar.event.rayonLabel')}
                options={rayonOptions}
                value={formRayon || ''}
                onChange={(v) => {
                  setValue('rayon_id', v, { shouldValidate: true });
                  setValue('region_id', '');
                  setValue('location_id', '');
                }}
                placeholder={t('schedules:calendar.event.rayonPlaceholder')}
                error={errors.rayon_id?.message}
                required
              />
            )}

            {!formCityWide && formRayon && (
              <FormCombobox
                label={t('schedules:calendar.event.regionLabel')}
                options={regionOptions}
                value={formRegion || ''}
                onChange={(v) => {
                  setValue('region_id', v, { shouldValidate: true });
                  setValue('location_id', '');
                }}
                placeholder={t('schedules:calendar.event.regionPlaceholder')}
                helperText={t('schedules:calendar.event.regionScopeHint')}
              />
            )}

            {!formCityWide && formRegion && (
              <FormCombobox
                label={t('schedules:calendar.event.locationLabel')}
                options={locationOptions}
                value={watch('location_id') || ''}
                onChange={(v) => setValue('location_id', v, { shouldValidate: true })}
                placeholder={t('schedules:calendar.event.locationPlaceholder')}
                helperText={t('schedules:calendar.event.locationScopeHint')}
              />
            )}

            {/* Recurrence */}
            <FormSelect
              label={t('schedules:calendar.event.recurrenceLabel')}
              options={recurrenceOptions}
              value={formRecurrence}
              onChange={(v) =>
                setValue('recurrence_type', v as RecurrenceType, { shouldValidate: true })
              }
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

            <div className="grid grid-cols-2 gap-3">
              <Controller
                control={control}
                name="start_date"
                render={({ field }) => (
                  <div className="space-y-1">
                    <Label>
                      {t('schedules:calendar.event.startDateLabel')}
                      <span className="ml-1 text-nb-danger">*</span>
                    </Label>
                    <DatePicker
                      value={field.value || undefined}
                      onValueChange={(v) => field.onChange(v ?? '')}
                      error={!!errors.start_date}
                    />
                    {errors.start_date && (
                      <p className="text-nb-body-sm font-medium text-nb-danger" role="alert">
                        {errors.start_date.message}
                      </p>
                    )}
                  </div>
                )}
              />
              <Controller
                control={control}
                name="end_date"
                render={({ field }) => (
                  <div className="space-y-1">
                    <Label>{t('schedules:calendar.event.endDateLabel')}</Label>
                    <DatePicker
                      value={field.value || undefined}
                      onValueChange={(v) => field.onChange(v ?? '')}
                      error={!!errors.end_date}
                    />
                    {errors.end_date ? (
                      <p className="text-nb-body-sm font-medium text-nb-danger" role="alert">
                        {errors.end_date.message}
                      </p>
                    ) : (
                      <p className="text-nb-body-sm text-nb-gray-600">
                        {t('schedules:calendar.event.endDateOptional')}
                      </p>
                    )}
                  </div>
                )}
              />
            </div>

            <FormInput
              label={t('schedules:calendar.event.notesLabel')}
              placeholder={t('schedules:calendar.event.notesPlaceholder')}
              {...register('notes')}
            />
          </form>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('schedules:calendar.event.cancel')}
          </Button>
          <Button
            form="event-form"
            type="submit"
            disabled={isDisabled || isSubmitting}
            loading={isSubmitting}
          >
            {t('schedules:calendar.event.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
