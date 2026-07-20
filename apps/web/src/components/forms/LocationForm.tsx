'use client';

/**
 * Area Form Component
 * Reusable form for creating and editing areas
 */

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { FormInput, FormCombobox, Textarea, Card, CardContent } from '@/components/ui';
import { GoogleBoundaryEditor } from '@/components/maps/GoogleBoundaryEditor';
import { ImportBoundaryButton } from '@/components/maps/ImportBoundaryButton';
import { MapStyleFields } from '@/components/forms/MapStyleFields';
import { useDistricts } from '@/lib/api/districts';
import { useRegions } from '@/lib/api/regions';
import { useLocationTypes } from '@/lib/api/location-types';
import { calculatePolygonCenter, isValidPolygon, isBoundaryGeometry, formatCoordinates } from '@/lib/utils/geo';
import type { Location, MapStyleFieldsDto, CreateLocationDto, UpdateLocationDto } from '@/types/models';

const STYLE_KEYS: (keyof MapStyleFieldsDto)[] = [
  'border_color',
  'fill_color',
  'border_opacity',
  'fill_opacity',
  'marker_icon',
];

interface LatLng {
  lat: number;
  lng: number;
}

type BoundaryGeometry = GeoJSON.Polygon | GeoJSON.MultiPolygon;

/** Centroid of a boundary as {lat,lng}. For a MultiPolygon, use the first part. */
function boundaryCentroid(geom: BoundaryGeometry): LatLng {
  const polygon: GeoJSON.Polygon =
    geom.type === 'Polygon'
      ? geom
      : { type: 'Polygon', coordinates: geom.coordinates[0] ?? [[]] };
  const [lng, lat] = calculatePolygonCenter(polygon);
  return { lat, lng };
}

type LocationFormData = MapStyleFieldsDto & {
  name: string;
  district_id: string;
  location_type_id: string;
  region_id?: string | null;
  address?: string | null;
  boundary_polygon?: BoundaryGeometry | null;
};

/** Coerce a number-input value to a number, or null when empty/invalid. */
const toNullableNumber = (v: unknown): number | null => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

export interface LocationFormProps {
  /** Matches the `<form id>` so the modal's DialogFooter submit button (outside
   *  this form in the DOM) still submits it via the HTML `form` attribute. */
  formId: string;
  initialData?: Location;
  onSubmit: (data: CreateLocationDto | UpdateLocationDto) => Promise<void>;
  mode: 'create' | 'edit';
  /** Read-only "Detail" mode — fields disabled, map read-only, no submit. */
  readOnly?: boolean;
}

export function LocationForm({
  formId,
  initialData,
  onSubmit,
  mode,
  readOnly = false,
}: LocationFormProps) {
  const { t } = useTranslation();

  // Localized validation schema
  const areaSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t('validation:nameMin')),
        district_id: z.string().uuid(t('validation:districtRequired')),
        // Optional Kawasan (ADR-045) — set via the cascade select; must be in the
        // schema or zodResolver strips it and the assignment silently won't save.
        region_id: z.string().optional().nullable(),
        location_type_id: z.string().uuid(t('validation:locationTypeRequired')),
        address: z.string().optional().nullable(),
        boundary_polygon: z
          .custom<BoundaryGeometry>((val) => val == null || isBoundaryGeometry(val), {
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

  // The coordinate is an INDEPENDENT point from the boundary — it marks the
  // office / entrance / representative location and is what the app pans to when
  // an area is searched. It is NOT tied to the polygon centroid: the centroid is
  // only used as a convenience default when no coordinate has been set yet, and
  // editing the boundary never overwrites an existing coordinate.
  const initialCenter: LatLng | null =
    initialData?.gps_lat != null && initialData?.gps_lng != null
      ? { lat: Number(initialData.gps_lat), lng: Number(initialData.gps_lng) }
      : initialData?.boundary_polygon
        ? boundaryCentroid(initialData.boundary_polygon)
        : null;
  const [center, setCenter] = useState<LatLng | null>(initialCenter);

  // Fetch districts and area types
  const { data: districtsData, isLoading: loadingDistricts } = useDistricts();
  const { data: locationTypes, isLoading: loadingAreaTypes } = useLocationTypes();

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<LocationFormData>({
    resolver: zodResolver(areaSchema),
    defaultValues: {
      name: initialData?.name || '',
      district_id: initialData?.district_id || '',
      location_type_id: initialData?.location_type_id || '',
      region_id: initialData?.region_id || '',
      address: initialData?.address || '',
      boundary_polygon: initialData?.boundary_polygon,
      border_color: initialData?.border_color ?? undefined,
      fill_color: initialData?.fill_color ?? undefined,
      // Opacities are DB `decimal` → API returns STRINGS; coerce to Number so the
      // z.number() schema doesn't silently reject an unchanged edit.
      border_opacity: initialData?.border_opacity != null ? Number(initialData.border_opacity) : undefined,
      fill_opacity: initialData?.fill_opacity != null ? Number(initialData.fill_opacity) : undefined,
      marker_icon: initialData?.marker_icon ?? undefined,
    },
  });

  // Regions cascade from the selected district (optional; ADR-045).
  const selectedDistrict = watch('district_id');
  const { data: regions = [] } = useRegions(selectedDistrict || undefined);
  const style: MapStyleFieldsDto = Object.fromEntries(STYLE_KEYS.map((k) => [k, watch(k)]));

  // Seed geometry for the map editor. Bumping `editorKey` remounts the editor so
  // an imported boundary (which the editor only reads on mount) is shown + framed.
  const [seedPolygon, setSeedPolygon] = useState<BoundaryGeometry | null | undefined>(
    initialData?.boundary_polygon,
  );
  const [editorKey, setEditorKey] = useState(0);

  // Undo: revert fields to loaded values + remount the map editor with the
  // original boundary (preventDefault stops native reset from clearing fields).
  const handleReset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    reset();
    setSeedPolygon(initialData?.boundary_polygon);
    setEditorKey((k) => k + 1);
  };

  // Boundary and location pin are fully independent — drawing/redrawing a
  // boundary never touches the pin (the user places it explicitly).
  const handlePolygonChange = (newPolygon: GeoJSON.Polygon | null) => {
    setValue('boundary_polygon', newPolygon && isValidPolygon(newPolygon) ? newPolygon : null, {
      shouldValidate: true,
    });
  };

  // Import a boundary from KML/GeoJSON: set the form value and remount the editor
  // (via key) so it re-seeds from and frames the imported geometry.
  const handleImportBoundary = (geometry: BoundaryGeometry) => {
    setValue('boundary_polygon', geometry, { shouldValidate: true });
    setSeedPolygon(geometry);
    setEditorKey((k) => k + 1);
  };

  // The pin is set independently — dragging it, placing it, or searching.
  const handlePinChange = ({ lat, lng }: LatLng) => {
    setCenter({ lat: Number(lat.toFixed(7)), lng: Number(lng.toFixed(7)) });
  };

  // Handle form submission
  const onSubmitForm = async (data: LocationFormData) => {
    // A location REQUIRES a GPS coordinate: use the pin, else fall back to the
    // boundary centroid. Surface a visible error when neither is set (rather than
    // silently doing nothing) so the submit isn't a dead click.
    const finalCenter =
      center ?? (data.boundary_polygon ? boundaryCentroid(data.boundary_polygon) : null);
    if (!finalCenter) {
      toast.error(t('validation:locationPointRequired'));
      return;
    }

    const submitData: CreateLocationDto | UpdateLocationDto = {
      name: data.name,
      district_id: data.district_id,
      location_type_id: data.location_type_id,
      region_id: data.region_id || null,
      address: data.address || undefined,
      boundary_polygon: data.boundary_polygon ?? undefined,
      gps_lng: finalCenter.lng,
      gps_lat: finalCenter.lat,
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
        <h3 className="font-bold text-lg">{t('admin:locations.form.basicInfoTitle')}</h3>

        <FormInput
          label={t('admin:locations.form.name')}
          placeholder={t('admin:locations.form.namePlaceholder')}
          error={errors.name?.message}
          required
          disabled={readOnly}
          {...register('name')}
        />

        <FormCombobox
          label={t('admin:locations.form.district')}
          options={(districtsData ?? []).map((district) => ({ value: district.id, label: district.name }))}
          value={watch('district_id') || ''}
          onChange={(value) => {
            setValue('district_id', value, { shouldValidate: true });
            // Region belongs to a district — clear it when the district changes.
            setValue('region_id', '', { shouldValidate: false });
          }}
          placeholder={loadingDistricts ? t('admin:shared.loading') : t('admin:locations.form.districtPlaceholder')}
          searchPlaceholder={t('admin:locations.form.districtSearchPlaceholder')}
          error={errors.district_id?.message}
          required
          clearable={false}
          disabled={loadingDistricts || readOnly}
        />

        <FormCombobox
          label={t('admin:locations.form.region')}
          options={regions.map((r) => ({ value: r.id, label: r.name }))}
          value={watch('region_id') || ''}
          onChange={(value) => setValue('region_id', value, { shouldValidate: false })}
          placeholder={t('admin:locations.form.regionPlaceholder')}
          disabled={!selectedDistrict || readOnly}
        />

        <FormCombobox
          label={t('admin:locations.form.type')}
          options={(locationTypes ?? []).map((type) => ({
            value: type.id,
            label: `${type.name} (${type.category})`,
          }))}
          value={watch('location_type_id') || ''}
          onChange={(value) => setValue('location_type_id', value, { shouldValidate: true })}
          placeholder={loadingAreaTypes ? t('admin:shared.loading') : t('admin:locations.form.typePlaceholder')}
          searchPlaceholder={t('admin:locations.form.typeSearchPlaceholder')}
          error={errors.location_type_id?.message}
          required
          clearable={false}
          disabled={loadingAreaTypes || readOnly}
        />

        <div className="space-y-1.5">
          <label className="text-sm font-bold leading-none">{t('admin:locations.form.address')}</label>
          <Textarea
            placeholder={t('admin:locations.form.addressPlaceholder')}
            rows={3}
            error={errors.address?.message}
            disabled={readOnly}
            {...register('address')}
          />
        </div>

      </div>

      <MapStyleFields
        value={style}
        onChange={(patch) =>
          Object.entries(patch).forEach(([k, v]) =>
            setValue(k as keyof LocationFormData, v as never, { shouldValidate: false }),
          )
        }
        disabled={readOnly}
      />

      {/* Boundary + location pin on a single Google map (two separate settings) */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-lg">{t('admin:locations.form.boundaryTitle')}</h3>
          {!readOnly && <ImportBoundaryButton onImport={handleImportBoundary} />}
        </div>
        {!readOnly && (
          <p className="text-nb-body-sm text-nb-gray-500">
            {t('admin:locations.form.boundaryDescription')}
          </p>
        )}

        {!readOnly && errors.boundary_polygon && (
          <Card className="border-nb-danger">
            <CardContent className="p-4">
              <p className="text-sm font-bold text-nb-danger">{errors.boundary_polygon.message}</p>
            </CardContent>
          </Card>
        )}

        <GoogleBoundaryEditor
          key={editorKey}
          initialPolygon={seedPolygon}
          onPolygonChange={readOnly ? undefined : handlePolygonChange}
          pin={center}
          onPinChange={readOnly ? undefined : handlePinChange}
          readonly={readOnly}
          autoLocateOnMount={mode === 'create' && !seedPolygon && !readOnly}
          strokeColor={style.border_color}
          strokeOpacity={style.border_opacity}
          fillColor={style.fill_color}
          fillOpacity={style.fill_opacity}
          markerIcon={style.marker_icon}
          manualFallback={
            center ? (
              <div className="border-2 border-nb-black bg-nb-gray-100 p-4">
                <div className="font-bold mb-2">{t('admin:locations.form.coordinatesTitle')}</div>
                <div className="font-mono text-sm">{formatCoordinates(center.lng, center.lat)}</div>
              </div>
            ) : (
              <div className="border-2 border-nb-black bg-nb-gray-100 p-4">
                <p className="text-nb-body-sm text-nb-gray-700">
                  {t('admin:locations.form.mapUnavailable')}
                </p>
              </div>
            )
          }
        />
      </div>
    </form>
  );
}
