'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormInput, FormCombobox, FormMultiCombobox, Button } from '@/components/ui';
import { AvailabilityHint } from '@/components/forms/AvailabilityHint';
import type { UserRole, User } from '@/types/models';
import { useRayons } from '@/lib/api/rayons';
import { useAreas } from '@/lib/api/areas';
import { useShiftDefinitions } from '@/lib/api/shift-definitions';
import { useUserAreas } from '@/lib/api/user-areas';
import { checkUsername, suggestUsername, checkPhone } from '@/lib/api/users';
import { sortedRoleOptions, roleAssignmentScope } from '@/lib/constants/roles';
import { useAvailabilityCheck } from '@/lib/hooks/useAvailabilityCheck';
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
    .min(1, 'Nomor HP wajib diisi')
    .regex(INDO_MOBILE_REGEX, 'Nomor HP harus format 08xxxxxxxxxx'),
  role: z.enum(
    [
      'satgas',
      'linmas',
      'korlap',
      'admin_data',
      'kepala_rayon',
      'top_management',
      'admin_system',
      'superadmin',
      'staff_kecamatan',
    ],
    { error: () => 'Role wajib dipilih' },
  ),
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
      // Unselected by default on create; comboboxes start empty (shift is
      // defaulted to Shift 1 once the definitions load — see effect below).
      role: (initialData?.role ?? '') as UserRole,
      rayon_id: initialData?.rayon_id || '',
      shift_definition_id: initialData?.shift_definition_id || '',
    },
  });

  const selectedRole = watch('role');
  const usernameValue = watch('username');
  const fullNameValue = watch('full_name');
  const phoneValue = watch('phone_number');
  const [suggesting, setSuggesting] = useState(false);

  // Live uniqueness checks (username + phone both double as login identifiers).
  const usernameStatus = useAvailabilityCheck({
    value: usernameValue,
    check: checkUsername,
    enabled: !readOnly,
    minLength: 2,
    isValidFormat: (v) => /^[a-zA-Z0-9_-]+$/.test(v),
    isUnchanged: (v) => isEditMode && v === initialData?.username,
  });
  const phoneStatus = useAvailabilityCheck({
    value: phoneValue,
    check: (v) => checkPhone(v, isEditMode ? initialData?.id : undefined),
    enabled: !readOnly,
    normalize: normalizePhone,
    isValidFormat: (v) => INDO_MOBILE_REGEX.test(v),
    isUnchanged: (v) => isEditMode && v === initialData?.phone_number,
  });

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
    if (!submitData.rayon_id) delete submitData.rayon_id;
    if (!submitData.shift_definition_id) delete submitData.shift_definition_id;
    await onSubmit(submitData);
  };

  const roleOptions = sortedRoleOptions();
  const rayonOptions = rayons.map((r) => ({ value: r.id, label: r.name }));
  const shiftOptions = shifts.map((s) => ({
    value: s.id,
    label: `${s.name} (${s.start_time}-${s.end_time})`,
  }));

  const allAreas = useMemo(() => areasData?.data || [], [areasData]);

  // Area is cascaded from the selected rayon — only that rayon's areas are
  // offered (empty until a rayon is picked).
  const selectedRayonId = watch('rayon_id') || '';
  const areaOptions = useMemo(
    () =>
      allAreas
        .filter((a) => a.rayon_id === selectedRayonId)
        .map((a) => ({ value: a.id, label: a.name })),
    [allAreas, selectedRayonId],
  );

  // When the rayon changes, drop any selected areas that no longer belong to it.
  // Guard on `allAreas` being loaded — filtering against an empty list would
  // wipe the edit-mode prefilled areas before the area list arrives.
  useEffect(() => {
    if (!allAreas.length) return;
    setAreaIds((prev) =>
      prev.filter((id) => allAreas.find((a) => a.id === id)?.rayon_id === selectedRayonId),
    );
  }, [selectedRayonId, allAreas]);

  // Which assignment fields this role uses (rayon / area / shift).
  const scope = roleAssignmentScope(selectedRole);

  // When the role changes so a field no longer applies, clear its value so we
  // never submit a stale rayon/area/shift for e.g. a management role.
  useEffect(() => {
    if (!scope.rayon && watch('rayon_id')) setValue('rayon_id', '');
    if (!scope.shift && watch('shift_definition_id')) setValue('shift_definition_id', '');
    if (!scope.area) setAreaIds((prev) => (prev.length ? [] : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole]);

  // Create-mode only: default the shift to "Shift 1" once definitions load, but
  // only for roles that actually use a shift (satgas/linmas).
  const shiftInitRef = useRef(false);
  useEffect(() => {
    if (isEditMode || readOnly || shiftInitRef.current || !shifts.length || !scope.shift) return;
    const shift1 = shifts.find((s) => /shift\s*0*1\b/i.test(s.name)) ?? shifts[0];
    if (shift1) {
      setValue('shift_definition_id', shift1.id);
      shiftInitRef.current = true;
    }
  }, [shifts, isEditMode, readOnly, scope.shift, setValue]);

  const busy = isSubmitting || loading;
  const fieldsDisabled = busy || readOnly;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Nama Lengkap first so "Sarankan" can derive a username from it. */}
      <FormInput
        label="Nama Lengkap"
        placeholder="Masukkan nama lengkap"
        error={errors.full_name?.message}
        required
        disabled={fieldsDisabled}
        {...register('full_name')}
      />

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
        <AvailabilityHint
          status={usernameStatus}
          labels={{
            available: 'Username tersedia',
            taken: 'Username sudah dipakai',
            invalid: 'Hanya huruf, angka, garis bawah, dan tanda hubung',
          }}
        />
      </div>

      <div className="space-y-1">
        <FormInput
          label="Nomor HP (untuk login)"
          placeholder="0812xxxxxxxx"
          error={errors.phone_number?.message}
          helperText="Format 08xxxxxxxxxx — bisa dipakai untuk login selain username"
          required
          disabled={fieldsDisabled}
          {...phoneReg}
          onBlur={(e) => {
            phoneReg.onBlur(e);
            const v = e.target.value;
            if (v) setValue('phone_number', normalizePhone(v), { shouldValidate: true });
          }}
        />
        <AvailabilityHint
          status={phoneStatus}
          labels={{ available: 'Nomor HP tersedia', taken: 'Nomor HP sudah dipakai' }}
        />
      </div>

      <FormCombobox
        label="Role"
        options={roleOptions}
        value={selectedRole || ''}
        onChange={(value) => setValue('role', value as UserRole, { shouldValidate: true })}
        placeholder="Pilih role"
        error={errors.role?.message}
        required
        clearable={false}
        disabled={fieldsDisabled}
      />

      {scope.rayon && (
        <FormCombobox
          label="Rayon"
          options={rayonOptions}
          value={watch('rayon_id') || ''}
          onChange={(value) => setValue('rayon_id', value)}
          placeholder={rayonsLoading ? 'Memuat...' : 'Pilih rayon'}
          error={errors.rayon_id?.message}
          disabled={fieldsDisabled || rayonsLoading}
        />
      )}

      {/* Areas multi-select — cascaded from the selected rayon; the worker's
          permanent assigned areas that drive their roster. */}
      {scope.area && (
        <FormMultiCombobox
          label="Area Penugasan (bisa lebih dari satu)"
          options={areaOptions}
          values={areaIds}
          onChange={setAreaIds}
          placeholder={
            !selectedRayonId
              ? 'Pilih rayon terlebih dahulu'
              : areasLoading
                ? 'Memuat area...'
                : 'Pilih area penugasan'
          }
          searchPlaceholder="Cari area…"
          emptyText={
            selectedRayonId ? 'Tidak ada area di rayon ini.' : 'Pilih rayon terlebih dahulu.'
          }
          helperText="Kosongkan untuk pekerja tanpa area tetap (ad-hoc)."
          disabled={fieldsDisabled || areasLoading || !selectedRayonId}
        />
      )}

      {scope.shift && (
        <FormCombobox
          label="Shift Kerja"
          options={shiftOptions}
          value={watch('shift_definition_id') || ''}
          onChange={(value) => setValue('shift_definition_id', value)}
          placeholder="Pilih shift"
          error={errors.shift_definition_id?.message}
          helperText="Satu shift per pekerja (berlaku untuk semua areanya)"
          disabled={fieldsDisabled}
        />
      )}

      {!isEditMode && !readOnly && (
        <div className="rounded-nb-base border-2 border-nb-info bg-nb-info-light/40 p-3 text-nb-body-sm">
          Password sementara akan dibuat otomatis dan ditampilkan sekali setelah user dibuat.
          Pengguna wajib menggantinya saat login pertama.
        </div>
      )}

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
