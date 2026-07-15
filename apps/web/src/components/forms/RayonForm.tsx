'use client';

/**
 * Rayon Form Component
 * Reusable form for creating and editing rayons
 */

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { FormInput, FormSelect, Textarea } from '@/components/ui';
import { AvailabilityHint } from '@/components/forms/AvailabilityHint';
import { GoogleBoundaryEditor } from '@/components/maps/GoogleBoundaryEditor';
import { ImportBoundaryButton } from '@/components/maps/ImportBoundaryButton';
import { MapStyleFields } from '@/components/forms/MapStyleFields';
import { entityMarkerDefault } from '@/lib/constants/markerDefaults';
import { useAvailabilityCheck } from '@/lib/hooks/useAvailabilityCheck';
import { checkRayonName } from '@/lib/api/rayons';
import { isBoundaryGeometry } from '@/lib/utils/geo';
import type { Rayon, MapStyleFieldsDto, StaffingLevel } from '@/types/models';
import type { CreateRayonDto, UpdateRayonDto } from '@/lib/api/rayons';

const STYLE_KEYS: (keyof MapStyleFieldsDto)[] = [
  'border_color',
  'fill_color',
  'border_opacity',
  'fill_opacity',
  'marker_icon',
  'marker_image_url',
];

/** Coerce a number-input value to a number, or null when empty/invalid (coords are optional). */
const toNullableNumber = (v: unknown): number | null => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

type RayonFormData = MapStyleFieldsDto & {
  name: string;
  description?: string | null;
  // '' = not-yet-chosen (no preselection on create); refined to a StaffingLevel on submit.
  staffing_level: string;
  center_lat?: number | null;
  center_lng?: number | null;
  boundary_polygon?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
};

const STAFFING_LEVELS: StaffingLevel[] = ['rayon', 'region', 'location'];

export interface RayonFormProps {
  /** Matches the `<form id>` so the modal's DialogFooter submit button (outside
   *  this form in the DOM) still submits it via the HTML `form` attribute. */
  formId: string;
  initialData?: Rayon;
  onSubmit: (data: CreateRayonDto | UpdateRayonDto) => Promise<void>;
  mode: 'create' | 'edit';
  /** Read-only "Detail" mode — fields disabled, map read-only, no submit. */
  readOnly?: boolean;
  /** Reports whether the boundary/pin geometry required to submit is present —
   *  the modal uses this to disable its (now external) submit button. */
  onValidityChange?: (valid: boolean) => void;
}

export function RayonForm({
  formId,
  initialData,
  onSubmit,
  mode,
  readOnly = false,
  onValidityChange,
}: RayonFormProps) {
  const { t } = useTranslation();

  // Localized validation schema
  const rayonSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t('validation:nameMin')),
        description: z.string().optional().nullable(),
        // Accept '' as the initial (unchosen) state but require a real choice on submit.
        staffing_level: z
          .string()
          .refine((v) => STAFFING_LEVELS.includes(v as StaffingLevel), {
            message: t('validation:required'),
          }),
        center_lat: z
          .number()
          .min(-90, t('validation:latitudeInvalid'))
          .max(90, t('validation:latitudeInvalid'))
          .nullable()
          .optional(),
        center_lng: z
          .number()
          .min(-180, t('validation:longitudeInvalid'))
          .max(180, t('validation:longitudeInvalid'))
          .nullable()
          .optional(),
        boundary_polygon: z
          .custom<GeoJSON.Polygon | GeoJSON.MultiPolygon>((v) => v == null || isBoundaryGeometry(v), {
            message: t('validation:boundaryRequired'),
          })
          .nullable()
          .optional(),
        // Map-style fields are set via MapStyleFields/setValue — they must be in
        // the schema or zodResolver strips them from the submitted data (the
        // colours would silently not save).
        border_color: z.string().nullable().optional(),
        fill_color: z.string().nullable().optional(),
        border_opacity: z.number().nullable().optional(),
        fill_opacity: z.number().nullable().optional(),
        marker_icon: z.string().nullable().optional(),
        marker_image_url: z.string().nullable().optional(),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<RayonFormData>({
    resolver: zodResolver(rayonSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      staffing_level: initialData?.staffing_level ?? '',
      center_lat: initialData?.center_lat ? Number(initialData.center_lat) : undefined,
      center_lng: initialData?.center_lng ? Number(initialData.center_lng) : undefined,
      boundary_polygon: initialData?.boundary_polygon ?? null,
      border_color: initialData?.border_color ?? undefined,
      fill_color: initialData?.fill_color ?? undefined,
      border_opacity: initialData?.border_opacity ?? undefined,
      fill_opacity: initialData?.fill_opacity ?? undefined,
      marker_icon: initialData?.marker_icon ?? undefined,
      marker_image_url: initialData?.marker_image_url ?? undefined,
    },
  });

  const style: MapStyleFieldsDto = Object.fromEntries(STYLE_KEYS.map((k) => [k, watch(k)]));

  const nameValue = watch('name');
  const nameStatus = useAvailabilityCheck({
    value: nameValue,
    check: (v) => checkRayonName(v, initialData?.id),
    minLength: 2,
    isUnchanged: (v) => mode === 'edit' && v === initialData?.name,
  });

  const centerLat = watch('center_lat');
  const centerLng = watch('center_lng');
  const boundaryValue = watch('boundary_polygon');
  // Require at least one of {boundary, location pin} to save.
  const hasGeometry = (centerLat != null && centerLng != null) || !!boundaryValue;
  useEffect(() => {
    onValidityChange?.(hasGeometry);
  }, [hasGeometry, onValidityChange]);

  const handlePinChange = ({ lat, lng }: { lat: number; lng: number }) => {
    setValue('center_lat', Number(lat.toFixed(7)), { shouldValidate: true });
    setValue('center_lng', Number(lng.toFixed(7)), { shouldValidate: true });
  };

  const handlePolygonChange = (polygon: GeoJSON.Polygon | null) => {
    setValue('boundary_polygon', polygon, { shouldValidate: true });
  };

  // Seed geometry for the map editor; bump `editorKey` to remount + re-frame it
  // after a KML import (the editor only reads `initialPolygon` on mount).
  const [seedPolygon, setSeedPolygon] = useState<
    GeoJSON.Polygon | GeoJSON.MultiPolygon | null | undefined
  >(initialData?.boundary_polygon);
  const [editorKey, setEditorKey] = useState(0);

  // Undo: revert fields to loaded values + remount the map editor with the
  // original boundary (preventDefault stops native reset from clearing fields).
  const handleReset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    reset();
    setSeedPolygon(initialData?.boundary_polygon);
    setEditorKey((k) => k + 1);
  };

  const handleImportBoundary = (geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon) => {
    setValue('boundary_polygon', geometry, { shouldValidate: true });
    setSeedPolygon(geometry);
    setEditorKey((k) => k + 1);
  };

  const onSubmitForm = async (data: RayonFormData) => {
    const submitData: UpdateRayonDto = {
      name: data.name,
      staffing_level: data.staffing_level as StaffingLevel,
      description: data.description || null,
      center_lat: data.center_lat ?? null,
      center_lng: data.center_lng ?? null,
      boundary_polygon: data.boundary_polygon ?? null,
      border_color: data.border_color || null,
      fill_color: data.fill_color || null,
      border_opacity: data.border_opacity ?? null,
      fill_opacity: data.fill_opacity ?? null,
      marker_icon: data.marker_icon || null,
      marker_image_url: data.marker_image_url || null,
    };

    await onSubmit(submitData);
  };

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmitForm)} onReset={handleReset} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg">{t('admin:rayons.form.basicInfoTitle')}</h3>

        <div className="space-y-1">
          <FormInput
            label={t('admin:rayons.form.name')}
            placeholder={t('admin:rayons.form.namePlaceholder')}
            error={errors.name?.message}
            required
            disabled={readOnly}
            {...register('name')}
          />
          <AvailabilityHint
            status={nameStatus}
            labels={{
              available: t('admin:rayons.form.nameAvailable'),
              taken: t('admin:rayons.form.nameTaken'),
            }}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold leading-none">{t('admin:rayons.form.description')}</label>
          <Textarea
            placeholder={t('admin:rayons.form.descriptionPlaceholder')}
            rows={3}
            error={errors.description?.message}
            disabled={readOnly}
            {...register('description')}
          />
        </div>

        <FormSelect
          label={t('admin:rayons.form.staffingLevel')}
          helperText={t('admin:rayons.form.staffingLevelHelp')}
          placeholder={t('admin:rayons.form.staffingLevelPlaceholder')}
          required
          value={watch('staffing_level')}
          onChange={(v) =>
            setValue('staffing_level', v as StaffingLevel, { shouldValidate: true })
          }
          disabled={readOnly}
          error={errors.staffing_level?.message}
          options={[
            { value: 'rayon', label: t('admin:rayons.form.staffingLevelRayon') },
            { value: 'region', label: t('admin:rayons.form.staffingLevelRegion') },
            { value: 'location', label: t('admin:rayons.form.staffingLevelLocation') },
          ]}
        />
      </div>

      <MapStyleFields
        value={style}
        markerDefaultUrl={entityMarkerDefault('rayon')}
        onChange={(patch) =>
          Object.entries(patch).forEach(([k, v]) =>
            setValue(k as keyof RayonFormData, v as never, { shouldValidate: false }),
          )
        }
        disabled={readOnly}
      />

      {/* Boundary + center pin on a single Google map */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-lg">{t('admin:rayons.form.boundaryTitle')}</h3>
          {!readOnly && <ImportBoundaryButton onImport={handleImportBoundary} />}
        </div>
        {!readOnly && (
          <p className="text-nb-body-sm text-nb-gray-500">
            {t('admin:rayons.form.boundaryDescription')}
          </p>
        )}

        {!readOnly && errors.boundary_polygon && (
          <p className="text-nb-body-sm font-medium text-nb-danger">
            {errors.boundary_polygon.message}
          </p>
        )}

        <GoogleBoundaryEditor
          key={editorKey}
          initialPolygon={seedPolygon}
          onPolygonChange={readOnly ? undefined : handlePolygonChange}
          pin={
            centerLat != null && centerLng != null
              ? { lat: centerLat, lng: centerLng }
              : null
          }
          onPinChange={readOnly ? undefined : handlePinChange}
          onClearPin={
            readOnly
              ? undefined
              : () => {
                  setValue('center_lat', null, { shouldValidate: true });
                  setValue('center_lng', null, { shouldValidate: true });
                }
          }
          readonly={readOnly}
          autoLocateOnMount={mode === 'create' && !seedPolygon && !readOnly}
          manualFallback={
            <div className="rounded-nb-base border-2 border-nb-black bg-nb-gray-100 p-3">
              <p className="text-nb-body-sm text-nb-gray-700">
                {t('admin:rayons.form.mapUnavailable')}
              </p>
            </div>
          }
        />

        {/* Manual entry / fine-tuning — stays in sync with the pin. Optional. */}
        <div className="space-y-4">
          <FormInput
            label={t('admin:rayons.form.latitude')}
            type="number"
            placeholder={t('admin:rayons.form.latitudePlaceholder')}
            step="any"
            error={errors.center_lat?.message}
            disabled={readOnly}
            {...register('center_lat', { setValueAs: toNullableNumber })}
          />

          <FormInput
            label={t('admin:rayons.form.longitude')}
            type="number"
            placeholder={t('admin:rayons.form.longitudePlaceholder')}
            step="any"
            error={errors.center_lng?.message}
            disabled={readOnly}
            {...register('center_lng', { setValueAs: toNullableNumber })}
          />
        </div>
      </div>

      {/* Submit/Cancel live in the modal's DialogFooter (formId links them to
          this form); only the geometry hint stays here, next to the map. */}
      {!readOnly && !hasGeometry && (
        <p className="text-nb-body-sm text-nb-danger">
          {t('admin:rayons.form.geometryRequired')}
        </p>
      )}
    </form>
  );
}
