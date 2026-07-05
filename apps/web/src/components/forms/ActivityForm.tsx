'use client';

/**
 * Activity Form Component
 * Reusable form for creating and editing activities
 */

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { FormInput, FormCombobox, Textarea } from '@/components/ui';
import { useActivityTypes } from '@/lib/api/activity-types';
import type { Activity, CreateActivityDto, UpdateActivityDto } from '@/types/models';

type ActivityFormData = {
  activity_type_id: string;
  description: string;
  photo_urls: string[];
};

export interface ActivityFormProps {
  /** Matches the `<form id>` so the modal's DialogFooter submit button (outside
   *  this form in the DOM) still submits it via the HTML `form` attribute. */
  formId: string;
  initialData?: Activity;
  onSubmit: (data: CreateActivityDto | UpdateActivityDto) => Promise<void>;
  mode: 'create' | 'edit';
  readOnly?: boolean;
}

export function ActivityForm({
  formId,
  initialData,
  onSubmit,
  mode,
  readOnly = false,
}: ActivityFormProps) {
  const { t } = useTranslation();

  const activitySchema = useMemo(
    () =>
      z.object({
        activity_type_id: z.string().uuid(t('validation:activityTypeRequired')),
        description: z
          .string()
          .min(5, t('validation:descriptionMin'))
          .max(500, t('validation:descriptionMax')),
        photo_urls: z
          .array(z.string().url())
          .min(1, t('validation:photoMin'))
          .max(3, t('validation:photoMax')),
      }),
    [t]
  );

  const { data: activityTypes, isLoading: loadingActivityTypes } = useActivityTypes();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      activity_type_id: initialData?.activity_type_id || '',
      description: initialData?.description || '',
      photo_urls: initialData?.photo_urls || [],
    },
  });

  const photoUrlsValue = watch('photo_urls');

  const handleSubmitForm = async (data: ActivityFormData) => {
    const submitData: CreateActivityDto | UpdateActivityDto =
      mode === 'create'
        ? {
            activity_type_id: data.activity_type_id,
            description: data.description,
            photo_urls: data.photo_urls,
          }
        : {
            description: data.description,
            photo_urls: data.photo_urls,
          };

    await onSubmit(submitData);
  };

  return (
    <form id={formId} onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-bold text-lg">{t('activities:form.basicInfoTitle')}</h3>

        {mode === 'create' && (
          <FormCombobox
            label={t('activities:form.activityType')}
            options={(activityTypes ?? []).map((type) => ({
              value: type.id,
              label: type.name,
            }))}
            value={watch('activity_type_id') || ''}
            onChange={(value) =>
              setValue('activity_type_id', value, { shouldValidate: true })
            }
            placeholder={
              loadingActivityTypes ? t('common:actions.loading') : t('activities:form.activityTypePlaceholder')
            }
            searchPlaceholder={t('activities:form.activityTypeSearch')}
            error={errors.activity_type_id?.message}
            required
            clearable={false}
            disabled={loadingActivityTypes || readOnly}
          />
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-bold leading-none">{t('activities:form.description')}</label>
          <Textarea
            placeholder={t('activities:form.descriptionPlaceholder')}
            rows={4}
            error={errors.description?.message}
            disabled={readOnly}
            {...register('description')}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold leading-none">
            {t('activities:form.photoUrls')} <span className="text-nb-danger">*</span>
          </label>
          <div className="space-y-2">
            {[0, 1, 2].map((index) => (
              <FormInput
                key={`photo-${index}`}
                label={t('activities:form.photo', { count: index + 1 })}
                placeholder={t('activities:form.photoPlaceholder')}
                disabled={readOnly}
                value={photoUrlsValue[index] || ''}
                onChange={(e) => {
                  const newPhotos = [...photoUrlsValue];
                  newPhotos[index] = e.target.value;
                  setValue(
                    'photo_urls',
                    newPhotos.filter((p) => p),
                    { shouldValidate: true }
                  );
                }}
              />
            ))}
          </div>
          {errors.photo_urls && (
            <p className="text-sm text-nb-danger">{errors.photo_urls.message}</p>
          )}
        </div>
      </div>
    </form>
  );
}
