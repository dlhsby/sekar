'use client';

/**
 * Rayon Form Component
 * Reusable form for creating and editing rayons
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormInput, Textarea } from '@/components/ui';
import { FormActions } from '@/components/forms/FormActions';
import type { Rayon } from '@/types/models';
import type { CreateRayonDto, UpdateRayonDto } from '@/lib/api/rayons';

// Validation schema
const rayonSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  code: z
    .string()
    .min(1, 'Kode wajib diisi')
    .regex(/^[A-Z0-9_-]+$/, 'Kode harus huruf besar dan angka'),
  color: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  center_lat: z.number().optional().nullable(),
  center_lng: z.number().optional().nullable(),
});

type RayonFormData = z.infer<typeof rayonSchema>;

export interface RayonFormProps {
  initialData?: Rayon;
  onSubmit: (data: CreateRayonDto | UpdateRayonDto) => Promise<void>;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

export function RayonForm({ initialData, onSubmit, isLoading = false, mode }: RayonFormProps) {
  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RayonFormData>({
    resolver: zodResolver(rayonSchema),
    defaultValues: {
      name: initialData?.name || '',
      code: initialData?.code || '',
      color: initialData?.color || '',
      description: initialData?.description || '',
      center_lat: initialData?.center_lat ? Number(initialData.center_lat) : undefined,
      center_lng: initialData?.center_lng ? Number(initialData.center_lng) : undefined,
    },
  });

  // Watch code field to auto-uppercase
  const codeValue = watch('code');
  useEffect(() => {
    if (codeValue) {
      setValue('code', codeValue.toUpperCase());
    }
  }, [codeValue, setValue]);

  // Handle form submission
  const onSubmitForm = async (data: RayonFormData) => {
    const submitData: CreateRayonDto | UpdateRayonDto = {
      name: data.name,
      code: data.code,
      color: data.color || null,
      description: data.description || null,
      center_lat: data.center_lat || null,
      center_lng: data.center_lng || null,
    };

    await onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg">Informasi Dasar</h3>

        <FormInput
          label="Nama Rayon"
          placeholder="Contoh: Rayon 1"
          error={errors.name?.message}
          required
          {...register('name')}
        />

        <FormInput
          label="Kode Rayon"
          placeholder="Contoh: RAY01"
          error={errors.code?.message}
          required
          helperText="Huruf besar dan angka saja"
          {...register('code')}
        />

        <FormInput
          label="Warna"
          type="text"
          placeholder="Format heksadesimal"
          error={errors.color?.message}
          helperText="Heksadesimal 6 digit (opsional)"
          {...register('color')}
        />

        <div className="space-y-1.5">
          <label className="text-sm font-bold leading-none">Deskripsi</label>
          <Textarea
            placeholder="Deskripsi rayon (opsional)"
            rows={3}
            error={errors.description?.message}
            {...register('description')}
          />
        </div>
      </div>

      {/* Coordinate Information */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg">Koordinat Pusat</h3>

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Latitude"
            type="number"
            placeholder="Contoh: -7.25"
            step="0.000001"
            error={errors.center_lat?.message}
            {...register('center_lat', {
              valueAsNumber: true,
            })}
          />

          <FormInput
            label="Longitude"
            type="number"
            placeholder="Contoh: 112.75"
            step="0.000001"
            error={errors.center_lng?.message}
            {...register('center_lng', {
              valueAsNumber: true,
            })}
          />
        </div>
      </div>

      {/* Submit Button */}
      <FormActions
        submitLabel={
          isLoading
            ? mode === 'create'
              ? 'Menyimpan...'
              : 'Memperbarui...'
            : mode === 'create'
              ? 'Simpan Rayon'
              : 'Perbarui Rayon'
        }
        loading={isLoading}
      />
    </form>
  );
}
