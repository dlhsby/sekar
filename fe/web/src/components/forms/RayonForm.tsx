'use client';

/**
 * Rayon Form Component
 * Reusable form for creating and editing rayons
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormInput, Input, Textarea } from '@/components/ui';
import { FormActions } from '@/components/forms/FormActions';
import { AvailabilityHint } from '@/components/forms/AvailabilityHint';
import { GoogleMapPicker } from '@/components/maps/GoogleMapPicker';
import { useAvailabilityCheck } from '@/lib/hooks/useAvailabilityCheck';
import { checkRayonName } from '@/lib/api/rayons';
import type { Rayon } from '@/types/models';
import type { CreateRayonDto, UpdateRayonDto } from '@/lib/api/rayons';

// Default value for the native color input (a data value, not a rendered style
// token) — matches nb-primary so a new rayon starts on-brand. ADR-036 token rule
// targets styling colors; an <input type="color"> default must be a literal hex.
// eslint-disable-next-line sekar-design/no-inline-hex-colors -- color-input default value
const DEFAULT_COLOR = '#7FBC8C';
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

/** Coerce a number-input value to a number, or null when empty/invalid (coords are optional). */
const toNullableNumber = (v: unknown): number | null => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

// Validation schema — master data: only this table's own columns.
const rayonSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  color: z
    .string()
    .optional()
    .nullable()
    .refine((v) => !v || HEX_COLOR_RE.test(v), 'Format warna harus heksadesimal, mis. #RRGGBB'),
  description: z.string().optional().nullable(),
  center_lat: z
    .number()
    .min(-90, 'Latitude harus antara -90 dan 90')
    .max(90, 'Latitude harus antara -90 dan 90')
    .nullable()
    .optional(),
  center_lng: z
    .number()
    .min(-180, 'Longitude harus antara -180 dan 180')
    .max(180, 'Longitude harus antara -180 dan 180')
    .nullable()
    .optional(),
});

type RayonFormData = z.infer<typeof rayonSchema>;

export interface RayonFormProps {
  initialData?: Rayon;
  onSubmit: (data: CreateRayonDto | UpdateRayonDto) => Promise<void>;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

export function RayonForm({ initialData, onSubmit, isLoading = false, mode }: RayonFormProps) {
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
      color: initialData?.color || '',
      description: initialData?.description || '',
      center_lat: initialData?.center_lat ? Number(initialData.center_lat) : undefined,
      center_lng: initialData?.center_lng ? Number(initialData.center_lng) : undefined,
    },
  });

  const nameValue = watch('name');
  const nameStatus = useAvailabilityCheck({
    value: nameValue,
    check: (v) => checkRayonName(v, initialData?.id),
    minLength: 2,
    isUnchanged: (v) => mode === 'edit' && v === initialData?.name,
  });

  const colorValue = watch('color') || '';
  const swatchValue = HEX_COLOR_RE.test(colorValue) ? colorValue : DEFAULT_COLOR;
  const centerLat = watch('center_lat');
  const centerLng = watch('center_lng');

  const handlePinChange = ({ lat, lng }: { lat: number; lng: number }) => {
    setValue('center_lat', Number(lat.toFixed(7)), { shouldValidate: true });
    setValue('center_lng', Number(lng.toFixed(7)), { shouldValidate: true });
  };

  const onSubmitForm = async (data: RayonFormData) => {
    const submitData: CreateRayonDto | UpdateRayonDto = {
      name: data.name,
      color: data.color?.trim() || null,
      description: data.description || null,
      center_lat: data.center_lat ?? null,
      center_lng: data.center_lng ?? null,
    };

    await onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg">Informasi Dasar</h3>

        <div className="space-y-1">
          <FormInput
            label="Nama Rayon"
            placeholder="Contoh: Rayon 1"
            error={errors.name?.message}
            required
            {...register('name')}
          />
          <AvailabilityHint
            status={nameStatus}
            labels={{ available: 'Nama rayon tersedia', taken: 'Nama rayon sudah dipakai' }}
          />
        </div>

        {/* Color picker */}
        <div className="space-y-1.5">
          <label className="text-sm font-bold leading-none" htmlFor="rayon-color-hex">
            Warna
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              aria-label="Pilih warna rayon"
              value={swatchValue}
              onChange={(e) => setValue('color', e.target.value, { shouldValidate: true })}
              className="h-12 w-14 shrink-0 cursor-pointer rounded-nb-base border-2 border-nb-black bg-nb-white shadow-nb-sm"
            />
            <Input
              id="rayon-color-hex"
              type="text"
              placeholder={DEFAULT_COLOR}
              value={colorValue}
              onChange={(e) => setValue('color', e.target.value, { shouldValidate: true })}
              error={errors.color?.message}
              aria-label="Kode warna heksadesimal"
            />
          </div>
          {errors.color?.message ? (
            <p className="text-nb-body-sm text-nb-danger">{errors.color.message}</p>
          ) : (
            <p className="text-nb-body-sm text-nb-gray-500">
              Pilih dari palet atau masukkan kode heksadesimal (opsional). Dipakai untuk batas
              rayon di peta monitoring.
            </p>
          )}
        </div>

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

        <GoogleMapPicker
          lat={centerLat}
          lng={centerLng}
          onChange={handlePinChange}
          onClear={() => {
            setValue('center_lat', null, { shouldValidate: true });
            setValue('center_lng', null, { shouldValidate: true });
          }}
          manualFallback={
            <div className="rounded-nb-base border-2 border-nb-black bg-nb-gray-100 p-3">
              <p className="text-nb-body-sm text-nb-gray-700">
                Peta tidak tersedia — masukkan koordinat secara manual di bawah.
              </p>
            </div>
          }
        />

        {/* Manual entry / fine-tuning — stays in sync with the pin. Optional. */}
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Latitude"
            type="number"
            placeholder="Contoh: -7.25"
            step="any"
            error={errors.center_lat?.message}
            {...register('center_lat', { setValueAs: toNullableNumber })}
          />

          <FormInput
            label="Longitude"
            type="number"
            placeholder="Contoh: 112.75"
            step="any"
            error={errors.center_lng?.message}
            {...register('center_lng', { setValueAs: toNullableNumber })}
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
