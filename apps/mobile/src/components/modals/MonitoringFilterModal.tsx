/**
 * MonitoringFilterModal Component
 * Phase 2D: Full-screen filter modal for map monitoring.
 * Role-gated rayon/area pickers, status chips, role chips, user search, staffing summary.
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
import { getAreas, getAreasByRayonId, getRayons } from '../../services/api';
import { getStaffingSummary } from '../../services/api/monitoringApi';
import { StaffingSummarySection } from '../monitoring/StaffingSummarySection';
import { LAYER_ROWS } from '../monitoring/monitoringLayers';
import type { MonitoringV2VisibleLayers } from '../../store/slices/monitoringV2Slice';
import type { MonitoringFilters } from '../../types/api.types';
import type { PresenceLocation, StaffingSummaryItem, User } from '../../types/models.types';
import type { Area, Rayon } from '../../types/models.types';
import {
  ROLE_LABELS,
  ROLES_WITH_RAYON,
  ROLES_WITH_FIXED_RAYON,
  ROLES_WITHOUT_RAYON,
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
  /** Map layer visibility (merged "Lapisan Peta" section). Omit to hide it. */
  visibleLayers?: MonitoringV2VisibleLayers;
  /** Toggle a map layer (applied immediately, not on Terapkan). */
  onToggleLayer?: (layer: keyof MonitoringV2VisibleLayers) => void;
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
  visibleLayers,
  onToggleLayer,
}: MonitoringFilterModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const [selectedLocations, setSelectedLocations] = useState<PresenceLocation[]>(
    currentFilters.location ?? [],
  );
  const [selectedRayonId, setSelectedRayonId] = useState<string | undefined>(
    currentFilters.rayon_id,
  );
  const [selectedAreaId, setSelectedAreaId] = useState<string | undefined>(
    currentFilters.area_id,
  );
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    currentFilters.role ? [currentFilters.role] : [],
  );
  const [searchText, setSearchText] = useState<string>(
    currentFilters.search ?? '',
  );

  const [rayons, setRayons] = useState<Rayon[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [staffing, setStaffing] = useState<StaffingSummaryItem[]>([]);
  const [isLoadingStaffing, setIsLoadingStaffing] = useState(false);
  const [currentDayTypeLabel, setCurrentDayTypeLabel] = useState<string | null>(null);

  const userRole = currentUser.role;

  const canSelectRayon = ROLES_WITH_RAYON.includes(userRole);
  const hasFixedRayon = ROLES_WITH_FIXED_RAYON.includes(userRole);
  const hideRayon = ROLES_WITHOUT_RAYON.includes(userRole);

  // Load rayons for roles that can select
  useEffect(() => {
    if (!visible || hideRayon) { return; }
    if (canSelectRayon) {
      getRayons()
        .then(res => { if (res.data) { setRayons(res.data); } })
        .catch(() => {});
    }
  }, [visible, canSelectRayon, hideRayon]);

  // Load areas cascading from rayon
  useEffect(() => {
    if (!visible) { return; }
    const rayonId = hasFixedRayon ? currentUser.rayon_id : selectedRayonId;
    if (rayonId) {
      getAreasByRayonId(rayonId)
        .then(res => { if (res.data) { setAreas(res.data); } })
        .catch(() => {});
    } else if (!hasFixedRayon) {
      getAreas()
        .then(res => { if (res.data) { setAreas(Array.isArray(res.data) ? res.data : []); } })
        .catch(() => {});
    }
  }, [visible, selectedRayonId, hasFixedRayon, currentUser.rayon_id]);

  // Load staffing summary always on modal open (filters by rayon/area)
  useEffect(() => {
    if (!visible) {
      setStaffing([]);
      return;
    }
    setIsLoadingStaffing(true);
    const rayonId = hasFixedRayon ? currentUser.rayon_id : selectedRayonId;
    const filters: { rayon_id?: string; area_id?: string } = {};
    if (rayonId) filters.rayon_id = rayonId;
    if (selectedAreaId) filters.area_id = selectedAreaId;
    getStaffingSummary(filters)
      .then(res => {
        if (res.data?.items) { setStaffing(res.data.items); }
        if ((res.data as any)?.current_day_type_label) {
          setCurrentDayTypeLabel((res.data as any).current_day_type_label);
        }
      })
      .catch(() => {})
      .finally(() => { setIsLoadingStaffing(false); });
  }, [visible, selectedRayonId, selectedAreaId, hasFixedRayon, currentUser.rayon_id]);

  // Sync with current filters when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedLocations(currentFilters.location ?? []);
      setSelectedRayonId(currentFilters.rayon_id);
      setSelectedAreaId(currentFilters.area_id);
      setSelectedRoles(currentFilters.role ? [currentFilters.role] : []);
      setSearchText(currentFilters.search ?? '');
    }
  }, [visible, currentFilters]);

  const handleRoleToggle = useCallback((roles: string[]) => {
    setSelectedRoles(roles);
  }, []);

  const handleReset = useCallback(() => {
    setSelectedLocations([]);
    setSelectedRayonId(undefined);
    setSelectedAreaId(undefined);
    setSelectedRoles([]);
    setSearchText('');
  }, []);

  const handleApply = useCallback(() => {
    const filters: MonitoringFilters = {};
    if (selectedLocations.length > 0) { filters.location = selectedLocations; }
    if (selectedRayonId) { filters.rayon_id = selectedRayonId; }
    if (selectedAreaId) { filters.area_id = selectedAreaId; }
    if (selectedRoles.length === 1) { filters.role = selectedRoles[0]; }
    if (selectedRoles.length > 1) { (filters as any).roles = selectedRoles; }
    if (searchText.trim()) { filters.search = searchText.trim(); }
    onApply(filters);
    onClose();
  }, [
    selectedLocations,
    selectedRayonId,
    selectedAreaId,
    selectedRoles,
    searchText,
    onApply,
    onClose,
  ]);

  const rayonOptions = useMemo(
    () => rayons.map(r => ({ label: r.name, value: r.id })),
    [rayons],
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

  // "Tampilan Peta" multi-select: options are the 5 map layers; the selected
  // set mirrors the currently-visible layers (its default), and changing the
  // selection dispatches a toggle for each layer whose visibility flipped.
  const layerOptions = useMemo(
    () => LAYER_ROWS.map(r => ({ label: r.label, value: r.key as string })),
    [],
  );

  const selectedLayers = useMemo(
    () => (visibleLayers ? LAYER_ROWS.filter(r => visibleLayers[r.key]).map(r => r.key as string) : []),
    [visibleLayers],
  );

  const handleLayersChange = useCallback(
    (vals: string[]) => {
      if (!visibleLayers || !onToggleLayer) { return; }
      LAYER_ROWS.forEach(r => {
        const nextVisible = vals.includes(r.key as string);
        if (nextVisible !== visibleLayers[r.key]) { onToggleLayer(r.key); }
      });
    },
    [visibleLayers, onToggleLayer],
  );

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
      floating
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
        {!hideRayon && (
          <FilterSection title={t('monitoring:filterModal.sections.rayon')}>
            {hasFixedRayon ? (
              <View style={styles.fixedValue}>
                <MaterialCommunityIcons
                  name="lock"
                  size={14}
                  color={nbColors.gray500}
                />
                <NBText variant="body-sm" color="gray700">
                  {currentUser.rayon?.name ?? t('monitoring:filterModal.fixedRayon')}
                </NBText>
              </View>
            ) : (
              <NBSelect
                options={rayonOptions}
                value={selectedRayonId}
                onValueChange={(val: string) => {
                  setSelectedRayonId(val || undefined);
                  setSelectedAreaId(undefined);
                }}
                placeholder={t('monitoring:filterModal.placeholders.rayon')}
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

        {/* Map layer visibility — merged from the old "Lapisan Peta" sheet, as a
            multi-select. Selected = currently-visible layers (its default state);
            changing the selection dispatches the diff immediately (Redux). */}
        {visibleLayers && onToggleLayer && (
          <FilterSection title={t('monitoring:filterModal.sections.mapLayers')}>
            <NBSelect
              options={layerOptions}
              selectedValues={selectedLayers}
              onValuesChange={handleLayersChange}
              placeholder={t('monitoring:filterModal.placeholders.layers')}
            />
          </FilterSection>
        )}

        {/* Staffing summary - always visible */}
        <FilterSection title={t('monitoring:filterModal.sections.staffing')}>
          <StaffingSummarySection
            items={staffing}
            isLoading={isLoadingStaffing}
            currentDayTypeLabel={currentDayTypeLabel}
            selectedRayonId={selectedRayonId}
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
