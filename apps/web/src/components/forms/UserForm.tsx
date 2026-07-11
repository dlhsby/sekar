'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormInput, FormCombobox, Button } from '@/components/ui';
import { AvailabilityHint } from '@/components/forms/AvailabilityHint';
import type { UserRole, User } from '@/types/models';
import { useRayons } from '@/lib/api/rayons';
import { useAreas } from '@/lib/api/areas';
import { useRegions } from '@/lib/api/regions';
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
type UserFormData = z.infer<ReturnType<typeof createUserSchema>>;
type TFn = (key: string, opts?: Record<string, unknown>) => string;

function createUserSchema(t: TFn) {
  return z.object({
    username: z.string().min(2, t('validation:usernameMin', { count: 2 })),
    full_name: z.string().min(2, t('validation:nameMin', { count: 2 })),
    phone_number: z
      .string()
      .min(1, t('validation:phoneRequired'))
      .regex(INDO_MOBILE_REGEX, t('validation:invalidPhone')),
    role: z.enum(
      [
        'satgas',
        'linmas',
        'korlap',
        'admin_rayon',
        'kepala_rayon',
        'management',
        'admin_system',
        'superadmin',
        'staff_kecamatan',
      ],
      { error: () => t('validation:roleRequired') },
    ),
    rayon_id: z.string().uuid().optional().or(z.literal('')),
    region_id: z.string().uuid().optional().or(z.literal('')),
    shift_definition_id: z.string().uuid().optional().or(z.literal('')),
  });
}

/** Any UUID version — area ids are deterministic UUID v5. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface UserFormSubmit
  extends Omit<UserFormData, 'rayon_id' | 'region_id' | 'shift_definition_id'> {
  area_ids: string[];
  /** `null` = explicitly clear on the server (create treats null as unset). */
  rayon_id: string | null;
  region_id: string | null;
  /** Shift moves to schedules (Phase 4) — always cleared from the user form now. */
  shift_definition_id: string | null;
}

interface UserFormProps {
  /** Matches the `<form id>` so the modal's DialogFooter submit button (outside
   *  this form in the DOM) still submits it via the HTML `form` attribute. */
  formId: string;
  initialData?: User;
  onSubmit: (data: UserFormSubmit) => Promise<void>;
  /** Read-only "Lihat" mode — all fields disabled, no submit (just Tutup). */
  readOnly?: boolean;
}

export function UserForm({
  formId,
  initialData,
  onSubmit,
  readOnly = false,
}: UserFormProps) {
  const { t } = useTranslation();
  const isEditMode = !!initialData;

  const userSchema = useMemo(() => createUserSchema(t), [t]);

  const { data: rayons = [], isLoading: rayonsLoading } = useRayons();
  const { data: areasData, isLoading: areasLoading } = useAreas({ limit: 1000 });
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
    formState: { errors },
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
      region_id: initialData?.region_id || '',
      shift_definition_id: '',
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
    // Rayon/area/shift are optional, but only relevant to roles whose scope
    // includes them. Fields the role doesn't use — or that were left blank —
    // are sent as an explicit clear (null / empty array), not omitted, so
    // changing a role on edit actually drops the now-irrelevant assignment on
    // the server (a PATCH that omits a field would keep the old value). On
    // create the backend maps null → unset. area_ids is filtered to valid
    // UUIDs so a blank/stale entry can't trip `@IsUUID(..., {each:true})`.
    const scope = roleAssignmentScope(data.role);
    const submitData: UserFormSubmit = {
      ...data,
      rayon_id: scope.rayon ? data.rayon_id || null : null,
      region_id: scope.region ? data.region_id || null : null,
      // Shift + satgas/linmas work area come from schedules now (Phase 4) —
      // always cleared here; korlap keeps a single optional location.
      shift_definition_id: null,
      area_ids: scope.location ? areaIds.filter((id) => UUID_RE.test(id)).slice(0, 1) : [],
    };
    await onSubmit(submitData);
  };

  const roleOptions = sortedRoleOptions();
  const rayonOptions = rayons.map((r) => ({ value: r.id, label: r.name }));

  const allAreas = useMemo(() => areasData?.data || [], [areasData]);
  const selectedRayonId = watch('rayon_id') || '';
  const selectedRegionId = watch('region_id') || '';

  // Regions cascade from the selected rayon (korlap).
  const { data: regions = [] } = useRegions(selectedRayonId || undefined);
  const regionOptions = regions.map((r) => ({ value: r.id, label: r.name }));

  // The optional single location (korlap) is picked from the selected region's
  // areas (ADR-045: location is chosen based on the region).
  const areaOptions = useMemo(
    () =>
      allAreas
        .filter((a) => a.region_id === selectedRegionId)
        .map((a) => ({ value: a.id, label: a.name })),
    [allAreas, selectedRegionId],
  );

  // Which scope fields this role uses (rayon / region / location).
  const scope = roleAssignmentScope(selectedRole);

  // When the role changes so a field no longer applies, clear its value so we
  // never submit a stale rayon/region/location for e.g. a management role.
  useEffect(() => {
    if (!scope.rayon && watch('rayon_id')) setValue('rayon_id', '');
    if (!scope.region && watch('region_id')) setValue('region_id', '');
    if (!scope.location) setAreaIds((prev) => (prev.length ? [] : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole]);

  const fieldsDisabled = readOnly;

  return (
    <form id={formId} onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Nama Lengkap first so "Sarankan" can derive a username from it. */}
      <FormInput
        label={t('admin:users.form.fullName')}
        placeholder={t('admin:users.form.fullNamePlaceholder')}
        error={errors.full_name?.message}
        required
        disabled={fieldsDisabled}
        {...register('full_name')}
      />

      <div className="space-y-1">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <FormInput
              label={t('admin:users.form.username')}
              placeholder={t('admin:users.form.usernamePlaceholder')}
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
              disabled={!fullNameValue}
              className="mb-[2px] whitespace-nowrap"
            >
              {t('admin:users.form.usernameSuggestButton')}
            </Button>
          )}
        </div>
        <AvailabilityHint
          status={usernameStatus}
          labels={{
            available: t('admin:users.form.usernameAvailable'),
            taken: t('admin:users.form.usernameTaken'),
            invalid: t('admin:users.form.usernameInvalid'),
          }}
        />
      </div>

      <div className="space-y-1">
        <FormInput
          label={t('admin:users.form.phoneNumber')}
          placeholder={t('admin:users.form.phoneNumberPlaceholder')}
          error={errors.phone_number?.message}
          helperText={t('admin:users.form.phoneNumberHelper')}
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
          labels={{ available: t('admin:users.form.phoneNumberAvailable'), taken: t('admin:users.form.phoneNumberTaken') }}
        />
      </div>

      <FormCombobox
        label={t('admin:users.form.role')}
        options={roleOptions}
        value={selectedRole || ''}
        onChange={(value) => setValue('role', value as UserRole, { shouldValidate: true })}
        placeholder={t('admin:users.form.rolePlaceholder')}
        error={errors.role?.message}
        required
        clearable={false}
        disabled={fieldsDisabled}
      />

      {scope.rayon && (
        <FormCombobox
          label={t('admin:users.form.rayon')}
          options={rayonOptions}
          value={watch('rayon_id') || ''}
          onChange={(value) => {
            setValue('rayon_id', value);
            // Region + location belong to a rayon — clear them when it changes.
            setValue('region_id', '');
            setAreaIds([]);
          }}
          placeholder={rayonsLoading ? t('admin:shared.loading') : t('admin:users.form.rayonPlaceholder')}
          error={errors.rayon_id?.message}
          required
          disabled={fieldsDisabled || rayonsLoading}
        />
      )}

      {/* Region (Kawasan) — cascaded from the rayon (korlap). */}
      {scope.region && (
        <FormCombobox
          label={t('admin:users.form.region')}
          options={regionOptions}
          value={watch('region_id') || ''}
          onChange={(value) => {
            setValue('region_id', value);
            setAreaIds([]); // location belongs to a region — clear on change
          }}
          placeholder={
            !selectedRayonId
              ? t('admin:users.form.regionSelectRayon')
              : t('admin:users.form.regionPlaceholder')
          }
          error={errors.region_id?.message}
          required
          disabled={fieldsDisabled || !selectedRayonId}
        />
      )}

      {/* Optional single location (korlap) — cascaded from the region (ADR-045). */}
      {scope.location && (
        <FormCombobox
          label={t('admin:users.form.location')}
          options={areaOptions}
          value={areaIds[0] ?? ''}
          onChange={(value) => setAreaIds(value ? [value] : [])}
          placeholder={
            !selectedRegionId
              ? t('admin:users.form.locationSelectRegion')
              : areasLoading
                ? t('admin:users.form.areaLoading')
                : t('admin:users.form.locationPlaceholder')
          }
          helperText={t('admin:users.form.locationHelper')}
          disabled={fieldsDisabled || areasLoading || !selectedRegionId}
        />
      )}

      {!isEditMode && !readOnly && (
        <div className="rounded-nb-base border-2 border-nb-info bg-nb-info-light/40 p-3 text-nb-body-sm">
          {t('admin:users.form.passwordInfo')}
        </div>
      )}

      {/* Submit/Cancel live in the modal's DialogFooter (formId links them to
          this form); only the password info hint stays here. */}
    </form>
  );
}
