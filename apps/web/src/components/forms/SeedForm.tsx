'use client';

/**
 * Seed Form Component
 * Reusable form for creating and editing seeds
 */

import { useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/ui';
import { FormCombobox, type ComboboxOption } from '@/components/ui';
import { FormActions } from '@/components/forms/FormActions';
import { useSpeciesCatalog } from '@/lib/api/plants';
import type { PlantSeedRow, CreateSeedInput, UpdateSeedInput } from '@/lib/api/seeds';

type SeedFormData = {
  nameId: string;
  speciesId?: string | null;
  unit: 'gram' | 'piece' | 'packet';
  stockQty?: number;
};

export interface SeedFormProps {
  initialData?: PlantSeedRow;
  onSubmit: (data: CreateSeedInput | UpdateSeedInput) => Promise<void>;
  isLoading?: boolean;
  mode: 'create' | 'edit';
  /** Close handler for the "Batal" button. */
  onCancel?: () => void;
}

export function SeedForm({
  initialData,
  onSubmit,
  isLoading = false,
  mode,
  onCancel,
}: SeedFormProps) {
  const { t } = useTranslation();
  const { data: speciesCatalog } = useSpeciesCatalog(1, '', 50);

  // Localized validation schema
  const seedSchema = useMemo(
    () =>
      z.object({
        nameId: z.string().min(1, t('validation:required')).max(255, t('validation:maxLength', { max: 255 })),
        speciesId: z.string().optional().nullable(),
        unit: z
          .enum(['gram', 'piece', 'packet'] as const)
          .refine((v) => !!v, { message: t('validation:required') }),
        stockQty: mode === 'create'
          ? z.number().min(0, t('validation:minValue', { min: 0 })).optional()
          : z.never().optional(),
      }),
    [mode, t]
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SeedFormData>({
    resolver: zodResolver(seedSchema),
    defaultValues: {
      nameId: initialData?.nameId ?? '',
      speciesId: initialData?.speciesId ?? null,
      unit: initialData?.unit ?? 'piece',
      stockQty: initialData?.stockQty ?? undefined,
    },
  });

  const speciesOptions: ComboboxOption[] = useMemo(
    () =>
      (speciesCatalog?.data ?? []).map((species) => ({
        value: species.id,
        label: species.nameId,
      })),
    [speciesCatalog]
  );

  const unitOptions: ComboboxOption[] = useMemo(
    () => [
      { value: 'gram', label: t('seeds:units.gram') },
      { value: 'piece', label: t('seeds:units.piece') },
      { value: 'packet', label: t('seeds:units.packet') },
    ],
    [t]
  );

  const handleFormSubmit = handleSubmit(async (data) => {
    // For edit mode, exclude undefined fields
    const submitData =
      mode === 'edit'
        ? Object.fromEntries(
            Object.entries(data).filter(([, v]) => v !== undefined && v !== '')
          )
        : data;
    await onSubmit(submitData);
  });

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <Controller
        name="nameId"
        control={control}
        render={({ field }) => (
          <FormInput
            label={t('seeds:form.nameLabel')}
            placeholder={t('seeds:form.namePlaceholder')}
            {...field}
            error={errors.nameId?.message}
            required
            disabled={isLoading}
          />
        )}
      />

      <Controller
        name="speciesId"
        control={control}
        render={({ field }) => (
          <FormCombobox
            label={t('seeds:form.speciesLabel')}
            placeholder={t('seeds:form.speciesPlaceholder')}
            searchPlaceholder={t('seeds:form.speciesSearchPlaceholder')}
            options={speciesOptions}
            value={field.value ?? ''}
            onChange={field.onChange}
            disabled={isLoading}
            clearable
            error={errors.speciesId?.message}
          />
        )}
      />

      <Controller
        name="unit"
        control={control}
        render={({ field }) => (
          <FormCombobox
            label={t('seeds:form.unitLabel')}
            placeholder={t('seeds:form.unitPlaceholder')}
            options={unitOptions}
            value={field.value}
            onChange={field.onChange}
            required
            disabled={isLoading}
            error={errors.unit?.message}
          />
        )}
      />

      {mode === 'create' && (
        <Controller
          name="stockQty"
          control={control}
          render={({ field }) => (
            <FormInput
              label={t('seeds:form.initialStockLabel')}
              placeholder={t('seeds:form.initialStockPlaceholder')}
              type="number"
              {...field}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
              error={errors.stockQty?.message}
              disabled={isLoading}
            />
          )}
        />
      )}

      <FormActions
        onCancel={onCancel}
        submitLabel={t('seeds:form.submitButton')}
        loading={isLoading}
      />
    </form>
  );
}
