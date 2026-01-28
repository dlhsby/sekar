'use client';

/**
 * Area Form Component
 * Reusable form for creating and editing areas
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NBInput, NBSelect, NBTextarea, NBButton } from '@/components/nb';
import { PolygonEditor } from '@/components/maps/PolygonEditor';
import { useRayons } from '@/lib/api/rayons';
import { useAreaTypes } from '@/lib/api/area-types';
import { calculatePolygonCenter, isValidPolygon, formatCoordinates } from '@/lib/utils/geo';
import type { Area, CreateAreaDto, UpdateAreaDto } from '@/types/models';

// Validation schema
const areaSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  code: z
    .string()
    .min(2, 'Kode minimal 2 karakter')
    .regex(/^[A-Z0-9_-]+$/, 'Kode harus huruf besar dan angka'),
  rayon_id: z.string().uuid('Rayon wajib dipilih'),
  area_type_id: z.string().uuid('Tipe area wajib dipilih'),
  description: z.string().optional(),
  boundary_polygon: z.custom<GeoJSON.Polygon>(
    (val) => {
      return isValidPolygon(val as GeoJSON.Polygon);
    },
    { message: 'Batas area wajib digambar di peta' }
  ),
});

type AreaFormData = z.infer<typeof areaSchema>;

export interface AreaFormProps {
  initialData?: Area;
  onSubmit: (data: CreateAreaDto | UpdateAreaDto) => Promise<void>;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

export function AreaForm({
  initialData,
  onSubmit,
  isLoading = false,
  mode,
}: AreaFormProps) {
  const [polygon, setPolygon] = useState<GeoJSON.Polygon | null>(
    initialData?.boundary_polygon || null
  );
  const [coverageArea, setCoverageArea] = useState<number>(
    initialData?.coverage_area || 0
  );

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
      code: initialData?.code || '',
      rayon_id: initialData?.rayon_id || '',
      area_type_id: initialData?.area_type_id || '',
      description: initialData?.description || '',
      boundary_polygon: initialData?.boundary_polygon,
    },
  });

  // Watch code field to auto-uppercase
  const codeValue = watch('code');
  useEffect(() => {
    if (codeValue) {
      setValue('code', codeValue.toUpperCase());
    }
  }, [codeValue, setValue]);

  // Handle polygon change
  const handlePolygonChange = (newPolygon: GeoJSON.Polygon | null) => {
    setPolygon(newPolygon);
    if (newPolygon && isValidPolygon(newPolygon)) {
      setValue('boundary_polygon', newPolygon, { shouldValidate: true });
    } else {
      setValue('boundary_polygon', undefined as any, { shouldValidate: true });
    }
  };

  // Calculate center coordinates
  const centerCoords = polygon
    ? calculatePolygonCenter(polygon)
    : initialData
      ? [initialData.center_longitude, initialData.center_latitude]
      : null;

  // Handle form submission
  const onSubmitForm = async (data: AreaFormData) => {
    if (!data.boundary_polygon) {
      return;
    }

    const center = calculatePolygonCenter(data.boundary_polygon);

    const submitData: CreateAreaDto | UpdateAreaDto = {
      name: data.name,
      code: data.code,
      rayon_id: data.rayon_id,
      area_type_id: data.area_type_id,
      description: data.description || undefined,
      boundary_polygon: data.boundary_polygon,
      center_longitude: center[0],
      center_latitude: center[1],
    };

    await onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg">Informasi Dasar</h3>

        <NBInput
          label="Nama Area"
          placeholder="Contoh: Taman Bungkul"
          error={errors.name?.message}
          required
          {...register('name')}
        />

        <NBInput
          label="Kode Area"
          placeholder="Contoh: TMNBKL01"
          error={errors.code?.message}
          required
          helperText="Huruf besar dan angka saja"
          {...register('code')}
        />

        <NBSelect
          label="Rayon"
          options={
            loadingRayons
              ? []
              : rayonsData
                ? [
                    { value: '', label: 'Pilih Rayon', disabled: false },
                    ...rayonsData.map((rayon) => ({
                      value: rayon.id,
                      label: rayon.name,
                      disabled: false,
                    })),
                  ]
                : []
          }
          value={watch('rayon_id')}
          onChange={(value) => setValue('rayon_id', value as string, { shouldValidate: true })}
          error={errors.rayon_id?.message}
          required
          disabled={loadingRayons}
        />

        <NBSelect
          label="Tipe Area"
          options={
            loadingAreaTypes
              ? []
              : areaTypes
                ? [
                    { value: '', label: 'Pilih Tipe Area', disabled: false },
                    ...areaTypes.map((type) => ({
                      value: type.id,
                      label: `${type.name} (${type.category})`,
                      disabled: false,
                    })),
                  ]
                : []
          }
          value={watch('area_type_id')}
          onChange={(value) => setValue('area_type_id', value as string, { shouldValidate: true })}
          error={errors.area_type_id?.message}
          required
          disabled={loadingAreaTypes}
        />

        <NBTextarea
          label="Deskripsi"
          placeholder="Deskripsi area (opsional)"
          rows={3}
          error={errors.description?.message}
          {...register('description')}
        />
      </div>

      {/* Polygon Editor */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg">Batas Area</h3>

        {errors.boundary_polygon && (
          <div className="bg-red-100 border-4 border-black p-4 rounded-lg">
            <p className="text-sm font-bold text-red-800">
              {errors.boundary_polygon.message}
            </p>
          </div>
        )}

        <PolygonEditor
          initialPolygon={initialData?.boundary_polygon}
          onChange={handlePolygonChange}
          onAreaChange={setCoverageArea}
          center={
            centerCoords as [number, number] || undefined
          }
          zoom={centerCoords ? 15 : undefined}
        />

        {/* Center Coordinates Display */}
        {centerCoords && (
          <div className="bg-gray-100 border-4 border-black p-4 rounded-lg">
            <div className="font-bold mb-2">Koordinat Pusat:</div>
            <div className="font-mono text-sm">
              {formatCoordinates(centerCoords[0], centerCoords[1])}
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex gap-3 pt-4">
        <NBButton
          type="submit"
          variant="primary"
          loading={isLoading}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading
            ? mode === 'create'
              ? 'Menyimpan...'
              : 'Memperbarui...'
            : mode === 'create'
              ? '💾 Simpan Area'
              : '💾 Perbarui Area'}
        </NBButton>
      </div>
    </form>
  );
}
