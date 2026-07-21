/**
 * MonitoringFilterModal Component
 * Phase 2D: Full-screen filter modal for map monitoring.
 * Role-gated district/area pickers, status chips, role chips, user search, staffing summary.
 */

import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBModal } from '../nb';
import { NBButton } from '../nb';
import { NBText } from '../nb/NBText';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
} from '../../constants/nbTokens';
import { locationLabel } from '../../utils/statusHelpers';
import { NBSelect } from '../nb';
import type { LiveUser } from '../../types/models.types';
import { getAreas, getAreasByDistrictId, getDistricts } from '../../services/api';
import { getStaffingSummary } from '../../services/api/monitoringApi';
import { StaffingSummarySection } from '../monitoring/StaffingSummarySection';
import type { MonitoringFilters } from '../../types/api.types';
import type { PresenceLocation, StaffingSummaryItem, User } from '../../types/models.types';
import type { Area, District } from '../../types/models.types';
import {
  ROLE_LABELS,
  ROLES_WITH_DISTRICT,
  ROLES_WITH_FIXED_DISTRICT,
  ROLES_WITHOUT_DISTRICT,
  FILTER_SUBORDINATE_ROLES,
} from '../../constants/roles';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonitoringFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: MonitoringFilters) => void;
  currentFilters: MonitoringFilters;
  currentUser: User;
  /** Live users that back the searchable "Cari Pengguna" select. */
  users?: LiveUser[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

// CP6: the wrench filters by LOCATION (dalam/luar); activity lives on the peek chips.
const LOCATION_OPTIONS: PresenceLocation[] = ['dalam_area', 'luar_area'];

// ─── Component ────────────────────────────────────────────────────────────────

export function MonitoringFilterModal({
  visible,
  onClose,
  onApply,
  currentFilters,
  currentUser,
  users = [],
}: MonitoringFilterModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const [selectedLocations, setSelectedLocations] = useState<PresenceLocation[]>(
    currentFilters.location ?? [],
  );
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | undefined>(
    currentFilters.district_id,
  );
  const [selectedAreaId, setSelectedAreaId] = useState<string | undefined>(
    currentFilters.location_id,
  );
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    currentFilters.role ? [currentFilters.role] : [],
  );
  const [searchText, setSearchText] = useState<string>(
    currentFilters.search ?? '',
  );

  const [districts, setDistricts] = useState<District[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [staffing, setStaffing] = useState<StaffingSummaryItem[]>([]);
  const [isLoadingStaffing, setIsLoadingStaffing] = useState(false);
  const [currentDayTypeLabel, setCurrentDayTypeLabel] = useState<string | null>(null);

  const userRole = currentUser.role;

  const canSelectDistrict = ROLES_WITH_DISTRICT.includes(userRole);
  const hasFixedDistrict = ROLES_WITH_FIXED_DISTRICT.includes(userRole);
  const hideDistrict = ROLES_WITHOUT_DISTRICT.includes(userRole);

  // Load districts for roles that can select
  useEffect(() => {
    if (!visible || hideDistrict) { return; }
    if (canSelectDistrict) {
      getDistricts()
        .then(res => { if (res.data) { setDistricts(res.data); } })
        .catch(() => {});
    }
  }, [visible, canSelectDistrict, hideDistrict]);

  // Load areas cascading from district
  useEffect(() => {
    if (!visible) { return; }
    const districtId = hasFixedDistrict ? currentUser.district_id : selectedDistrictId;
    if (districtId) {
      getAreasByDistrictId(districtId)
        .then(res => { if (res.data) { setAreas(res.data); } })
        .catch(() => {});
    } else if (!hasFixedDistrict) {
      getAreas()
        .then(res => { if (res.data) { setAreas(Array.isArray(res.data) ? res.data : []); } })
        .catch(() => {});
    }
  }, [visible, selectedDistrictId, hasFixedDistrict, currentUser.district_id]);

  // Load staffing summary always on modal open (filters by district/area)
  useEffect(() => {
    if (!visible) {
      setStaffing([]);
      return;
    }
    setIsLoadingStaffing(true);
    const districtId = hasFixedDistrict ? currentUser.district_id : selectedDistrictId;
    const filters: { district_id?: string; location_id?: string } = {};
    if (districtId) filters.district_id = districtId;
    if (selectedAreaId) filters.location_id = selectedAreaId;
    getStaffingSummary(filters)
      .then(res => {
        if (res.data?.items) { setStaffing(res.data.items); }
        if ((res.data as any)?.current_day_type_label) {
          setCurrentDayTypeLabel((res.data as any).current_day_type_label);
        }
      })
      .catch(() => {})
      .finally(() => { setIsLoadingStaffing(false); });
  }, [visible, selectedDistrictId, selectedAreaId, hasFixedDistrict, currentUser.district_id]);

  // Sync with current filters when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedLocations(currentFilters.location ?? []);
      setSelectedDistrictId(currentFilters.district_id);
      setSelectedAreaId(currentFilters.location_id);
      setSelectedRoles(currentFilters.role ? [currentFilters.role] : []);
      setSearchText(currentFilters.search ?? '');
    }
  }, [visible, currentFilters]);

  const handleRoleToggle = useCallback((roles: string[]) => {
    setSelectedRoles(roles);
  }, []);

  const handleReset = useCallback(() => {
    setSelectedLocations([]);
    setSelectedDistrictId(undefined);
    setSelectedAreaId(undefined);
    setSelectedRoles([]);
    setSearchText('');
  }, []);

  const handleApply = useCallback(() => {
    const filters: MonitoringFilters = {};
    if (selectedLocations.length > 0) { filters.location = selectedLocations; }
    if (selectedDistrictId) { filters.district_id = selectedDistrictId; }
    if (selectedAreaId) { filters.location_id = selectedAreaId; }
    if (selectedRoles.length === 1) { filters.role = selectedRoles[0]; }
    if (selectedRoles.length > 1) { (filters as any).roles = selectedRoles; }
    if (searchText.trim()) { filters.search = searchText.trim(); }
    onApply(filters);
    onClose();
  }, [
    selectedLocations,
    selectedDistrictId,
    selectedAreaId,
    selectedRoles,
    searchText,
    onApply,
    onClose,
  ]);

  const districtOptions = useMemo(
    () => districts.map(r => ({ label: r.name, value: r.id })),
    [districts],
  );

  const areaOptions = useMemo(
    () => areas.map(a => ({ label: a.name, value: a.id })),
    [areas],
  );

  const locationOptions = useMemo(
    () => LOCATION_OPTIONS.map(l => ({ label: locationLabel(l), value: l })),
    [],
  );

  // Jabatan filter is scoped to roles the current user supervises (roles below
  // them in the hierarchy) — a korlap can't filter by kepala_rayon, etc.
  const roleOptions = useMemo(
    () =>
      (FILTER_SUBORDINATE_ROLES[userRole] ?? []).map(r => ({
        label: ROLE_LABELS[r] ?? r,
        value: r,
      })),
    [userRole],
  );

  // "Cari Pengguna" is a searchable (typeahead) select over the live users,
  // de-duped by name. The selected name is sent as the `search` filter.
  const userOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { label: string; value: string }[] = [];
    for (const u of users) {
      if (u.full_name && !seen.has(u.full_name)) {
        seen.add(u.full_name);
        opts.push({ label: u.full_name, value: u.full_name });
      }
    }
    return opts;
  }, [users]);

  // Sheet variant ignores `headerRight`, so Reset lives in the footer alongside
  // Terapkan (a two-button row).
  const footerContent = (
    <View style={styles.footerRow}>
      <NBButton
        title={t('monitoring:filterModal.reset')}
        variant="secondary"
        onPress={handleReset}
        style={styles.footerResetBtn}
      />
      <NBButton
        title={t('monitoring:filterModal.apply')}
        variant="primary"
        onPress={handleApply}
        style={styles.footerApplyBtn}
      />
    </View>
  );

  return (
    <NBModal
      visible={visible}
      onClose={onClose}
      title={t('monitoring:filterModal.title')}
      type="sheet"
      avoidKeyboard
      footer={footerContent}
    >
      <View style={styles.body}>
        {/* Lokasi (location axis) multiselect — activity lives on the peek chips. */}
        <FilterSection title={t('monitoring:filterModal.sections.location')}>
          <NBSelect
            options={locationOptions}
            selectedValues={selectedLocations}
            onValuesChange={(vals: string[]) => setSelectedLocations(vals as PresenceLocation[])}
            placeholder={t('monitoring:filterModal.placeholders.location')}
          />
        </FilterSection>

        {/* Rayon picker */}
        {!hideDistrict && (
          <FilterSection title={t('monitoring:filterModal.sections.district')}>
            {hasFixedDistrict ? (
              <View style={styles.fixedValue}>
                <MaterialCommunityIcons
                  name="lock"
                  size={14}
                  color={nbColors.gray500}
                />
                <NBText variant="body-sm" color="gray700">
                  {currentUser.district?.name ?? t('monitoring:filterModal.fixedDistrict')}
                </NBText>
              </View>
            ) : (
              <NBSelect
                options={districtOptions}
                value={selectedDistrictId}
                onValueChange={(val: string) => {
                  setSelectedDistrictId(val || undefined);
                  setSelectedAreaId(undefined);
                }}
                placeholder={t('monitoring:filterModal.placeholders.district')}
              />
            )}
          </FilterSection>
        )}

        {/* Area picker */}
        <FilterSection title={t('monitoring:filterModal.sections.area')}>
          <NBSelect
            options={areaOptions}
            value={selectedAreaId}
            onValueChange={(val: string) => setSelectedAreaId(val || undefined)}
            placeholder={t('monitoring:filterModal.placeholders.area')}
          />
        </FilterSection>

        {/* Role multiselect — only shown when the user supervises sub-roles */}
        {roleOptions.length > 0 && (
          <FilterSection title={t('monitoring:filterModal.sections.role')}>
            <NBSelect
              options={roleOptions}
              selectedValues={selectedRoles}
              onValuesChange={handleRoleToggle}
              placeholder={t('monitoring:filterModal.placeholders.role')}
              searchable
            />
          </FilterSection>
        )}

        {/* Search user — searchable (typeahead) select over the live users */}
        <FilterSection title={t('monitoring:filterModal.sections.user')}>
          <NBSelect
            options={userOptions}
            value={searchText}
            onValueChange={(val: string) => setSearchText(val)}
            placeholder={t('monitoring:filterModal.placeholders.user')}
            searchable
          />
        </FilterSection>

        {/* Map layer visibility now lives in the wrench "Tampilan" section
            (ToolsOverlay) — the filter modal is data filters only. */}

        {/* Staffing summary - always visible */}
        <FilterSection title={t('monitoring:filterModal.sections.staffing')}>
          <StaffingSummarySection
            items={staffing}
            isLoading={isLoadingStaffing}
            currentDayTypeLabel={currentDayTypeLabel}
            selectedDistrictId={selectedDistrictId}
            selectedAreaId={selectedAreaId}
          />
        </FilterSection>
      </View>
    </NBModal>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterSection({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <View style={styles.section}>
      <NBText variant="mono-sm" uppercase color="gray700">{title}</NBText>
      {children}
    </View>
  );
}


// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  footerRow: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
  footerResetBtn: {
    flex: 1,
  },
  footerApplyBtn: {
    flex: 2,
  },
  body: {
    gap: nbSpacing.lg,
  },
  section: {
    gap: nbSpacing.sm,
  },
  fixedValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
    backgroundColor: nbColors.gray100,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.gray300,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
  },
});
