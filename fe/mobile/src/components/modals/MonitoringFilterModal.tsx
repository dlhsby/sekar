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
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbBorderRadius,
  nbShadows,
} from '../../constants/nbTokens';
import { getStatusColor, getStatusLabel } from '../../utils/mapUtils';
import { NBSelect } from '../nb';
import { getAreas, getAreasByRayonId, getRayons } from '../../services/api';
import { getStaffingSummary } from '../../services/api/monitoringApi';
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

const FIELD_ROLES = ['satgas', 'linmas', 'korlap'] as const;

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
  const [selectedRole, setSelectedRole] = useState<string | undefined>(
    currentFilters.role,
  );
  const [searchText, setSearchText] = useState<string>(
    currentFilters.search ?? '',
  );

  const [rayons, setRayons] = useState<Rayon[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [staffing, setStaffing] = useState<StaffingSummaryItem[]>([]);
  const [isLoadingStaffing, setIsLoadingStaffing] = useState(false);

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
        .then(res => { if (res.data) { setAreas(res.data.areas ?? []); } })
        .catch(() => {});
    }
  }, [visible, selectedRayonId, hasFixedRayon, currentUser.rayon_id]);

  // Load staffing summary when area selected
  useEffect(() => {
    if (!visible || !selectedAreaId) {
      setStaffing([]);
      return;
    }
    setIsLoadingStaffing(true);
    getStaffingSummary({ area_id: selectedAreaId })
      .then(res => {
        if (res.data?.items) { setStaffing(res.data.items); }
      })
      .catch(() => {})
      .finally(() => { setIsLoadingStaffing(false); });
  }, [visible, selectedAreaId]);

  // Sync with current filters when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedStatuses(currentFilters.status ?? []);
      setSelectedRayonId(currentFilters.rayon_id);
      setSelectedAreaId(currentFilters.area_id);
      setSelectedRole(currentFilters.role);
      setSearchText(currentFilters.search ?? '');
    }
  }, [visible, currentFilters]);

  const handleStatusToggle = useCallback((status: TrackingStatus) => {
    setSelectedStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status],
    );
  }, []);

  const handleRoleToggle = useCallback((role: string) => {
    setSelectedRole(prev => (prev === role ? undefined : role));
  }, []);

  const handleReset = useCallback(() => {
    setSelectedStatuses([]);
    setSelectedRayonId(undefined);
    setSelectedAreaId(undefined);
    setSelectedRole(undefined);
    setSearchText('');
  }, []);

  const handleApply = useCallback(() => {
    const filters: MonitoringFilters = {};
    if (selectedStatuses.length > 0) { filters.status = selectedStatuses; }
    if (selectedRayonId) { filters.rayon_id = selectedRayonId; }
    if (selectedAreaId) { filters.area_id = selectedAreaId; }
    if (selectedRole) { filters.role = selectedRole; }
    if (searchText.trim()) { filters.search = searchText.trim(); }
    onApply(filters);
    onClose();
  }, [
    selectedStatuses,
    selectedRayonId,
    selectedAreaId,
    selectedRole,
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

  const areaStaffing = useMemo(
    () => staffing.find(s => s.id === selectedAreaId) ?? null,
    [staffing, selectedAreaId],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={nbColors.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Filter Monitoring</Text>
          <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Status chips */}
          <FilterSection title="Status">
            <View style={styles.chipRow}>
              {STATUS_OPTIONS.map(status => {
                const isActive = selectedStatuses.includes(status);
                const color = getStatusColor(status);
                return (
                  <StatusFilterChip
                    key={status}
                    status={status}
                    label={getStatusLabel(status)}
                    color={color}
                    isActive={isActive}
                    onPress={handleStatusToggle}
                  />
                );
              })}
            </View>
          </FilterSection>

          {/* Rayon picker */}
          {!hideRayon && (
            <FilterSection title="Rayon">
              {hasFixedRayon ? (
                <View style={styles.fixedValue}>
                  <MaterialCommunityIcons
                    name="lock"
                    size={14}
                    color={nbColors.gray['500']}
                  />
                  <Text style={styles.fixedValueText}>
                    {currentUser.rayon?.name ?? 'Rayon Anda'}
                  </Text>
                </View>
              ) : (
                <NBSelect
                  options={rayonOptions}
                  value={selectedRayonId ?? null}
                  onChange={val => {
                    setSelectedRayonId(val ?? undefined);
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
              value={selectedAreaId ?? null}
              onChange={val => setSelectedAreaId(val ?? undefined)}
              placeholder="Pilih Area"
            />
          </FilterSection>

          {/* Role chips */}
          <FilterSection title="Peran">
            <View style={styles.chipRow}>
              {FIELD_ROLES.map(role => (
                <RoleFilterChip
                  key={role}
                  role={role}
                  label={ROLE_LABELS[role] ?? role}
                  isActive={selectedRole === role}
                  onPress={handleRoleToggle}
                />
              ))}
            </View>
          </FilterSection>

          {/* Search user */}
          <FilterSection title="Cari Pengguna">
            <View style={styles.searchInput}>
              <MaterialCommunityIcons
                name="magnify"
                size={18}
                color={nbColors.gray['500']}
              />
              <TextInput
                style={styles.searchText}
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Ketik nama pengguna..."
                placeholderTextColor={nbColors.gray['400']}
                returnKeyType="search"
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={16}
                    color={nbColors.gray['400']}
                  />
                </TouchableOpacity>
              )}
            </View>
          </FilterSection>

          {/* Staffing summary */}
          {selectedAreaId && (
            <FilterSection title="Kepegawaian Area">
              {isLoadingStaffing ? (
                <ActivityIndicator size="small" color={nbColors.primary} />
              ) : areaStaffing ? (
                <StaffingSummaryCard item={areaStaffing} />
              ) : null}
            </FilterSection>
          )}
        </ScrollView>

        {/* Apply button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={handleApply}
            activeOpacity={0.8}
            accessibilityLabel="Terapkan filter"
            accessibilityRole="button"
          >
            <Text style={styles.applyBtnText}>Terapkan</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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

interface StatusFilterChipProps {
  status: TrackingStatus;
  label: string;
  color: string;
  isActive: boolean;
  onPress: (s: TrackingStatus) => void;
}

function StatusFilterChip({ status, label, color, isActive, onPress }: StatusFilterChipProps): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.chip, isActive && { backgroundColor: color, borderColor: nbColors.black }]}
      onPress={() => onPress(status)}
      activeOpacity={0.75}
    >
      <View style={[styles.chipDot, { backgroundColor: color }]} />
      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

interface RoleFilterChipProps {
  role: string;
  label: string;
  isActive: boolean;
  onPress: (r: string) => void;
}

function RoleFilterChip({ role, label, isActive, onPress }: RoleFilterChipProps): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.chip, isActive && styles.chipActive]}
      onPress={() => onPress(role)}
      activeOpacity={0.75}
    >
      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function StaffingSummaryCard({ item }: { item: StaffingSummaryItem }): React.JSX.Element {
  return (
    <View style={styles.staffingCard}>
      <View style={styles.staffingHeader}>
        <Text style={styles.staffingAreaName}>{item.name}</Text>
        <View style={[
          styles.staffingStatusBadge,
          { backgroundColor: item.is_fully_staffed ? nbColors.successDark : nbColors.dangerDark },
        ]}>
          <MaterialCommunityIcons
            name={item.is_fully_staffed ? 'check' : 'alert'}
            size={12}
            color={nbColors.white}
          />
        </View>
      </View>
      {item.roles.map(role => (
        <View key={role.role} style={styles.staffingRow}>
          <Text style={styles.staffingRoleLabel}>
            {ROLE_LABELS[role.role as keyof typeof ROLE_LABELS] ?? role.role}
          </Text>
          <Text style={styles.staffingCounts}>
            {role.active}/{role.total_assigned}
            {role.idle > 0 ? `  ${role.idle} idle` : ''}
            {role.outside_area > 0 ? `  ${role.outside_area} di luar` : ''}
            {role.missing > 0 ? `  ${role.missing} hilang` : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: nbColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.md,
    paddingTop: nbSpacing.xl,
    paddingBottom: nbSpacing.md,
    backgroundColor: nbColors.white,
    borderBottomWidth: nbBorders.base,
    borderBottomColor: nbColors.black,
    ...nbShadows.sm,
  },
  backBtn: {
    padding: nbSpacing.sm,
    marginRight: nbSpacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
  resetBtn: {
    padding: nbSpacing.sm,
  },
  resetText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.dangerDark,
    fontWeight: nbTypography.fontWeight.semibold,
  },
  scrollContent: {
    padding: nbSpacing.md,
    gap: nbSpacing.md,
    paddingBottom: nbSpacing['2xl'],
  },
  section: {
    gap: nbSpacing.sm,
  },
  sectionTitle: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.gray['700'],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: nbSpacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: nbColors.white,
    borderRadius: nbBorderRadius.full,
    borderWidth: nbBorders.thin,
    borderColor: nbColors.gray['300'],
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.xs,
    gap: nbSpacing.xs,
  },
  chipActive: {
    backgroundColor: nbColors.primary,
    borderColor: nbColors.black,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray['700'],
  },
  chipTextActive: {
    color: nbColors.white,
  },
  fixedValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
    backgroundColor: nbColors.gray['100'],
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.thin,
    borderColor: nbColors.gray['300'],
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
  },
  fixedValueText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['600'],
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: nbColors.white,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.thin,
    borderColor: nbColors.gray['300'],
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
  staffingCard: {
    backgroundColor: nbColors.white,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.thin,
    borderColor: nbColors.gray['300'],
    padding: nbSpacing.sm,
    gap: nbSpacing.xs,
  },
  staffingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: nbSpacing.xs,
  },
  staffingAreaName: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.gray['800'],
  },
  staffingStatusBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  staffingRoleLabel: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['600'],
  },
  staffingCounts: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray['700'],
    fontWeight: nbTypography.fontWeight.medium,
  },
  footer: {
    padding: nbSpacing.md,
    backgroundColor: nbColors.white,
    borderTopWidth: nbBorders.base,
    borderTopColor: nbColors.black,
    ...nbShadows.md,
  },
  applyBtn: {
    backgroundColor: nbColors.primary,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    paddingVertical: nbSpacing.md,
    alignItems: 'center',
    ...nbShadows.md,
  },
  applyBtnText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
});
