'use client';

/**
 * Area Form Component
 * Reusable form for creating and editing areas
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormInput, FormSelect, Textarea, Card, CardContent } from '@/components/ui';
import { FormActions } from '@/components/forms/FormActions';
import { PolygonEditor } from '@/components/maps/PolygonEditor';
import { useRayons } from '@/lib/api/rayons';
import { useAreaTypes } from '@/lib/api/area-types';
import { calculatePolygonCenter, isValidPolygon, formatCoordinates } from '@/lib/utils/geo';
import type { Area, CreateAreaDto, UpdateAreaDto } from '@/types/models';

// Validation schema
const areaSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  rayon_id: z.string().uuid('Rayon wajib dipilih'),
  area_type_id: z.string().uuid('Tipe area wajib dipilih'),
  address: z.string().optional().nullable(),
  boundary_polygon: z
    .custom<GeoJSON.Polygon>(
      (val) => {
        return isValidPolygon(val as GeoJSON.Polygon);
      },
      { message: 'Batas area wajib digambar di peta' }
    )
    .nullable(),
});

type AreaFormData = z.infer<typeof areaSchema>;

export interface AreaFormProps {
  initialData?: Area;
  onSubmit: (data: CreateAreaDto | UpdateAreaDto) => Promise<void>;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

export function AreaForm({ initialData, onSubmit, isLoading = false, mode }: AreaFormProps) {
  const [polygon, setPolygon] = useState<GeoJSON.Polygon | null>(
    initialData?.boundary_polygon || null
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
      rayon_id: initialData?.rayon_id || '',
      area_type_id: initialData?.area_type_id || '',
      address: initialData?.address || '',
      boundary_polygon: initialData?.boundary_polygon,
    },
  });


  // Handle polygon change
  const handlePolygonChange = (newPolygon: GeoJSON.Polygon | null) => {
    setPolygon(newPolygon);
    if (newPolygon && isValidPolygon(newPolygon)) {
      setValue('boundary_polygon', newPolygon, { shouldValidate: true });
    } else {
      setValue('boundary_polygon', null, { shouldValidate: true });
    }
  };

  // Calculate center coordinates
  const centerCoords = polygon
    ? calculatePolygonCenter(polygon)
    : initialData && initialData.gps_lng && initialData.gps_lat
      ? [Number(initialData.gps_lng), Number(initialData.gps_lat)]
      : null;

  // Handle form submission
  const onSubmitForm = async (data: AreaFormData) => {
    if (!data.boundary_polygon) {
      return;
    }

    const center = calculatePolygonCenter(data.boundary_polygon);

    const submitData: CreateAreaDto | UpdateAreaDto = {
      name: data.name,
      rayon_id: data.rayon_id,
      area_type_id: data.area_type_id,
      address: data.address || undefined,
      boundary_polygon: data.boundary_polygon,
      gps_lng: center[0],
      gps_lat: center[1],
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
          {...register('name')}
        />

        <FormSelect
          label="Rayon"
          options={
            loadingRayons
              ? []
              : rayonsData
                ? [
                    { value: 'none', label: 'Pilih Rayon' },
                    ...rayonsData.map((rayon) => ({
                      value: rayon.id,
                      label: rayon.name,
                    })),
                  ]
                : []
          }
          value={watch('rayon_id') || 'none'}
          onChange={(value) =>
            setValue('rayon_id', value === 'none' ? '' : (value as string), {
              shouldValidate: true,
            })
          }
          error={errors.rayon_id?.message}
          required
          disabled={loadingRayons}
        />

        <FormSelect
          label="Tipe Area"
          options={
            loadingAreaTypes
              ? []
              : areaTypes
                ? [
                    { value: 'none', label: 'Pilih Tipe Area' },
                    ...areaTypes.map((type) => ({
                      value: type.id,
                      label: `${type.name} (${type.category})`,
                    })),
                  ]
                : []
          }
          value={watch('area_type_id') || 'none'}
          onChange={(value) =>
            setValue('area_type_id', value === 'none' ? '' : (value as string), {
              shouldValidate: true,
            })
          }
          error={errors.area_type_id?.message}
          required
          disabled={loadingAreaTypes}
        />

        <div className="space-y-1.5">
          <label className="text-sm font-bold leading-none">Alamat</label>
          <Textarea
            placeholder="Alamat area (opsional)"
            rows={3}
            error={errors.address?.message}
            {...register('address')}
          />
        </div>
      </div>

      {/* Polygon Editor */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg">Batas Area</h3>

        {errors.boundary_polygon && (
          <Card className="border-nb-danger">
            <CardContent className="p-4">
              <p className="text-sm font-bold text-nb-danger">{errors.boundary_polygon.message}</p>
            </CardContent>
          </Card>
        )}

        <PolygonEditor
          initialPolygon={initialData?.boundary_polygon}
          onChange={handlePolygonChange}
          center={(centerCoords as [number, number]) || undefined}
          zoom={centerCoords ? 15 : undefined}
        />

        {/* Center Coordinates Display */}
        {centerCoords && (
          <div className="bg-nb-gray-100 border-2 border-nb-black p-4">
            <div className="font-bold mb-2">Koordinat Pusat:</div>
            <div className="font-mono text-sm">
              {formatCoordinates(centerCoords[0], centerCoords[1])}
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
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
      />
    </form>
  );
}
