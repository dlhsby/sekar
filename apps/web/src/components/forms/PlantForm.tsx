'use client';

/**
 * Plant Species Form Component
 * Reusable form for creating and editing plant species
 */

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { FormInput, FormCombobox, Textarea } from '@/components/ui';
import { FormActions } from '@/components/forms/FormActions';
import type { CreatePlantSpeciesDto, UpdatePlantSpeciesDto } from '@/lib/api/plants';
import type { PlantSpeciesRow } from '@/lib/api/plants';

type PlantFormData = {
  nameId: string;
  nameLatin?: string | null;
  category?: 'tree' | 'shrub' | 'groundcover' | 'flower';
  defaultPruningCycleDays?: number | null;
  notes?: string | null;
};

export interface PlantFormProps {
  initialData?: PlantSpeciesRow;
  onSubmit: (data: CreatePlantSpeciesDto | UpdatePlantSpeciesDto) => Promise<void>;
  isLoading?: boolean;
  mode: 'create' | 'edit';
  /** Read-only "Detail" mode — fields disabled, no submit. */
  readOnly?: boolean;
  /** Close handler for the "Tutup" button in read-only mode. */
  onCancel?: () => void;
}

export function PlantForm({
  initialData,
  onSubmit,
  isLoading = false,
  mode,
  readOnly = false,
  onCancel,
}: PlantFormProps) {
  const { t } = useTranslation(['plants', 'validation', 'common']);

  // Localized validation schema
  const plantSchema = useMemo(
    () =>
      z.object({
        nameId: z.string().min(1, t('validation:required')).max(255, t('validation:maxLength')),
        nameLatin: z.string().max(255, t('validation:maxLength')).optional().nullable(),
        category: z
          .enum(['tree', 'shrub', 'groundcover', 'flower'] as const, {
            error: () => t('validation:required'),
          })
          .optional(),
        defaultPruningCycleDays: z
          .number()
          .int()
          .min(1, t('plants:form.pruningCycleMin'))
          .optional()
          .nullable(),
        notes: z.string().max(1000, t('validation:maxLength')).optional().nullable(),
      } as const),
    [t]
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PlantFormData>({
    resolver: zodResolver(plantSchema),
    defaultValues: {
      nameId: initialData?.nameId || '',
      nameLatin: initialData?.nameLatin || '',
      category: initialData?.category || 'tree',
      defaultPruningCycleDays: initialData?.defaultPruningCycleDays || undefined,
      notes: initialData ? (initialData as PlantSpeciesRow & { notes?: string | null }).notes || '' : '',
    },
  });

  const categoryOptions = useMemo(
    () => [
      { value: 'tree', label: t('plants:categoryLabels.tree') },
      { value: 'shrub', label: t('plants:categoryLabels.shrub') },
      { value: 'groundcover', label: t('plants:categoryLabels.groundcover') },
      { value: 'flower', label: t('plants:categoryLabels.flower') },
    ],
    [t]
  );

  const onSubmitForm = async (data: PlantFormData) => {
    const submitData: UpdatePlantSpeciesDto = {
      nameId: data.nameId.trim(),
      nameLatin: data.nameLatin?.trim() || null,
      category: data.category || 'tree',
      defaultPruningCycleDays: data.defaultPruningCycleDays ?? null,
      notes: data.notes?.trim() || null,
    };

    await onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg">{t('plants:form.basicInfoTitle')}</h3>

        <FormInput
          label={t('plants:form.nameId')}
          placeholder={t('plants:form.nameIdPlaceholder')}
          error={errors.nameId?.message}
          required
          disabled={readOnly}
          {...register('nameId')}
        />

        <FormInput
          label={t('plants:form.nameLatin')}
          placeholder={t('plants:form.nameLatinPlaceholder')}
          error={errors.nameLatin?.message}
          disabled={readOnly}
          {...register('nameLatin')}
        />

        <FormCombobox
          label={t('plants:form.category')}
          options={categoryOptions}
          value={watch('category') || 'tree'}
          onChange={(v) => setValue('category', v as 'tree' | 'shrub' | 'groundcover' | 'flower', { shouldValidate: true })}
          error={errors.category?.message}
          disabled={readOnly}
          clearable={false}
        />

        <FormInput
          label={t('plants:form.defaultPruningCycleDays')}
          type="number"
          placeholder={t('plants:form.defaultPruningCycleDaysPlaceholder')}
          error={errors.defaultPruningCycleDays?.message}
          disabled={readOnly}
          {...register('defaultPruningCycleDays', { setValueAs: (v) => (v === '' || v === null ? null : parseInt(v, 10)) })}
        />

        <div className="space-y-1.5">
          <label className="text-sm font-bold leading-none">{t('plants:form.notes')}</label>
          <Textarea
            placeholder={t('plants:form.notesPlaceholder')}
            rows={3}
            error={errors.notes?.message}
            disabled={readOnly}
            {...register('notes')}
          />
        </div>
      </div>

      {/* Footer */}
      {readOnly ? (
        <FormActions readOnly onCancel={onCancel} />
      ) : (
        <FormActions
          submitLabel={
            isLoading
              ? mode === 'create'
                ? t('common:actions.creating')
                : t('common:actions.updating')
              : mode === 'create'
                ? t('plants:form.submitNew')
                : t('plants:form.submit')
          }
          loading={isLoading}
          onCancel={onCancel}
        />
      )}
    </form>
  );
}
