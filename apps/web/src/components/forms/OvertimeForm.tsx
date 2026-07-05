'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isValid, parse } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { FormInput, FormCombobox, Textarea, DateTimePicker } from '@/components/ui';
import { FormActions } from '@/components/forms/FormActions';
import { useUsers } from '@/lib/api/users';
import { useActivityTypes } from '@/lib/api/activity-types';
import type { Overtime } from '@/types/models';

interface OvertimeFormProps {
  initialData?: Overtime;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isLoading?: boolean;
  mode: 'create' | 'edit';
  onCancel?: () => void;
}

/** Convert ISO datetime string to yyyy-MM-dd HH:mm format for the DateTimePicker. */
function isoToDisplayDatetime(isoString?: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch {
    return '';
  }
}

/** Convert yyyy-MM-dd HH:mm format to ISO string with timezone. */
function displayDatetimeToIso(displayDatetime: string): string {
  if (!displayDatetime) return '';
  try {
    // Explicit format string (not `new Date(str)`) — the space-separated
    // "yyyy-MM-dd HH:mm" form isn't a spec-guaranteed parseable format.
    const date = parse(displayDatetime, 'yyyy-MM-dd HH:mm', new Date());
    return isValid(date) ? date.toISOString() : '';
  } catch {
    return '';
  }
}

type OvertimeFormData = {
  user_id: string;
  start_datetime: string;
  end_datetime: string;
  activity_type_id: string;
  description: string;
  gps_lat?: number;
  gps_lng?: number;
};

export function OvertimeForm({
  initialData,
  onSubmit,
  isLoading = false,
  mode,
  onCancel,
}: OvertimeFormProps) {
  const { t } = useTranslation(['overtime', 'validation', 'common']);

  const overtimeSchema = useMemo(
    () =>
      z.object({
        user_id: z.string().uuid(t('validation:userRequired')),
        start_datetime: z.string().min(1, t('validation:startDatetimeRequired')),
        end_datetime: z.string().min(1, t('validation:endDatetimeRequired')),
        activity_type_id: z.string().uuid(t('validation:activityTypeRequired')),
        description: z.string().min(1, t('validation:descriptionRequired')),
        gps_lat: z.number().optional(),
        gps_lng: z.number().optional(),
      }),
    [t],
  );

  const { data: usersResponse, isLoading: loadingUsers } = useUsers({ limit: 1000 });
  const usersData = usersResponse?.data ?? [];
  const { data: activityTypesData, isLoading: loadingActivityTypes } = useActivityTypes();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OvertimeFormData>({
    resolver: zodResolver(overtimeSchema),
    defaultValues: {
      user_id: initialData?.user_id || '',
      start_datetime: isoToDisplayDatetime(initialData?.start_datetime),
      end_datetime: isoToDisplayDatetime(initialData?.end_datetime),
      activity_type_id: initialData?.activity_type_id || '',
      description: initialData?.description || '',
      gps_lat: initialData?.gps_lat != null ? Number(initialData.gps_lat) : undefined,
      gps_lng: initialData?.gps_lng != null ? Number(initialData.gps_lng) : undefined,
    },
  });

  const onSubmitForm = async (data: OvertimeFormData) => {
    const submitData = {
      user_id: data.user_id,
      start_datetime: displayDatetimeToIso(data.start_datetime),
      end_datetime: displayDatetimeToIso(data.end_datetime),
      activity_type_id: data.activity_type_id,
      description: data.description,
      ...(data.gps_lat !== undefined && { gps_lat: data.gps_lat }),
      ...(data.gps_lng !== undefined && { gps_lng: data.gps_lng }),
    };
    await onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      <div className="space-y-4">
        <FormCombobox
          label={t('overtime:form.user')}
          options={usersData.map((user) => ({
            value: user.id,
            label: `${user.full_name} (${user.username})`,
          }))}
          value={watch('user_id') || ''}
          onChange={(value) => setValue('user_id', value, { shouldValidate: true })}
          placeholder={loadingUsers ? t('common:actions.loading') : t('overtime:form.userPlaceholder')}
          searchPlaceholder={t('overtime:form.userSearchPlaceholder')}
          error={errors.user_id?.message}
          required
          clearable={false}
          disabled={loadingUsers || isLoading}
        />

        <div className="space-y-1.5">
          <label className="text-sm font-bold leading-none">
            {t('overtime:form.startDatetime')}
            <span className="text-nb-danger ml-1">*</span>
          </label>
          <DateTimePicker
            value={watch('start_datetime')}
            onValueChange={(value) => setValue('start_datetime', value, { shouldValidate: true })}
            placeholder={t('overtime:form.startDatetimePlaceholder')}
            disabled={isLoading}
            error={!!errors.start_datetime}
            aria-describedby={errors.start_datetime ? 'start-datetime-error' : undefined}
          />
          {errors.start_datetime && (
            <p id="start-datetime-error" className="text-sm text-nb-danger font-medium">
              {errors.start_datetime.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold leading-none">
            {t('overtime:form.endDatetime')}
            <span className="text-nb-danger ml-1">*</span>
          </label>
          <DateTimePicker
            value={watch('end_datetime')}
            onValueChange={(value) => setValue('end_datetime', value, { shouldValidate: true })}
            placeholder={t('overtime:form.endDatetimePlaceholder')}
            disabled={isLoading}
            error={!!errors.end_datetime}
            aria-describedby={errors.end_datetime ? 'end-datetime-error' : undefined}
          />
          {errors.end_datetime && (
            <p id="end-datetime-error" className="text-sm text-nb-danger font-medium">
              {errors.end_datetime.message}
            </p>
          )}
        </div>

        <FormCombobox
          label={t('overtime:form.activityType')}
          options={(activityTypesData ?? []).map((type) => ({
            value: type.id,
            label: type.name,
          }))}
          value={watch('activity_type_id') || ''}
          onChange={(value) => setValue('activity_type_id', value, { shouldValidate: true })}
          placeholder={loadingActivityTypes ? t('common:actions.loading') : t('overtime:form.activityTypePlaceholder')}
          searchPlaceholder={t('overtime:form.activityTypeSearchPlaceholder')}
          error={errors.activity_type_id?.message}
          required
          clearable={false}
          disabled={loadingActivityTypes || isLoading}
        />

        <div className="space-y-1.5">
          <label className="text-sm font-bold leading-none">
            {t('overtime:form.description')}
            <span className="text-nb-danger ml-1">*</span>
          </label>
          <Textarea
            placeholder={t('overtime:form.descriptionPlaceholder')}
            rows={4}
            error={errors.description?.message}
            disabled={isLoading}
            {...register('description')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label={t('overtime:form.gpsLat')}
            type="number"
            step="0.000001"
            min="-90"
            max="90"
            placeholder={t('overtime:form.gpsLatPlaceholder')}
            error={errors.gps_lat?.message}
            disabled={isLoading}
            {...register('gps_lat', { valueAsNumber: true })}
          />
          <FormInput
            label={t('overtime:form.gpsLng')}
            type="number"
            step="0.000001"
            min="-180"
            max="180"
            placeholder={t('overtime:form.gpsLngPlaceholder')}
            error={errors.gps_lng?.message}
            disabled={isLoading}
            {...register('gps_lng', { valueAsNumber: true })}
          />
        </div>
      </div>

      <FormActions
        loading={isLoading}
        onCancel={onCancel}
        submitLabel={mode === 'edit' ? t('common:actions.update') : t('common:actions.create')}
      />
    </form>
  );
}
