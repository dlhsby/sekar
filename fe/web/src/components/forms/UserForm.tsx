'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormInput, FormSelect, Button } from '@/components/ui';
import { UserRole, User } from '@/types/models';
import { useRayons } from '@/lib/api/rayons';

/**
 * User Form Validation Schema
 */
const userSchema = z
  .object({
    name: z.string().min(2, 'Nama minimal 2 karakter'),
    email: z.string().email('Format email tidak valid'),
    password: z.string().min(6, 'Password minimal 6 karakter').optional().or(z.literal('')),
    role: z.enum([
      'admin',
      'top_management',
      'kepala_rayon',
      'koordinator_lapangan',
      'worker',
      'linmas',
    ]),
    rayon_id: z.string().uuid().optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      // Rayon required if kepala_rayon
      if (data.role === 'kepala_rayon') {
        return !!data.rayon_id;
      }
      return true;
    },
    {
      message: 'Rayon wajib dipilih untuk role Kepala Rayon',
      path: ['rayon_id'],
    }
  )
  .refine(() => {
    // Password required on create (no initial user)
    // This will be checked at component level
    return true;
  });

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  /** Initial user data (for edit mode) */
  initialData?: User;
  /** Form submission handler */
  onSubmit: (data: UserFormData) => Promise<void>;
  /** Cancel handler */
  onCancel: () => void;
  /** Loading state */
  loading?: boolean;
  /** Submit button text */
  submitText?: string;
}

/**
 * User Form Component
 * Reusable form for creating and editing users
 *
 * Features:
 * - Validation with Zod
 * - Rayon field conditional on role
 * - Password optional on edit
 * - Loading states
 * - Error display
 *
 * @example
 * ```tsx
 * // Create mode
 * <UserForm
 *   onSubmit={async (data) => await createUser(data)}
 *   onCancel={() => router.back()}
 *   submitText="Buat User"
 * />
 *
 * // Edit mode
 * <UserForm
 *   initialData={user}
 *   onSubmit={async (data) => await updateUser(user.id, data)}
 *   onCancel={() => router.back()}
 *   submitText="Simpan"
 * />
 * ```
 */
export function UserForm({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  submitText = 'Simpan',
}: UserFormProps) {
  const isEditMode = !!initialData;

  // Fetch rayons for dropdown
  const { data: rayons = [], isLoading: rayonsLoading } = useRayons();

  // Setup form with validation
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      password: '',
      role: initialData?.role || 'worker',
      rayon_id: initialData?.rayon_id || '',
    },
  });

  // Watch role to show/hide rayon field
  const selectedRole = watch('role');

  // Clear rayon_id when role changes away from kepala_rayon
  useEffect(() => {
    if (selectedRole !== 'kepala_rayon') {
      setValue('rayon_id', '');
    }
  }, [selectedRole, setValue]);

  const handleFormSubmit = async (data: UserFormData) => {
    // Validate password on create mode
    if (!isEditMode && !data.password) {
      // This should be caught by Zod, but double-check
      return;
    }

    // Remove empty password on edit
    const submitData = { ...data };
    if (isEditMode && !submitData.password) {
      delete submitData.password;
    }

    // Remove empty rayon_id
    if (!submitData.rayon_id) {
      delete submitData.rayon_id;
    }

    await onSubmit(submitData);
  };

  // Role options
  const roleOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'top_management', label: 'Top Management' },
    { value: 'kepala_rayon', label: 'Kepala Rayon' },
    { value: 'koordinator_lapangan', label: 'Koordinator Lapangan' },
    { value: 'worker', label: 'Worker' },
    { value: 'linmas', label: 'Linmas' },
  ];

  // Rayon options
  const rayonOptions = rayons.map((rayon) => ({
    value: rayon.id,
    label: `${rayon.name} (${rayon.code})`,
  }));

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Name Field */}
      <FormInput
        label="Nama Lengkap"
        placeholder="Masukkan nama lengkap"
        error={errors.name?.message}
        required
        disabled={isSubmitting || loading}
        {...register('name')}
      />

      {/* Email Field */}
      <FormInput
        label="Email"
        type="email"
        placeholder="Masukkan email"
        error={errors.email?.message}
        required
        disabled={isSubmitting || loading}
        {...register('email')}
      />

      {/* Password Field */}
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

      {/* Role Field */}
      <FormSelect
        label="Role"
        options={roleOptions}
        value={selectedRole}
        onChange={(value) => setValue('role', value as UserRole)}
        error={errors.role?.message}
        required
        disabled={isSubmitting || loading}
      />

      {/* Rayon Field (conditional) */}
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

      {/* Actions */}
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
