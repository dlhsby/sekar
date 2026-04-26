'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormInput, FormSelect, Button } from '@/components/ui';
import type { UserRole, User } from '@/types/models';
import { useRayons } from '@/lib/api/rayons';
import { useAreas } from '@/lib/api/areas';
import { ALL_ROLES, ROLE_LABELS } from '@/lib/constants/roles';

/**
 * User Form Validation Schema (Phase 2C - 8 roles)
 */
const userSchema = z
  .object({
    username: z.string().min(2, 'Username minimal 2 karakter'),
    full_name: z.string().min(2, 'Nama minimal 2 karakter'),
    password: z.string().min(6, 'Password minimal 6 karakter').optional().or(z.literal('')),
    role: z.enum([
      'satgas',
      'linmas',
      'korlap',
      'admin_data',
      'kepala_rayon',
      'top_management',
      'admin_system',
      'superadmin',
      'staff_kecamatan',
    ]),
    rayon_id: z.string().uuid().optional().or(z.literal('')),
    area_id: z.string().uuid().optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      if (data.role === 'kepala_rayon') return !!data.rayon_id;
      return true;
    },
    {
      message: 'Rayon wajib dipilih untuk role Kepala Rayon',
      path: ['rayon_id'],
    }
  )
  .refine(
    (data) => {
      if (data.role === 'korlap') return !!data.area_id;
      return true;
    },
    {
      message: 'Area wajib dipilih untuk role Korlap',
      path: ['area_id'],
    }
  );

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  initialData?: User;
  onSubmit: (data: UserFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  submitText?: string;
}

/**
 * User Form Component (Phase 2C - 8 roles, area_id for korlap)
 */
export function UserForm({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  submitText = 'Simpan',
}: UserFormProps) {
  const isEditMode = !!initialData;

  const { data: rayons = [], isLoading: rayonsLoading } = useRayons();
  const { data: areasData, isLoading: areasLoading } = useAreas({ limit: 1000 });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: initialData?.username || '',
      full_name: initialData?.full_name || '',
      password: '',
      role: initialData?.role || 'satgas',
      rayon_id: initialData?.rayon_id || '',
      area_id: initialData?.area_id || '',
    },
  });

  const selectedRole = watch('role');

  useEffect(() => {
    if (selectedRole !== 'kepala_rayon') setValue('rayon_id', '');
    if (selectedRole !== 'korlap') setValue('area_id', '');
  }, [selectedRole, setValue]);

  const handleFormSubmit = async (data: UserFormData) => {
    if (!isEditMode && !data.password) return;

    const submitData = { ...data };
    if (isEditMode && !submitData.password) delete submitData.password;
    if (!submitData.rayon_id) delete submitData.rayon_id;
    if (!submitData.area_id) delete submitData.area_id;

    await onSubmit(submitData);
  };

  const roleOptions = ALL_ROLES.map((role) => ({
    value: role,
    label: ROLE_LABELS[role],
  }));

  const rayonOptions = rayons.map((rayon) => ({
    value: rayon.id,
    label: `${rayon.name} (${rayon.code})`,
  }));

  const areaOptions = (areasData?.data || []).map((area) => ({
    value: area.id,
    label: `${area.name} (${area.code})`,
  }));

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <FormInput
        label="Username"
        placeholder="Masukkan username"
        error={errors.username?.message}
        required
        disabled={isSubmitting || loading}
        {...register('username')}
      />

      <FormInput
        label="Nama Lengkap"
        placeholder="Masukkan nama lengkap"
        error={errors.full_name?.message}
        required
        disabled={isSubmitting || loading}
        {...register('full_name')}
      />

      <FormInput
        label="Password"
        type="password"
        placeholder={isEditMode ? 'Kosongkan jika tidak ingin mengubah' : 'Masukkan password'}
        error={errors.password?.message}
        required={!isEditMode}
        helperText={isEditMode ? 'Kosongkan jika tidak ingin mengubah password' : undefined}
        disabled={isSubmitting || loading}
        {...register('password')}
      />

      <FormSelect
        label="Role"
        options={roleOptions}
        value={selectedRole}
        onChange={(value) => setValue('role', value as UserRole)}
        error={errors.role?.message}
        required
        disabled={isSubmitting || loading}
      />

      {selectedRole === 'kepala_rayon' && (
        <FormSelect
          label="Rayon"
          options={rayonOptions}
          value={watch('rayon_id') || ''}
          onChange={(value) => setValue('rayon_id', value as string)}
          placeholder={rayonsLoading ? 'Memuat...' : 'Pilih rayon'}
          error={errors.rayon_id?.message}
          required
          disabled={isSubmitting || loading || rayonsLoading}
        />
      )}

      {selectedRole === 'korlap' && (
        <FormSelect
          label="Area"
          options={areaOptions}
          value={watch('area_id') || ''}
          onChange={(value) => setValue('area_id', value as string)}
          placeholder={areasLoading ? 'Memuat...' : 'Pilih area'}
          error={errors.area_id?.message}
          required
          disabled={isSubmitting || loading || areasLoading}
        />
      )}

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting || loading}
          className="flex-1"
        >
          Batal
        </Button>
        <Button
          type="submit"
          loading={isSubmitting || loading}
          disabled={isSubmitting || loading}
          className="flex-1"
        >
          {submitText}
        </Button>
      </div>
    </form>
  );
}
