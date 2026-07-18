'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { FormInput, FormCombobox, Textarea } from '@/components/ui';
import { GoogleBoundaryEditor } from '@/components/maps/GoogleBoundaryEditor';
import { ImportBoundaryButton } from '@/components/maps/ImportBoundaryButton';
import { MapStyleFields } from '@/components/forms/MapStyleFields';
import { useRayons } from '@/lib/api/rayons';
import { isBoundaryGeometry } from '@/lib/utils/geo';
import type { Region, CreateRegionDto, UpdateRegionDto, MapStyle } from '@/lib/api/regions';

const toNullableNumber = (v: unknown): number | null => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

const STYLE_KEYS: (keyof MapStyle)[] = [
  'border_color',
  'fill_color',
  'border_opacity',
  'fill_opacity',
  'marker_icon',
];

type RegionFormData = MapStyle & {
  name: string;
  rayon_id: string;
  description?: string | null;
  center_lat?: number | null;
  center_lng?: number | null;
  boundary_polygon?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
};

export interface RegionFormProps {
  formId: string;
  initialData?: Region;
  onSubmit: (data: CreateRegionDto | UpdateRegionDto) => Promise<void>;
  mode: 'create' | 'edit';
  readOnly?: boolean;
}

export function RegionForm({
  formId,
  initialData,
  onSubmit,
  mode,
  readOnly = false,
}: RegionFormProps) {
  const { t } = useTranslation();
  const { data: rayons = [] } = useRayons();

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t('validation:nameMin')),
        rayon_id: z.string().uuid(t('validation:rayonRequired')),
        description: z.string().optional().nullable(),
        center_lat: z.number().min(-90).max(90).nullable().optional(),
        center_lng: z.number().min(-180).max(180).nullable().optional(),
        boundary_polygon: z
          .custom<GeoJSON.Polygon | GeoJSON.MultiPolygon>((v) => v == null || isBoundaryGeometry(v))
          .nullable()
          .optional(),
        // Styling is validated backend-side (MapStyleDto); kept in the schema as
        // passthrough so the resolver type matches RegionFormData (no cast).
        border_color: z.string().nullable().optional(),
        fill_color: z.string().nullable().optional(),
        border_opacity: z.number().nullable().optional(),
        fill_opacity: z.number().nullable().optional(),
        marker_icon: z.string().nullable().optional(),
      }),
    [t],
  );

  const { register, handleSubmit, setValue, watch, reset, formState } = useForm<RegionFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialData?.name ?? '',
      rayon_id: initialData?.rayon_id ?? '',
      description: initialData?.description ?? '',
      center_lat: initialData?.center_lat != null ? Number(initialData.center_lat) : undefined,
      center_lng: initialData?.center_lng != null ? Number(initialData.center_lng) : undefined,
      boundary_polygon: initialData?.boundary_polygon ?? null,
      border_color: initialData?.border_color ?? undefined,
      fill_color: initialData?.fill_color ?? undefined,
      // Opacities are DB `decimal` → API returns STRINGS; coerce to Number so the
      // z.number() schema doesn't silently reject an unchanged edit.
      border_opacity: initialData?.border_opacity != null ? Number(initialData.border_opacity) : undefined,
      fill_opacity: initialData?.fill_opacity != null ? Number(initialData.fill_opacity) : undefined,
      marker_icon: initialData?.marker_icon ?? undefined,
    },
  });
  const errors = formState.errors;

  const centerLat = watch('center_lat');
  const centerLng = watch('center_lng');

  const style: MapStyle = Object.fromEntries(STYLE_KEYS.map((k) => [k, watch(k)]));

  const [seedPolygon, setSeedPolygon] = useState(initialData?.boundary_polygon);
  const [editorKey, setEditorKey] = useState(0);

  // Undo: revert every field to the loaded values + remount the map editor with
  // the original boundary. preventDefault stops native reset (which would clear
  // fields to empty instead of restoring defaults).
  const handleReset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    reset();
    setSeedPolygon(initialData?.boundary_polygon);
    setEditorKey((k) => k + 1);
  };

  const submit = async (data: RegionFormData) => {
    const payload: UpdateRegionDto = {
      name: data.name,
      rayon_id: data.rayon_id,
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
    await onSubmit(payload);
  };

  return (
    <form id={formId} onSubmit={handleSubmit(submit)} onReset={handleReset} className="space-y-6">
      <div className="space-y-4">
        <FormInput
          label={t('admin:regions.form.name')}
          placeholder={t('admin:regions.form.namePlaceholder')}
          error={errors.name?.message}
          required
          disabled={readOnly}
          {...register('name')}
        />
        <FormCombobox
          label={t('admin:regions.form.rayon')}
          options={rayons.map((r) => ({ value: r.id, label: r.name }))}
          value={watch('rayon_id') || ''}
          onChange={(v) => setValue('rayon_id', v, { shouldValidate: true })}
          placeholder={t('admin:regions.form.rayonPlaceholder')}
          error={errors.rayon_id?.message}
          required
          clearable={false}
          disabled={readOnly}
        />
        <div className="space-y-1.5">
          <label className="block text-nb-body-sm font-semibold text-nb-black">
            {t('admin:regions.form.description')}
          </label>
          <Textarea rows={2} disabled={readOnly} {...register('description')} />
        </div>
      </div>

      <MapStyleFields
        value={style}
        onChange={(patch) =>
          Object.entries(patch).forEach(([k, v]) =>
            setValue(k as keyof RegionFormData, v as never, { shouldValidate: false }),
          )
        }
        disabled={readOnly}
      />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-nb-h3">{t('admin:regions.form.boundaryTitle')}</h3>
          {!readOnly && (
            <ImportBoundaryButton
              onImport={(g) => {
                setValue('boundary_polygon', g, { shouldValidate: true });
                setSeedPolygon(g);
                setEditorKey((k) => k + 1);
              }}
            />
          )}
        </div>
        <GoogleBoundaryEditor
          key={editorKey}
          initialPolygon={seedPolygon}
          onPolygonChange={
            readOnly ? undefined : (p) => setValue('boundary_polygon', p, { shouldValidate: true })
          }
          pin={centerLat != null && centerLng != null ? { lat: centerLat, lng: centerLng } : null}
          onPinChange={
            readOnly
              ? undefined
              : ({ lat, lng }) => {
                  setValue('center_lat', Number(lat.toFixed(7)), { shouldValidate: true });
                  setValue('center_lng', Number(lng.toFixed(7)), { shouldValidate: true });
                }
          }
          readonly={readOnly}
          autoLocateOnMount={mode === 'create' && !seedPolygon && !readOnly}
          strokeColor={style.border_color}
          strokeOpacity={style.border_opacity}
          fillColor={style.fill_color}
          fillOpacity={style.fill_opacity}
          markerIcon={style.marker_icon}
          markerColor={style.border_color}
        />
        <div className="space-y-4">
          <FormInput
            label={t('admin:regions.form.latitude')}
            type="number"
            step="any"
            disabled={readOnly}
            {...register('center_lat', { setValueAs: toNullableNumber })}
          />
          <FormInput
            label={t('admin:regions.form.longitude')}
            type="number"
            step="any"
            disabled={readOnly}
            {...register('center_lng', { setValueAs: toNullableNumber })}
          />
        </div>
      </div>
    </form>
  );
}
