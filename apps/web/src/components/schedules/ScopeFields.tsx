'use client';

import type { TFunction } from 'i18next';
import type { FieldErrors, UseFormSetValue } from 'react-hook-form';
import { FormCombobox, FormSelect } from '@/components/ui';
import type { FormValues } from '@/components/schedules/ScheduleEventModal';

/** Mirrors the modal's alias exactly (it includes '' — the un-chosen state). */
type ScopeValue = FormValues['scope'];

/**
 * The "where" half of the Buat Jadwal form: Ruang Lingkup plus the geography
 * cascade it gates (district → kawasan → lokasi).
 *
 * Split out of ScheduleEventModal, which had grown past the 800-line ceiling in
 * CLAUDE.md. Scope leads the form — it decides which of these fields exist and
 * which are required — so it is a genuinely separable concern from who/when.
 */
export interface ScopeFieldsProps {
  t: TFunction;
  errors: FieldErrors<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  scope: FormValues['scope'];
  onScopeChange: (v: ScopeValue) => void;
  scopeOptions: Array<{ value: ScopeValue; label: string }>;
  districtId: string;
  regionId: string;
  locationId: string;
  districtOptions: Array<{ value: string; label: string }>;
  regionOptions: Array<{ value: string; label: string }>;
  locationOptions: Array<{ value: string; label: string }>;
  lockScope: boolean;
  lockDistrict: boolean;
  lockRegion: boolean;
  lockLocation: boolean;
}

export function ScopeFields({
  t,
  errors,
  setValue,
  scope: formScope,
  onScopeChange: handleScopeChange,
  scopeOptions,
  districtId: formDistrict,
  regionId: formRegion,
  locationId,
  districtOptions,
  regionOptions,
  locationOptions,
  lockScope,
  lockDistrict,
  lockRegion,
  lockLocation,
}: ScopeFieldsProps) {
  return (
    <>
        {/* Ruang Lingkup comes FIRST: the form reads where → who → when.
            Scope decides which geography selects appear and which are
            required, so it's the question every other answer hangs off —
            asking "Individu or Tim?" before "where?" put the narrower
            decision ahead of the one that frames it. */}
        <FormSelect
          label={t('schedules:calendar.event.scopeLabel')}
          helperText={t('schedules:calendar.event.scopeHelp')}
          options={scopeOptions}
          value={formScope}
          placeholder={t('schedules:calendar.event.scopePlaceholder')}
          onChange={(v) => handleScopeChange(v as ScopeValue)}
          error={errors.scope?.message}
          required
          disabled={lockScope}
        />

        {/* Placement cascade, gated by scope:
            district → Rayon · region → Rayon+Kawasan · location → Rayon+Kawasan+Lokasi.
            `formScope &&` matters now that '' is the un-chosen state — without
            it the district field appears before a scope has been picked. */}
        {formScope && formScope !== 'city' && (
          <FormCombobox
            label={t('schedules:calendar.event.districtLabel')}
            options={districtOptions}
            value={formDistrict || ''}
            onChange={(v) => {
              setValue('district_id', v, { shouldValidate: true });
              setValue('region_id', '');
              setValue('location_id', '');
            }}
            placeholder={t('schedules:calendar.event.districtPlaceholder')}
            error={errors.district_id?.message}
            required
            disabled={lockDistrict}
          />
        )}

        {/* Under a Lokasi scope the kawasan is an optional NARROWING filter,
            not a step: a lokasi belongs to a district and may have no kawasan at
            all (Rayon Taman Aktif). Only the mobile (kawasan-wide) scope
            actually needs one. */}
        {(formScope === 'region' || formScope === 'location') && formDistrict && (
          <FormCombobox
            label={t('schedules:calendar.event.regionLabel')}
            options={regionOptions}
            value={formRegion || ''}
            onChange={(v) => {
              setValue('region_id', v, { shouldValidate: true });
              setValue('location_id', '');
            }}
            placeholder={
              formScope === 'location'
                ? t('schedules:calendar.event.regionFilterPlaceholder')
                : t('schedules:calendar.event.regionPlaceholder')
            }
            helperText={
              formScope === 'location'
                ? t('schedules:calendar.event.regionFilterHint')
                : t('schedules:calendar.event.regionScopeHint')
            }
            error={errors.region_id?.message}
            required={formScope === 'region'}
            disabled={lockRegion}
          />
        )}

        {formScope === 'location' && formDistrict && (
          <FormCombobox
            label={t('schedules:calendar.event.locationLabel')}
            options={locationOptions}
            value={locationId}
            onChange={(v) => setValue('location_id', v, { shouldValidate: true })}
            placeholder={t('schedules:calendar.event.locationPlaceholder')}
            helperText={t('schedules:calendar.event.locationScopeHint')}
            error={errors.location_id?.message}
            required
            disabled={lockLocation}
          />
        )}
    </>
  );
}
