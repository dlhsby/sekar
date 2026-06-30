'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormInput, FormSelect, Button, Input } from '@/components/ui';
import type { UserRole, User } from '@/types/models';
import { useRayons } from '@/lib/api/rayons';
import { useAreas } from '@/lib/api/areas';
import { useShiftDefinitions } from '@/lib/api/shift-definitions';
import { useUserAreas } from '@/lib/api/user-areas';
import { checkUsername, suggestUsername } from '@/lib/api/users';
import { ALL_ROLES, ROLE_LABELS } from '@/lib/constants/roles';
import { normalizePhone, INDO_MOBILE_REGEX } from '@/lib/utils/phone';

/**
 * User form (simplified assignment model): rayon (single) + areas (multi,
 * permanent) + one shift are set here and become the worker's default roster.
 * No password field — the backend generates a one-time temp password on create
 * and the user is forced to change it on first login; admins use Reset Password.
 */
const userSchema = z.object({
  username: z.string().min(2, 'Username minimal 2 karakter'),
  full_name: z.string().min(2, 'Nama minimal 2 karakter'),
  phone_number: z
    .string()
    .regex(INDO_MOBILE_REGEX, 'Nomor HP harus format 08xxxxxxxxxx')
    .optional()
    .or(z.literal('')),
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
  shift_definition_id: z.string().uuid().optional().or(z.literal('')),
});

type UserFormData = z.infer<typeof userSchema>;

export interface UserFormSubmit extends UserFormData {
  area_ids: string[];
}

interface UserFormProps {
  initialData?: User;
  onSubmit: (data: UserFormSubmit) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  submitText?: string;
  /** Read-only "Lihat" mode — all fields disabled, no submit (just Tutup). */
  readOnly?: boolean;
}

export function UserForm({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  submitText = 'Simpan',
  readOnly = false,
}: UserFormProps) {
  const isEditMode = !!initialData;

  const { data: rayons = [], isLoading: rayonsLoading } = useRayons();
  const { data: areasData, isLoading: areasLoading } = useAreas({ limit: 1000 });
  const { data: shifts = [] } = useShiftDefinitions();
  const { data: assignedAreas } = useUserAreas(isEditMode ? initialData?.id : undefined);

  const [areaIds, setAreaIds] = useState<string[]>([]);
  const [areaSearch, setAreaSearch] = useState('');

  // Prefill the selected areas from the user's current assignment (edit mode).
  useEffect(() => {
    if (assignedAreas) setAreaIds(assignedAreas.map((a) => a.id));
  }, [assignedAreas]);

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
      phone_number: initialData?.phone_number || '',
      role: initialData?.role || 'satgas',
      rayon_id: initialData?.rayon_id || '',
      shift_definition_id: initialData?.shift_definition_id || '',
    },
  });

  const selectedRole = watch('role');
  const usernameValue = watch('username');
  const fullNameValue = watch('full_name');

  // Live username availability (debounced). Skipped in edit mode while the
  // username is unchanged from the saved value.
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');
  const [suggesting, setSuggesting] = useState(false);
  // Tracks the latest username queried so a slow response for an older value
  // can't overwrite the status of the current one.
  const latestCheckRef = useRef('');

  useEffect(() => {
    if (readOnly) return; // no availability checks in view mode
    const u = (usernameValue || '').trim();
    if (isEditMode && u === initialData?.username) {
      setUsernameStatus('idle');
      return;
    }
    if (u.length < 2) {
      setUsernameStatus('idle');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(u)) {
      setUsernameStatus('invalid');
      return;
    }
    setUsernameStatus('checking');
    latestCheckRef.current = u;
    const t = setTimeout(async () => {
      try {
        const available = await checkUsername(u);
        if (latestCheckRef.current !== u) return; // a newer value is being checked
        setUsernameStatus(available ? 'available' : 'taken');
      } catch {
        if (latestCheckRef.current === u) setUsernameStatus('idle');
      }
    }, 400);
    return () => clearTimeout(t);
  }, [usernameValue, isEditMode, initialData?.username, readOnly]);

  const handleSuggestUsername = async () => {
    const name = (fullNameValue || '').trim();
    if (!name) return;
    setSuggesting(true);
    try {
      const suggestion = await suggestUsername(name);
      setValue('username', suggestion, { shouldValidate: true });
    } catch {
      // ignore — the admin can type a username manually
    } finally {
      setSuggesting(false);
    }
  };

  const phoneReg = register('phone_number');

  const handleFormSubmit = async (data: UserFormData) => {
    const submitData: UserFormSubmit = { ...data, area_ids: areaIds };
    if (!submitData.phone_number) delete submitData.phone_number;
    if (!submitData.rayon_id) delete submitData.rayon_id;
    if (!submitData.shift_definition_id) delete submitData.shift_definition_id;
    await onSubmit(submitData);
  };

  const roleOptions = ALL_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }));
  const rayonOptions = [
    { value: '', label: 'Tidak ada' },
    ...rayons.map((r) => ({ value: r.id, label: `${r.name} (${r.code})` })),
  ];
  const shiftOptions = [
    { value: '', label: 'Tidak ada' },
    ...shifts.map((s) => ({ value: s.id, label: `${s.name} (${s.start_time}-${s.end_time})` })),
  ];

  const allAreas = useMemo(() => areasData?.data || [], [areasData]);
  const filteredAreas = useMemo(() => {
    const q = areaSearch.trim().toLowerCase();
    if (!q) return allAreas;
    return allAreas.filter(
      (a) => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q),
    );
  }, [allAreas, areaSearch]);

  const toggleArea = (id: string) =>
    setAreaIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const busy = isSubmitting || loading;
  const fieldsDisabled = busy || readOnly;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <FormInput
              label="Username"
              placeholder="Masukkan username"
              error={errors.username?.message}
              required
              disabled={fieldsDisabled}
              {...register('username')}
            />
          </div>
          {!readOnly && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleSuggestUsername}
              loading={suggesting}
              disabled={busy || !fullNameValue}
              className="mb-[2px] whitespace-nowrap"
            >
              Sarankan
            </Button>
          )}
        </div>
        {usernameStatus === 'checking' && (
          <p className="text-nb-caption text-nb-gray-600">Memeriksa ketersediaan…</p>
        )}
        {usernameStatus === 'available' && (
          <p className="text-nb-caption text-nb-success-dark">✓ Username tersedia</p>
        )}
        {usernameStatus === 'taken' && (
          <p className="text-nb-caption text-nb-danger-dark">✗ Username sudah dipakai</p>
        )}
        {usernameStatus === 'invalid' && (
          <p className="text-nb-caption text-nb-danger-dark">
            Hanya huruf, angka, garis bawah, dan tanda hubung
          </p>
        )}
      </div>

      <FormInput
        label="Nama Lengkap"
        placeholder="Masukkan nama lengkap"
        error={errors.full_name?.message}
        required
        disabled={fieldsDisabled}
        {...register('full_name')}
      />

      <FormInput
        label="Nomor HP (untuk login)"
        placeholder="0812xxxxxxxx"
        error={errors.phone_number?.message}
        helperText="Format 08xxxxxxxxxx — bisa dipakai untuk login selain username"
        disabled={fieldsDisabled}
        {...phoneReg}
        onBlur={(e) => {
          phoneReg.onBlur(e);
          const v = e.target.value;
          if (v) setValue('phone_number', normalizePhone(v), { shouldValidate: true });
        }}
      />

      {!isEditMode && (
        <div className="rounded-nb-base border-2 border-nb-info bg-nb-info-light/40 p-3 text-nb-body-sm">
          Password sementara akan dibuat otomatis dan ditampilkan sekali setelah user dibuat.
          Pengguna wajib menggantinya saat login pertama.
        </div>
      )}

      <FormSelect
        label="Role"
        options={roleOptions}
        value={selectedRole}
        onChange={(value) => setValue('role', value as UserRole)}
        error={errors.role?.message}
        required
        disabled={fieldsDisabled}
      />

      <FormSelect
        label="Rayon"
        options={rayonOptions}
        value={watch('rayon_id') || ''}
        onChange={(value) => setValue('rayon_id', value as string)}
        placeholder={rayonsLoading ? 'Memuat...' : 'Pilih rayon'}
        error={errors.rayon_id?.message}
        disabled={fieldsDisabled || rayonsLoading}
      />

      <FormSelect
        label="Shift Kerja"
        options={shiftOptions}
        value={watch('shift_definition_id') || ''}
        onChange={(value) => setValue('shift_definition_id', value as string)}
        placeholder="Pilih shift"
        error={errors.shift_definition_id?.message}
        helperText="Satu shift per pekerja (berlaku untuk semua areanya)"
        disabled={fieldsDisabled}
      />

      {/* Areas multi-select */}
      <div className="space-y-2">
        <label className="block text-nb-body-sm font-bold text-nb-black">
          Area Penugasan (bisa lebih dari satu)
        </label>
        <p className="text-nb-caption text-nb-gray-600">
          Kosongkan untuk pekerja tanpa area tetap (ad-hoc) atau peran manajemen.
        </p>
        <Input
          placeholder={areasLoading ? 'Memuat area...' : 'Cari area…'}
          value={areaSearch}
          onChange={(e) => setAreaSearch(e.target.value)}
          disabled={fieldsDisabled || areasLoading}
        />
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-nb-base border-2 border-nb-black p-2">
          {filteredAreas.length === 0 ? (
            <p className="px-1 py-2 text-nb-body-sm text-nb-gray-500">Tidak ada area.</p>
          ) : (
            filteredAreas.map((area) => {
              const checked = areaIds.includes(area.id);
              return (
                <label
                  key={area.id}
                  className="flex cursor-pointer items-center gap-2 rounded-nb-sm px-2 py-1.5 hover:bg-nb-gray-100"
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-nb-primary"
                    checked={checked}
                    onChange={() => toggleArea(area.id)}
                    disabled={fieldsDisabled}
                  />
                  <span className="text-nb-body-sm">
                    {area.name}{' '}
                    <span className="font-mono text-[11px] text-nb-gray-600">({area.code})</span>
                  </span>
                </label>
              );
            })
          )}
        </div>
        {areaIds.length > 0 && (
          <p className="text-nb-caption text-nb-gray-600">{areaIds.length} area dipilih</p>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        {readOnly ? (
          <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
            Tutup
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={busy}
              className="flex-1"
            >
              Batal
            </Button>
            <Button type="submit" loading={busy} disabled={busy} className="flex-1">
              {submitText}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
