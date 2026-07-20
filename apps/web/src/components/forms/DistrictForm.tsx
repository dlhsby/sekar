'use client';

/**
 * Rayon Form Component
 * Reusable form for creating and editing districts
 */

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { FormInput, FormSelect, Textarea } from '@/components/ui';
import { AvailabilityHint } from '@/components/forms/AvailabilityHint';
import { GoogleBoundaryEditor } from '@/components/maps/GoogleBoundaryEditor';
import { ImportBoundaryButton } from '@/components/maps/ImportBoundaryButton';
import { MapStyleFields } from '@/components/forms/MapStyleFields';
import { useAvailabilityCheck } from '@/lib/hooks/useAvailabilityCheck';
import { checkDistrictName } from '@/lib/api/districts';
import { isBoundaryGeometry } from '@/lib/utils/geo';
import type { District, MapStyleFieldsDto, StaffingLevel } from '@/types/models';
import type { CreateDistrictDto, UpdateDistrictDto } from '@/lib/api/districts';

const STYLE_KEYS: (keyof MapStyleFieldsDto)[] = [
  'border_color',
  'fill_color',
  'border_opacity',
  'fill_opacity',
  'marker_icon',
];

/** Coerce a number-input value to a number, or null when empty/invalid (coords are optional). */
const toNullableNumber = (v: unknown): number | null => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

type DistrictFormData = MapStyleFieldsDto & {
  name: string;
  description?: string | null;
  // '' = not-yet-chosen (no preselection on create); refined to a StaffingLevel on submit.
  staffing_level: string;
  center_lat?: number | null;
  center_lng?: number | null;
  boundary_polygon?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
};

const STAFFING_LEVELS: StaffingLevel[] = ['district', 'region', 'location'];

export interface DistrictFormProps {
  /** Matches the `<form id>` so the modal's DialogFooter submit button (outside
   *  this form in the DOM) still submits it via the HTML `form` attribute. */
  formId: string;
  initialData?: District;
  onSubmit: (data: CreateDistrictDto | UpdateDistrictDto) => Promise<void>;
  mode: 'create' | 'edit';
  /** Read-only "Detail" mode — fields disabled, map read-only, no submit. */
  readOnly?: boolean;
}

export function DistrictForm({
  formId,
  initialData,
  onSubmit,
  mode,
  readOnly = false,
}: DistrictFormProps) {
  const { t } = useTranslation();

  // Localized validation schema
  const districtSchema = useMemo(
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
  } = useForm<DistrictFormData>({
    resolver: zodResolver(districtSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      staffing_level: initialData?.staffing_level ?? '',
      center_lat: initialData?.center_lat ? Number(initialData.center_lat) : undefined,
      center_lng: initialData?.center_lng ? Number(initialData.center_lng) : undefined,
      boundary_polygon: initialData?.boundary_polygon ?? null,
      border_color: initialData?.border_color ?? undefined,
      fill_color: initialData?.fill_color ?? undefined,
      // Opacities are DB `decimal` columns → the API returns them as STRINGS;
      // coerce to Number so the `z.number()` schema doesn't silently reject an
      // unchanged edit (mirrors center_lat/lng above).
      border_opacity: initialData?.border_opacity != null ? Number(initialData.border_opacity) : undefined,
      fill_opacity: initialData?.fill_opacity != null ? Number(initialData.fill_opacity) : undefined,
      marker_icon: initialData?.marker_icon ?? undefined,
    },
  });

  const style: MapStyleFieldsDto = Object.fromEntries(STYLE_KEYS.map((k) => [k, watch(k)]));

  const nameValue = watch('name');
  const nameStatus = useAvailabilityCheck({
    value: nameValue,
    check: (v) => checkDistrictName(v, initialData?.id),
    minLength: 2,
    isUnchanged: (v) => mode === 'edit' && v === initialData?.name,
  });

  const centerLat = watch('center_lat');
  const centerLng = watch('center_lng');

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

  const onSubmitForm = async (data: DistrictFormData) => {
    const submitData: UpdateDistrictDto = {
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
    };

    await onSubmit(submitData);
  };

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmitForm)} onReset={handleReset} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg">{t('admin:districts.form.basicInfoTitle')}</h3>

        <div className="space-y-1">
          <FormInput
            label={t('admin:districts.form.name')}
            placeholder={t('admin:districts.form.namePlaceholder')}
            error={errors.name?.message}
            required
            disabled={readOnly}
            {...register('name')}
          />
          <AvailabilityHint
            status={nameStatus}
            labels={{
              available: t('admin:districts.form.nameAvailable'),
              taken: t('admin:districts.form.nameTaken'),
            }}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold leading-none">{t('admin:districts.form.description')}</label>
          <Textarea
            placeholder={t('admin:districts.form.descriptionPlaceholder')}
            rows={3}
            error={errors.description?.message}
            disabled={readOnly}
            {...register('description')}
          />
        </div>

        <FormSelect
          label={t('admin:districts.form.staffingLevel')}
          helperText={t('admin:districts.form.staffingLevelHelp')}
          placeholder={t('admin:districts.form.staffingLevelPlaceholder')}
          required
          value={watch('staffing_level')}
          onChange={(v) =>
            setValue('staffing_level', v as StaffingLevel, { shouldValidate: true })
          }
          disabled={readOnly}
          error={errors.staffing_level?.message}
          options={[
            { value: 'district', label: t('admin:districts.form.staffingLevelDistrict') },
            { value: 'region', label: t('admin:districts.form.staffingLevelRegion') },
            { value: 'location', label: t('admin:districts.form.staffingLevelLocation') },
          ]}
        />
      </div>

      <MapStyleFields
        value={style}
        onChange={(patch) =>
          Object.entries(patch).forEach(([k, v]) =>
            setValue(k as keyof DistrictFormData, v as never, { shouldValidate: false }),
          )
        }
        disabled={readOnly}
      />

      {/* Boundary + center pin on a single Google map */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-lg">{t('admin:districts.form.boundaryTitle')}</h3>
          {!readOnly && <ImportBoundaryButton onImport={handleImportBoundary} />}
        </div>
        {!readOnly && (
          <p className="text-nb-body-sm text-nb-gray-500">
            {t('admin:districts.form.boundaryDescription')}
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
          strokeColor={style.border_color}
          strokeOpacity={style.border_opacity}
          fillColor={style.fill_color}
          fillOpacity={style.fill_opacity}
          markerIcon={style.marker_icon}
          manualFallback={
            <div className="rounded-nb-base border-2 border-nb-black bg-nb-gray-100 p-3">
              <p className="text-nb-body-sm text-nb-gray-700">
                {t('admin:districts.form.mapUnavailable')}
              </p>
            </div>
          }
        />

        {/* Manual entry / fine-tuning — stays in sync with the pin. Optional. */}
        <div className="space-y-4">
          <FormInput
            label={t('admin:districts.form.latitude')}
            type="number"
            placeholder={t('admin:districts.form.latitudePlaceholder')}
            step="any"
            error={errors.center_lat?.message}
            disabled={readOnly}
            {...register('center_lat', { setValueAs: toNullableNumber })}
          />

          <FormInput
            label={t('admin:districts.form.longitude')}
            type="number"
            placeholder={t('admin:districts.form.longitudePlaceholder')}
            step="any"
            error={errors.center_lng?.message}
            disabled={readOnly}
            {...register('center_lng', { setValueAs: toNullableNumber })}
          />
        </div>
      </div>

    </form>
  );
}
