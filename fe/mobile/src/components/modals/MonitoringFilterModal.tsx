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
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBModal } from '../nb';
import { NBButton } from '../nb';
import { NBText } from '../nb/NBText';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbRadius,
  nbShadows,
} from '../../constants/nbTokens';
import { getStatusLabel } from '../../utils/mapUtils';
import { NBSelect } from '../nb';
import { getAreas, getAreasByRayonId, getRayons } from '../../services/api';
import { getStaffingSummary } from '../../services/api/monitoringApi';
import { StaffingSummarySection } from '../monitoring/StaffingSummarySection';
import type { MonitoringFilters } from '../../types/api.types';
import type { TrackingStatus, StaffingSummaryItem, User } from '../../types/models.types';
import type { Area, Rayon } from '../../types/models.types';
import {
  ROLE_LABELS,
  ROLES_WITH_RAYON,
  ROLES_WITH_FIXED_RAYON,
  ROLES_WITHOUT_RAYON,
} from '../../constants/roles';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonitoringFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: MonitoringFilters) => void;
  currentFilters: MonitoringFilters;
  currentUser: User;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: TrackingStatus[] = [
  'active',
  'inactive',
  'outside_area',
  'missing',
];

const FIELD_ROLES = ['satgas', 'linmas', 'korlap', 'admin_data', 'kepala_rayon'] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function MonitoringFilterModal({
  visible,
  onClose,
  onApply,
  currentFilters,
  currentUser,
}: MonitoringFilterModalProps): React.JSX.Element {
  const [selectedStatuses, setSelectedStatuses] = useState<TrackingStatus[]>(
    currentFilters.status ?? [],
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
      setSelectedStatuses(currentFilters.status ?? []);
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
    setSelectedStatuses([]);
    setSelectedRayonId(undefined);
    setSelectedAreaId(undefined);
    setSelectedRoles([]);
    setSearchText('');
  }, []);

  const handleApply = useCallback(() => {
    const filters: MonitoringFilters = {};
    if (selectedStatuses.length > 0) { filters.status = selectedStatuses; }
    if (selectedRayonId) { filters.rayon_id = selectedRayonId; }
    if (selectedAreaId) { filters.area_id = selectedAreaId; }
    if (selectedRoles.length === 1) { filters.role = selectedRoles[0]; }
    if (selectedRoles.length > 1) { (filters as any).roles = selectedRoles; }
    if (searchText.trim()) { filters.search = searchText.trim(); }
    onApply(filters);
    onClose();
  }, [
    selectedStatuses,
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

  const statusOptions = useMemo(
    () => STATUS_OPTIONS.map(s => ({ label: getStatusLabel(s), value: s })),
    [],
  );

  const roleOptions = useMemo(
    () => FIELD_ROLES.map(r => ({ label: ROLE_LABELS[r] ?? r, value: r })),
    [],
  );

  const headerRightContent = (
    <TouchableOpacity
      onPress={handleReset}
      style={styles.resetBtn}
      accessibilityRole="button"
      accessibilityLabel="Reset filter"
    >
      <NBText variant="body-sm" color="dangerDark">
        Reset
      </NBText>
    </TouchableOpacity>
  );

  const footerContent = (
    <NBButton
      title="Terapkan"
      variant="primary"
      onPress={handleApply}
      fullWidth
    />
  );

  return (
    <NBModal
      visible={visible}
      onClose={onClose}
      title="Filter Monitoring"
      type="fullscreen"
      scrollable
      avoidKeyboard
      headerRight={headerRightContent}
      footer={footerContent}
    >
      {/* Status multiselect */}
      <FilterSection title="Status">
        <NBSelect
          options={statusOptions}
          selectedValues={selectedStatuses}
          onValuesChange={(vals: string[]) => setSelectedStatuses(vals as TrackingStatus[])}
          placeholder="Pilih Status"
          searchable
        />
      </FilterSection>

      {/* Rayon picker */}
      {!hideRayon && (
        <FilterSection title="Rayon">
          {hasFixedRayon ? (
            <View style={styles.fixedValue}>
              <MaterialCommunityIcons
                name="lock"
                size={14}
                color={nbColors.gray500}
              />
              <Text style={styles.fixedValueText}>
                {currentUser.rayon?.name ?? 'Rayon Anda'}
              </Text>
            </View>
          ) : (
            <NBSelect
              options={rayonOptions}
              value={selectedRayonId}
              onValueChange={(val: string) => {
                setSelectedRayonId(val || undefined);
                setSelectedAreaId(undefined);
              }}
              placeholder="Pilih Rayon"
            />
          )}
        </FilterSection>
      )}

      {/* Area picker */}
      <FilterSection title="Area">
        <NBSelect
          options={areaOptions}
          value={selectedAreaId}
          onValueChange={(val: string) => setSelectedAreaId(val || undefined)}
          placeholder="Pilih Area"
        />
      </FilterSection>

      {/* Role multiselect */}
      <FilterSection title="Jabatan">
        <NBSelect
          options={roleOptions}
          selectedValues={selectedRoles}
          onValuesChange={handleRoleToggle}
          placeholder="Pilih Jabatan"
          searchable
        />
      </FilterSection>

      {/* Search user */}
      <FilterSection title="Cari Pengguna">
        <View style={styles.searchInput}>
          <MaterialCommunityIcons
            name="magnify"
            size={18}
            color={nbColors.gray500}
          />
          <TextInput
            style={styles.searchText}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Ketik nama pengguna..."
            placeholderTextColor={nbColors.gray400}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <MaterialCommunityIcons
                name="close-circle"
                size={16}
                color={nbColors.gray400}
              />
            </TouchableOpacity>
          )}
        </View>
      </FilterSection>

      {/* Staffing summary - always visible */}
      <FilterSection title="Kepegawaian">
        <StaffingSummarySection
          items={staffing}
          isLoading={isLoadingStaffing}
          currentDayTypeLabel={currentDayTypeLabel}
          selectedRayonId={selectedRayonId}
          selectedAreaId={selectedAreaId}
        />
      </FilterSection>
    </NBModal>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterSection({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}


// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  resetBtn: {
    paddingHorizontal: nbSpacing.sm,
  },
  section: {
    gap: nbSpacing.sm,
  },
  sectionTitle: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.gray700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fixedValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
    backgroundColor: nbColors.gray100,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.thin,
    borderColor: nbColors.gray300,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
  },
  fixedValueText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray600,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: nbColors.white,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.thin,
    borderColor: nbColors.gray300,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    gap: nbSpacing.sm,
  },
  searchText: {
    flex: 1,
    fontSize: nbTypography.fontSize.base,
    color: nbColors.black,
    padding: 0,
  },
});
