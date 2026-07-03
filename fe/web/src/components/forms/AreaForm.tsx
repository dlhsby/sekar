'use client';

/**
 * Area Form Component
 * Reusable form for creating and editing areas
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormInput, FormCombobox, Textarea, Card, CardContent, Button } from '@/components/ui';
import { FormActions } from '@/components/forms/FormActions';
import { GoogleBoundaryEditor } from '@/components/maps/GoogleBoundaryEditor';
import { ImportBoundaryButton } from '@/components/maps/ImportBoundaryButton';
import { useRayons } from '@/lib/api/rayons';
import { useAreaTypes } from '@/lib/api/area-types';
import { calculatePolygonCenter, isValidPolygon, isBoundaryGeometry, formatCoordinates } from '@/lib/utils/geo';
import type { Area, CreateAreaDto, UpdateAreaDto } from '@/types/models';

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

// Validation schema
const areaSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  rayon_id: z.string().uuid('Rayon wajib dipilih'),
  area_type_id: z.string().uuid('Tipe area wajib dipilih'),
  address: z.string().optional().nullable(),
  boundary_polygon: z
    .custom<BoundaryGeometry>((val) => val == null || isBoundaryGeometry(val), {
      message: 'Batas area tidak valid',
    })
    .nullable()
    .optional(),
});

type AreaFormData = z.infer<typeof areaSchema>;

export interface AreaFormProps {
  initialData?: Area;
  onSubmit: (data: CreateAreaDto | UpdateAreaDto) => Promise<void>;
  isLoading?: boolean;
  mode: 'create' | 'edit';
  /** Read-only "Detail" mode — fields disabled, map read-only, no submit. */
  readOnly?: boolean;
  /** Close handler for the "Tutup" button in read-only mode. */
  onCancel?: () => void;
}

export function AreaForm({
  initialData,
  onSubmit,
  isLoading = false,
  mode,
  readOnly = false,
  onCancel,
}: AreaFormProps) {
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

  // Fetch rayons and area types
  const { data: rayonsData, isLoading: loadingRayons } = useRayons();
  const { data: areaTypes, isLoading: loadingAreaTypes } = useAreaTypes();

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AreaFormData>({
    resolver: zodResolver(areaSchema),
    defaultValues: {
      name: initialData?.name || '',
      rayon_id: initialData?.rayon_id || '',
      area_type_id: initialData?.area_type_id || '',
      address: initialData?.address || '',
      boundary_polygon: initialData?.boundary_polygon,
    },
  });

  // Seed geometry for the map editor. Bumping `editorKey` remounts the editor so
  // an imported boundary (which the editor only reads on mount) is shown + framed.
  const [seedPolygon, setSeedPolygon] = useState<BoundaryGeometry | null | undefined>(
    initialData?.boundary_polygon,
  );
  const [editorKey, setEditorKey] = useState(0);

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

  // At least one of {boundary, location pin} must be set to save.
  const boundaryValue = watch('boundary_polygon');
  const hasGeometry = !!center || !!boundaryValue;

  // Handle form submission
  const onSubmitForm = async (data: AreaFormData) => {
    // Areas require a GPS coordinate: use the pin, else fall back to the boundary
    // centroid. Block when neither is set.
    const finalCenter =
      center ?? (data.boundary_polygon ? boundaryCentroid(data.boundary_polygon) : null);
    if (!finalCenter) return;

    const submitData: CreateAreaDto | UpdateAreaDto = {
      name: data.name,
      rayon_id: data.rayon_id,
      area_type_id: data.area_type_id,
      address: data.address || undefined,
      boundary_polygon: data.boundary_polygon ?? undefined,
      gps_lng: finalCenter.lng,
      gps_lat: finalCenter.lat,
    };

    await onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg">Informasi Dasar</h3>

        <FormInput
          label="Nama Area"
          placeholder="Contoh: Taman Bungkul"
          error={errors.name?.message}
          required
          disabled={readOnly}
          {...register('name')}
        />

        <FormCombobox
          label="Rayon"
          options={(rayonsData ?? []).map((rayon) => ({ value: rayon.id, label: rayon.name }))}
          value={watch('rayon_id') || ''}
          onChange={(value) => setValue('rayon_id', value, { shouldValidate: true })}
          placeholder={loadingRayons ? 'Memuat...' : 'Pilih rayon'}
          searchPlaceholder="Cari rayon…"
          error={errors.rayon_id?.message}
          required
          clearable={false}
          disabled={loadingRayons || readOnly}
        />

        <FormCombobox
          label="Tipe Area"
          options={(areaTypes ?? []).map((type) => ({
            value: type.id,
            label: `${type.name} (${type.category})`,
          }))}
          value={watch('area_type_id') || ''}
          onChange={(value) => setValue('area_type_id', value, { shouldValidate: true })}
          placeholder={loadingAreaTypes ? 'Memuat...' : 'Pilih tipe area'}
          searchPlaceholder="Cari tipe area…"
          error={errors.area_type_id?.message}
          required
          clearable={false}
          disabled={loadingAreaTypes || readOnly}
        />

        <div className="space-y-1.5">
          <label className="text-sm font-bold leading-none">Alamat</label>
          <Textarea
            placeholder="Alamat area (opsional)"
            rows={3}
            error={errors.address?.message}
            disabled={readOnly}
            {...register('address')}
          />
        </div>
      </div>

      {/* Boundary + location pin on a single Google map (two separate settings) */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-lg">Batas & Titik Lokasi</h3>
          {!readOnly && <ImportBoundaryButton onImport={handleImportBoundary} />}
        </div>
        {!readOnly && (
          <p className="text-nb-body-sm text-nb-gray-500">
            Dua pengaturan terpisah: <b>gambar batas</b> area, lalu <b>tentukan titik lokasi</b> —
            mis. lokasi kantor, pintu masuk, atau titik hasil pencarian yang dipakai untuk menggeser
            peta. Titik lokasi terisi otomatis dari pusat batas hanya jika belum diatur; menggambar
            ulang batas tidak mengubah titik yang sudah ada. Seret pin, cari alamat, atau tekan tombol
            lokasi untuk menyesuaikan. (Klik peta hanya menambah titik saat menggambar batas.)
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
          manualFallback={
            center ? (
              <div className="border-2 border-nb-black bg-nb-gray-100 p-4">
                <div className="font-bold mb-2">Koordinat Pusat:</div>
                <div className="font-mono text-sm">{formatCoordinates(center.lng, center.lat)}</div>
              </div>
            ) : (
              <div className="border-2 border-nb-black bg-nb-gray-100 p-4">
                <p className="text-nb-body-sm text-nb-gray-700">
                  Peta tidak tersedia — batas area tidak dapat digambar tanpa Google Maps.
                </p>
              </div>
            )
          }
        />
      </div>

      {/* Footer */}
      {readOnly ? (
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onCancel} className="w-full">
            Tutup
          </Button>
        </div>
      ) : (
        <>
          <FormActions
            submitLabel={
              isLoading
                ? mode === 'create'
                  ? 'Menyimpan...'
                  : 'Memperbarui...'
                : mode === 'create'
                  ? 'Simpan Area'
                  : 'Perbarui Area'
            }
            loading={isLoading}
            disabled={!hasGeometry}
          />
          {!hasGeometry && (
            <p className="text-nb-body-sm text-nb-danger">
              Tentukan minimal salah satu: gambar batas area atau tempatkan titik lokasi.
            </p>
          )}
        </>
      )}
    </form>
  );
}
