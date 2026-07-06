'use client';

/**
 * Pruning Request Form Component
 * For admin-side create and edit of pruning requests.
 * Handles editable fields: address, notes, tree details, contact information.
 */

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { FormInput, Textarea } from '@/components/ui';
import type { PruningRequest } from '@/lib/api/pruning-requests';
import type { UpdatePruningRequestPayload } from '@/lib/api/pruning-requests';

type PruningRequestFormData = {
  address: string;
  treeCount?: number;
  treeHeightEstimate?: string;
  treeDiameterEstimate?: string;
  requesterName?: string;
  requesterPhone?: string;
  rtLeaderName?: string;
  rtLeaderPhone?: string;
  notes?: string;
  /** Create mode only — left blank falls back to an area-center estimate, not a real GPS fix. */
  gpsLat?: number;
  gpsLng?: number;
};

export interface PruningRequestFormProps {
  /** Matches the `<form id>` so the modal's DialogFooter submit button (outside
   *  this form in the DOM) still submits it via the HTML `form` attribute. */
  formId: string;
  initialData?: PruningRequest;
  onSubmit: (data: UpdatePruningRequestPayload & { gpsLat?: number; gpsLng?: number }) => Promise<void>;
  mode: 'create' | 'edit';
  /** Read-only "Detail" mode — fields disabled, no submit. */
  readOnly?: boolean;
}

export function PruningRequestForm({
  formId,
  initialData,
  onSubmit,
  mode,
  readOnly = false,
}: PruningRequestFormProps) {
  const { t } = useTranslation();

  // Localized validation schema
  const pruningSchema = useMemo(
    () =>
      z.object({
        address: z
          .string()
          .min(5, t('pruning:form.addressMinError'))
          .max(500, t('pruning:form.addressMaxError')),
        treeCount: z.number().int().min(1).optional(),
        treeHeightEstimate: z.string().max(100).optional(),
        treeDiameterEstimate: z.string().max(100).optional(),
        requesterName: z.string().max(100).optional(),
        requesterPhone: z.string().max(30).optional(),
        rtLeaderName: z.string().max(100).optional(),
        rtLeaderPhone: z.string().max(30).optional(),
        notes: z.string().max(1000, t('pruning:form.notesMaxError')).optional(),
        gpsLat: z.number().min(-90).max(90).optional(),
        gpsLng: z.number().min(-180).max(180).optional(),
      }),
    [t]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PruningRequestFormData>({
    resolver: zodResolver(pruningSchema),
    defaultValues: {
      address: initialData?.address || '',
      treeCount: initialData?.treeCount ?? undefined,
      treeHeightEstimate: initialData?.treeHeightEstimate ?? undefined,
      treeDiameterEstimate: initialData?.treeDiameterEstimate ?? undefined,
      requesterName: initialData?.requesterName ?? undefined,
      requesterPhone: initialData?.requesterPhone ?? undefined,
      rtLeaderName: initialData?.rtLeaderName ?? undefined,
      rtLeaderPhone: initialData?.rtLeaderPhone ?? undefined,
      notes: initialData?.notes ?? undefined,
      gpsLat: undefined,
      gpsLng: undefined,
    },
  });

  const onSubmitForm = async (data: PruningRequestFormData) => {
    await onSubmit(data);
  };

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      {/* Location */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg">{t('pruning:form.locationSection')}</h3>

        <FormInput
          label={t('pruning:form.addressLabel')}
          placeholder={t('pruning:form.addressPlaceholder')}
          error={errors.address?.message}
          required
          disabled={readOnly}
          {...register('address')}
        />

        {mode === 'create' && !readOnly ? (
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              type="number"
              step="any"
              label={t('pruning:form.gpsLatLabel')}
              placeholder={t('pruning:form.gpsPlaceholder')}
              helperText={t('pruning:form.gpsHelperText')}
              error={errors.gpsLat?.message}
              {...register('gpsLat', { valueAsNumber: true })}
            />
            <FormInput
              type="number"
              step="any"
              label={t('pruning:form.gpsLngLabel')}
              placeholder={t('pruning:form.gpsPlaceholder')}
              error={errors.gpsLng?.message}
              {...register('gpsLng', { valueAsNumber: true })}
            />
          </div>
        ) : null}
      </div>

      {/* Tree Details */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg">{t('pruning:form.treeSection')}</h3>

        <FormInput
          type="number"
          label={t('pruning:form.treeCountLabel')}
          placeholder="5"
          min="1"
          error={errors.treeCount?.message}
          disabled={readOnly}
          {...register('treeCount', { valueAsNumber: true })}
        />

        <FormInput
          label={t('pruning:form.treeHeightLabel')}
          placeholder={t('pruning:form.treeHeightPlaceholder')}
          error={errors.treeHeightEstimate?.message}
          disabled={readOnly}
          {...register('treeHeightEstimate')}
        />

        <FormInput
          label={t('pruning:form.treeDiameterLabel')}
          placeholder={t('pruning:form.treeDiameterPlaceholder')}
          error={errors.treeDiameterEstimate?.message}
          disabled={readOnly}
          {...register('treeDiameterEstimate')}
        />
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg">{t('pruning:form.contactSection')}</h3>

        <div className="space-y-4">
          <h4 className="font-semibold text-sm">{t('pruning:form.requesterLabel')}</h4>

          <FormInput
            label={t('pruning:form.requesterNameLabel')}
            error={errors.requesterName?.message}
            disabled={readOnly}
            {...register('requesterName')}
          />

          <FormInput
            label={t('pruning:form.requesterPhoneLabel')}
            placeholder={t('pruning:form.requesterPhonePlaceholder')}
            error={errors.requesterPhone?.message}
            disabled={readOnly}
            {...register('requesterPhone')}
          />
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-sm">{t('pruning:form.rtLeaderLabel')}</h4>

          <FormInput
            label={t('pruning:form.rtLeaderNameLabel')}
            error={errors.rtLeaderName?.message}
            disabled={readOnly}
            {...register('rtLeaderName')}
          />

          <FormInput
            label={t('pruning:form.rtLeaderPhoneLabel')}
            placeholder={t('pruning:form.requesterPhonePlaceholder')}
            error={errors.rtLeaderPhone?.message}
            disabled={readOnly}
            {...register('rtLeaderPhone')}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg">{t('pruning:form.notesLabel')}</h3>

        <Textarea
          placeholder={t('pruning:form.notesPlaceholder')}
          error={errors.notes?.message}
          disabled={readOnly}
          {...register('notes')}
        />
      </div>
    </form>
  );
}
