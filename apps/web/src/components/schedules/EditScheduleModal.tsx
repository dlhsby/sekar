'use client';

import { useEffect, useMemo, useId } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  FormCombobox,
  FormSelect,
} from '@/components/ui';
import { FormActions } from '@/components/forms/FormActions';
import { ScopeFields } from '@/components/schedules/ScopeFields';
import type { FormValues } from '@/components/schedules/ScheduleEventModal';
import { getErrorMessage } from '@/lib/api/client';
import type { Schedule } from '@/lib/api/schedules';

type ScopeValue = FormValues['scope'];

interface EditScheduleModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * Fired after a SUCCESSFUL save (distinct from `onClose`, which also covers
   * cancel). The caller uses it to ask which occurrences a recurring change
   * should touch — a question that only makes sense once the change is known.
   */
  onSaved?: () => void;
  roster: Schedule | null;
  onUpdateShift: (id: string, shiftId: string | null) => Promise<void>;
  onUpdateAreas: (
    id: string,
    locationIds: string[],
    regionIds: string[],
    districtId: string | null,
  ) => Promise<void>;
  shiftLoading?: boolean;
  areasLoading?: boolean;
  shifts: Array<{ id: string; name: string; start_time: string; end_time: string }>;
  allDistricts: Array<{ id: string; name: string }>;
  allAreas: Array<{ id: string; name: string; district_id: string; region_id?: string | null }>;
  allRegions: Array<{ id: string; name: string; district_id: string }>;
  error?: string | null;
}

/**
 * Edit ONE occurrence's assignment.
 *
 * The geography half is `ScopeFields` — the very same component the create form
 * uses. It used to be a hand-rolled Rayon + Lokasi pair, which is how the two
 * flows drifted: this modal asked for a Rayon even on a city-scope assignment
 * (and never saved it), put Shift in the middle, and knew nothing about kawasan
 * — including that a kawasan is an OPTIONAL narrowing step, since Rayon Taman
 * Aktif hangs its lokasi straight off the district. Sharing the component makes
 * that class of drift impossible rather than merely fixed.
 *
 * Field order matches create: where → what → when, so Shift comes LAST. Only the
 * fields already determined by the occurrence (worker, date) are hidden.
 */
export function EditScheduleModal({
  open,
  onClose,
  onSaved,
  roster,
  onUpdateShift,
  onUpdateAreas,
  shiftLoading,
  areasLoading,
  shifts,
  allDistricts,
  allAreas,
  allRegions,
  error,
}: EditScheduleModalProps) {
  const { t } = useTranslation(['schedules', 'common']);
  const formId = useId();

  const { watch, setValue, reset, formState } = useForm<FormValues>({
    defaultValues: {
      scope: '' as ScopeValue,
      district_id: '',
      region_id: '',
      location_id: '',
      shift_definition_id: '',
    } as Partial<FormValues> as FormValues,
  });

  const scope = watch('scope');
  const districtId = watch('district_id') || '';
  const regionId = watch('region_id') || '';
  const locationId = watch('location_id') || '';
  const shiftId = watch('shift_definition_id') || '';

  // Seed from the row. Most specific wins, mirroring how the backend derives
  // display_scope, so the modal opens on the scope the assignment actually has.
  useEffect(() => {
    if (!roster || !open) return;
    const locIds = roster.location_id ? [roster.location_id] : [];
    // One kawasan per assignment (ADR-053).
    const seededRegions = roster.region_id ? [roster.region_id] : [];
    reset({
      scope: (locIds.length
        ? 'location'
        : seededRegions.length
          ? 'region'
          : roster.district_id
            ? 'district'
            : 'city') as ScopeValue,
      district_id: roster.district_id || '',
      region_id: seededRegions[0] ?? '',
      location_id: locIds[0] ?? '',
      shift_definition_id: roster.shift_definition_id ?? '',
    } as Partial<FormValues> as FormValues);
  }, [roster, open, reset]);

  const districtOptions = useMemo(
    () => allDistricts.map((r) => ({ value: r.id, label: r.name })),
    [allDistricts],
  );
  const regionOptions = useMemo(
    () =>
      allRegions
        .filter((r) => r.district_id === districtId)
        .map((r) => ({ value: r.id, label: r.name })),
    [allRegions, districtId],
  );
  // Kawasan narrows, it never gates: a district-direct lokasi (region_id NULL)
  // must stay reachable, which is exactly the Rayon Taman Aktif case.
  const locationOptions = useMemo(
    () =>
      allAreas
        .filter((l) => l.district_id === districtId)
        .filter((l) => !regionId || l.region_id === regionId)
        .map((l) => ({ value: l.id, label: l.name })),
    [allAreas, districtId, regionId],
  );

  const handleScopeChange = (v: ScopeValue) => {
    setValue('scope', v, { shouldValidate: true });
    // Clear geography deeper than the new scope so stale ids never leak on save.
    if (v === 'city') {
      setValue('district_id', '');
      setValue('region_id', '');
      setValue('location_id', '');
    } else if (v === 'district') {
      setValue('region_id', '');
      setValue('location_id', '');
    } else if (v === 'region') {
      setValue('location_id', '');
    }
  };

  const scopeOptions: Array<{ value: ScopeValue; label: string }> = [
    { value: 'city', label: t('schedules:calendar.event.scopeCity') },
    { value: 'district', label: t('schedules:calendar.event.scopeDistrict') },
    { value: 'region', label: t('schedules:calendar.event.scopeKawasan') },
    { value: 'location', label: t('schedules:calendar.event.scopeLokasi') },
  ];

  // Only what the chosen scope owns is sent; everything else is cleared.
  const payload = useMemo(() => {
    switch (scope) {
      case 'location':
        return {
          locationIds: locationId ? [locationId] : [],
          regionIds: [] as string[],
          districtId: districtId || null,
        };
      case 'region':
        return {
          locationIds: [] as string[],
          regionIds: regionId ? [regionId] : [],
          districtId: districtId || null,
        };
      case 'district':
        return {
          locationIds: [] as string[],
          regionIds: [] as string[],
          districtId: districtId || null,
        };
      default:
        return { locationIds: [] as string[], regionIds: [] as string[], districtId: null };
    }
  }, [scope, locationId, regionId, districtId]);

  const sameIds = (a: string[], b: string[]) =>
    a.length === b.length && a.every((id) => b.includes(id));
  const isScopeChanged =
    !sameIds(payload.locationIds, roster?.location_id ? [roster.location_id] : []) ||
    !sameIds(payload.regionIds, roster?.region_id ? [roster.region_id] : []) ||
    payload.districtId !== (roster?.district_id ?? null);
  const isShiftChanged = (shiftId || null) !== (roster?.shift_definition_id ?? null);

  const loading = shiftLoading || areasLoading;

  const handleSubmit = async () => {
    if (!roster) return;
    try {
      // The worker is fixed for an occurrence — replacing them is a delete +
      // create, not an edit (see the disabled Pekerja field).
      if (isShiftChanged) await onUpdateShift(roster.id, shiftId || null);
      if (isScopeChanged) {
        await onUpdateAreas(roster.id, payload.locationIds, payload.regionIds, payload.districtId);
      }
      toast.success(t('messages.editSuccess'));
      if (onSaved) onSaved();
      else onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('modals.edit.title')}</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <form
            id={formId}
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <div className="space-y-4">
              <FormCombobox
                label={t('modals.edit.workerLabel')}
                value={roster?.user_id ?? ''}
                onChange={() => {}}
                disabled
                helperText={t('modals.edit.workerLocked')}
                options={
                  roster
                    ? [
                        {
                          value: roster.user_id,
                          label: `${roster.user.full_name} (${roster.user.username})`,
                        },
                      ]
                    : []
                }
              />

              <ScopeFields
                t={t}
                errors={formState.errors}
                setValue={setValue}
                scope={scope}
                onScopeChange={handleScopeChange}
                scopeOptions={scopeOptions}
                districtId={districtId}
                regionId={regionId}
                locationId={locationId}
                districtOptions={districtOptions}
                regionOptions={regionOptions}
                locationOptions={locationOptions}
                lockScope={false}
                lockDistrict={false}
                lockRegion={false}
                lockLocation={false}
              />

              {/* Shift LAST — where → what → when, same order as Buat Jadwal. */}
              <FormSelect
                label={t('modals.edit.shiftLabel')}
                value={shiftId || 'none'}
                onChange={(value) => setValue('shift_definition_id', value === 'none' ? '' : value)}
                options={[
                  { value: 'none', label: t('modals.add.shiftOptional') },
                  ...shifts.map((shift) => ({
                    value: shift.id,
                    label: `${shift.name} (${shift.start_time}-${shift.end_time})`,
                  })),
                ]}
              />

              {error && (
                <div className="rounded-nb-base border-2 border-nb-danger bg-nb-danger-light/20 p-3 text-sm text-nb-danger">
                  {error}
                </div>
              )}
            </div>
          </form>
        </DialogBody>

        <DialogFooter>
          <FormActions
            formId={formId}
            submitLabel={t('modals.edit.submit')}
            loading={loading}
            disabled={!isShiftChanged && !isScopeChanged}
            onCancel={onClose}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
