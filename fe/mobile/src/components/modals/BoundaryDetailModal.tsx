/**
 * BoundaryDetailModal Component
 * Phase 2D Gap #2: Shows rayon/area staffing details when center marker is tapped.
 * Rayon mode: list of areas with understaffed highlighted.
 * Area mode: per-role staffing breakdown table.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import type { BottomSheetDefaultBackdropProps } from '@gorhom/bottom-sheet/lib/typescript/components/bottomSheetBackdrop/types';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../nb/NBText';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbBorderRadius,
  nbShadows,
} from '../../constants/nbTokens';
import { ROLE_LABELS } from '../../constants/roles';
import type {
  RayonBoundary,
  AreaBoundary,
  UserRole,
  AreaPlant,
  NotablePlant,
} from '../../types/models.types';
import { listAreaPlants, listNotablePlants } from '../../services/api/plantsApi';

// ─── Props ────────────────────────────────────────────────────────────────────

interface BoundaryDetailModalProps {
  type: 'rayon' | 'area';
  data: RayonBoundary | AreaBoundary | null;
  visible: boolean;
  onClose: () => void;
  onReassign?: (area: AreaBoundary) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BoundaryDetailModal({
  type,
  data,
  visible,
  onClose,
  onReassign,
}: BoundaryDetailModalProps): React.JSX.Element {
  const isRayon = type === 'rayon';
  const rayonData = !data ? null : (isRayon ? (data as RayonBoundary) : null);
  const areaData = !data ? null : (!isRayon ? (data as AreaBoundary) : null);

  // Phase 3 sub-phase 3-8 hookup: fetch plants for the selected area so the
  // modal shows tanaman info (status mix + heritage trees). The rayon-scoped
  // "Permohonan Pangkas" section was intentionally dropped — it was ambiguous
  // because pruning_requests are rayon-scoped, not area-scoped.
  const [plants, setPlants] = useState<AreaPlant[]>([]);
  const [notable, setNotable] = useState<NotablePlant[]>([]);
  const [loadingPlants, setLoadingPlants] = useState(false);

  useEffect(() => {
    if (!visible || isRayon || !areaData) {
      setPlants([]);
      setNotable([]);
      return;
    }
    let cancelled = false;
    const areaId = areaData.id;

    setLoadingPlants(true);
    Promise.all([listAreaPlants(areaId), listNotablePlants(areaId)])
      .then(([plantsRes, notableRes]) => {
        if (cancelled) return;
        setPlants(plantsRes.data ?? []);
        setNotable(notableRes.data ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setPlants([]);
        setNotable([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingPlants(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, isRayon, areaData]);

  const sheetRef = useRef<BottomSheet>(null);
  // Match UserDetailSheet — same snap points so worker + area details open at
  // identical heights and both can be expanded by dragging the handle.
  const snapPoints = useMemo(() => ['70%', '90%'], []);
  const isOpen = visible && !!data;

  useEffect(() => {
    if (isOpen) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [isOpen]);

  const renderBackdrop = useCallback(
    (props: BottomSheetDefaultBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={isOpen ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onClose={onClose}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView contentContainerStyle={styles.body}>
        {data && (
          <>
          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons
              name={isRayon ? 'office-building' : 'map-marker'}
              size={20}
              color={isRayon ? nbColors.requestUnderReview : nbColors.statusIdle}
            />
            <NBText variant="body-lg" color="black" style={styles.headerTitleFlex}>
              {isRayon ? rayonData!.name : areaData!.name}
            </NBText>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={20} color={nbColors.gray700} />
            </TouchableOpacity>
          </View>

          <View style={styles.bodyInner}>
            {/* Rayon mode: list areas */}
            {isRayon && rayonData && (
              <>
                <NBText variant="body-sm" color="gray700" style={styles.sectionLabel}>
                  {rayonData.areas.length} Area
                  {rayonData.understaffed_area_count > 0
                    ? ` (${rayonData.understaffed_area_count} kurang staf)`
                    : ''}
                </NBText>
                {rayonData.areas.map(area => (
                  <View
                    key={area.id}
                    style={[
                      styles.areaRow,
                      area.is_understaffed && styles.areaRowUnderstaffed,
                    ]}
                  >
                    <View style={styles.areaRowLeft}>
                      <NBText variant="body" color="black">{area.name}</NBText>
                      <NBText variant="body-sm" color="gray600">
                        {area.total_active}/{area.total_required} aktif
                      </NBText>
                    </View>
                    {area.is_understaffed ? (
                      <View style={styles.warningBadge}>
                        <MaterialCommunityIcons name="alert" size={14} color={nbColors.white} />
                      </View>
                    ) : (
                      <View style={styles.checkBadge}>
                        <MaterialCommunityIcons name="check" size={14} color={nbColors.white} />
                      </View>
                    )}
                  </View>
                ))}
              </>
            )}

            {/* Area mode: per-role staffing table */}
            {!isRayon && areaData && (
              <>
                <View style={styles.summaryRow}>
                  <NBText variant="body" color="gray700" style={styles.semibold}>Total Aktif</NBText>
                  <NBText variant="body-lg" color="black">
                    {areaData.total_active}/{areaData.total_required}
                  </NBText>
                </View>

                <NBText variant="body-sm" color="gray700" style={styles.sectionLabel}>Detail</NBText>
                <View style={styles.staffingTable}>
                  <View style={styles.tableHeader}>
                    <NBText variant="caption" color="gray700" style={[styles.tableHeaderCell, styles.tableRoleCol]}>Peran</NBText>
                    <NBText variant="caption" color="gray700" style={styles.tableHeaderCell}>Dibutuhkan</NBText>
                    <NBText variant="caption" color="gray700" style={styles.tableHeaderCell}>Aktif</NBText>
                    <NBText variant="caption" color="gray700" style={styles.tableHeaderCell}>Delta</NBText>
                  </View>
                  {(areaData.staffing ?? []).map(item => {
                    const delta = item.active - item.required;
                    return (
                      <View key={item.role} style={styles.tableRow}>
                        <NBText variant="body-sm" color="gray800" style={[styles.tableCell, styles.tableRoleCol]}>
                          {ROLE_LABELS[item.role as UserRole] ?? item.role}
                        </NBText>
                        <NBText variant="body-sm" color="gray800" style={styles.tableCell}>{item.required}</NBText>
                        <NBText variant="body-sm" color="gray800" style={styles.tableCell}>{item.active}</NBText>
                        <NBText
                          variant="body-sm"
                          style={[
                            styles.tableCell,
                            { color: delta >= 0 ? nbColors.successDark : nbColors.dangerDark },
                          ]}
                        >
                          {delta >= 0 ? `+${delta}` : delta}
                        </NBText>
                      </View>
                    );
                  })}
                </View>

                {/* Reassign button for understaffed areas */}
                {areaData.is_understaffed && onReassign && (
                  <TouchableOpacity
                    style={styles.reassignBtn}
                    onPress={() => onReassign(areaData)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="account-switch" size={18} color={nbColors.black} />
                    <NBText variant="body" color="black">Reassign Petugas</NBText>
                  </TouchableOpacity>
                )}

                {/* Phase 3: Plant status section */}
                <NBText variant="body-sm" color="gray700" style={styles.sectionLabel}>
                  Status Tanaman
                </NBText>
                {loadingPlants ? (
                  <NBText variant="body-sm" color="gray600">Memuat data tanaman…</NBText>
                ) : plants.length === 0 ? (
                  <View style={styles.placeholderBox}>
                    <NBText variant="body-sm" color="gray600">
                      Belum ada data tanaman terdaftar untuk area ini.
                    </NBText>
                  </View>
                ) : (
                  <PlantSummaryBlock plants={plants} />
                )}

                {notable.length > 0 && (
                  <>
                    <NBText variant="body-sm" color="gray700" style={styles.sectionLabel}>
                      Pohon Heritage ({notable.length})
                    </NBText>
                    {notable.map((n) => (
                      <View key={n.id} style={styles.heritageRow}>
                        <MaterialCommunityIcons name="tree" size={14} color={nbColors.successDark} />
                        <NBText variant="body-sm" color="gray800" style={styles.heritageLabel}>
                          {n.label ?? 'Tanpa label'}
                          {n.species?.nameId ? ` · ${formatSpeciesName(n.species.nameId)}` : ''}
                        </NBText>
                      </View>
                    ))}
                  </>
                )}
              </>
            )}
          </View>
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

// ─── Phase 3 sub-components ───────────────────────────────────────────────────

/**
 * Convert backend `name_id` (e.g. `KETAPANG_KENCANA`) into display form
 * (`Ketapang Kencana`). Falls back to a friendly Indonesian label when the
 * species relation isn't loaded.
 */
function formatSpeciesName(nameId: string | null | undefined): string {
  if (!nameId) return 'Jenis pohon belum diketahui';
  return nameId
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

interface PlantSummaryBlockProps {
  plants: AreaPlant[];
}

function PlantSummaryBlock({ plants }: PlantSummaryBlockProps): React.JSX.Element {
  let okCount = 0;
  let dueCount = 0;
  let overdueCount = 0;
  for (const p of plants) {
    const status = p.status as string;
    if (status === 'overdue') overdueCount += 1;
    else if (status === 'due' || status === 'due_soon') dueCount += 1;
    else if (status === 'ok') okCount += 1;
  }
  const totalCount = plants.reduce((acc, p) => acc + (p.count ?? 0), 0);

  return (
    <View>
      <View style={styles.statusRow}>
        <StatusPill label="OK" count={okCount} tint={nbColors.successDark} />
        <StatusPill label="Hampir" count={dueCount} tint={nbColors.warning} />
        <StatusPill label="Lewat" count={overdueCount} tint={nbColors.dangerDark} />
      </View>
      <NBText variant="caption" color="gray600" style={styles.plantSubLabel}>
        {plants.length} jenis pohon · {totalCount} pohon terdata
      </NBText>
      {plants.slice(0, 5).map((p) => {
        const status = p.status as string;
        const tint =
          status === 'overdue'
            ? nbColors.dangerDark
            : status === 'due' || status === 'due_soon'
              ? nbColors.warning
              : nbColors.gray700;
        const speciesName = formatSpeciesName(p.species?.nameId);
        const lastPruned = p.lastPrunedAt
          ? new Date(p.lastPrunedAt).toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : 'Belum pernah dipangkas';
        return (
          <View key={p.id} style={styles.plantRow}>
            <View style={styles.plantRowLeft}>
              <NBText variant="body-sm" color="black">{speciesName}</NBText>
              <NBText variant="caption" color="gray600">
                {p.count} pohon · {lastPruned}
              </NBText>
            </View>
            <NBText variant="caption" style={{ color: tint, fontWeight: '700' }}>
              {status === 'overdue'
                ? 'LEWAT'
                : status === 'due' || status === 'due_soon'
                  ? 'HAMPIR'
                  : 'OK'}
            </NBText>
          </View>
        );
      })}
    </View>
  );
}

interface StatusPillProps {
  label: string;
  count: number;
  tint: string;
}

function StatusPill({ label, count, tint }: StatusPillProps): React.JSX.Element {
  return (
    <View style={[styles.statusPill, { borderColor: tint }]}>
      <NBText variant="body-lg" style={{ color: tint, fontWeight: '900' }}>
        {count}
      </NBText>
      <NBText variant="caption" color="gray700">{label}</NBText>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Bottom-sheet chrome — kept identical to UserDetailSheet so worker + area
  // details share the same handle indicator + border treatment.
  sheetBackground: {
    backgroundColor: nbColors.white,
    borderTopLeftRadius: nbBorderRadius.lg,
    borderTopRightRadius: nbBorderRadius.lg,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
  },
  handle: {
    backgroundColor: nbColors.gray400,
    width: 40,
  },
  bodyInner: {
    paddingHorizontal: nbSpacing.md,
    paddingTop: 0,
    paddingBottom: nbSpacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: nbSpacing.md,
    borderBottomWidth: nbBorders.thin,
    borderBottomColor: nbColors.gray300,
    gap: nbSpacing.sm,
  },
  headerTitleFlex: {
    flex: 1,
  },
  closeBtn: {
    padding: nbSpacing.xs,
  },
  body: {
    paddingBottom: nbSpacing.xl,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: nbSpacing.sm,
  },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.sm,
    borderRadius: nbBorderRadius.base,
    marginBottom: nbSpacing.xs,
    backgroundColor: nbColors.gray100,
  },
  areaRowUnderstaffed: {
    backgroundColor: nbColors.statusMissingBg,
    borderWidth: 1,
    borderColor: nbColors.dangerDark,
  },
  areaRowLeft: {
    flex: 1,
  },
  warningBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: nbColors.dangerDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: nbColors.successDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.sm,
    backgroundColor: nbColors.gray100,
    borderRadius: nbBorderRadius.base,
  },
  semibold: {
    fontWeight: '600',
  },
  staffingTable: {
    borderWidth: nbBorders.thin,
    borderColor: nbColors.gray300,
    borderRadius: nbBorderRadius.base,
    overflow: 'hidden',
    marginBottom: nbSpacing.md,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: nbColors.gray200,
    paddingVertical: nbSpacing.xs,
    paddingHorizontal: nbSpacing.sm,
  },
  tableHeaderCell: {
    flex: 1,
    textAlign: 'center',
  },
  tableRoleCol: {
    flex: 2,
    textAlign: 'left',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: nbSpacing.xs,
    paddingHorizontal: nbSpacing.sm,
    borderTopWidth: 1,
    borderTopColor: nbColors.gray200,
  },
  tableCell: {
    flex: 1,
    textAlign: 'center',
  },
  reassignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nbColors.primary,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    paddingVertical: nbSpacing.sm,
    gap: nbSpacing.xs,
    marginBottom: nbSpacing.md,
    ...nbShadows.sm,
  },
  placeholderBox: {
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.sm,
    backgroundColor: nbColors.gray100,
    borderRadius: nbBorderRadius.base,
    borderWidth: 1,
    borderColor: nbColors.gray200,
    marginBottom: nbSpacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    gap: nbSpacing.xs,
    marginBottom: nbSpacing.xs,
  },
  statusPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: nbSpacing.xs,
    paddingHorizontal: nbSpacing.xs,
    borderRadius: nbBorderRadius.base,
    borderWidth: 2,
    backgroundColor: nbColors.white,
  },
  plantSubLabel: {
    marginBottom: nbSpacing.sm,
  },
  plantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: nbSpacing.xs,
    borderTopWidth: 1,
    borderTopColor: nbColors.gray200,
  },
  plantRowLeft: {
    flex: 1,
    marginRight: nbSpacing.sm,
  },
  heritageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
    paddingVertical: 4,
  },
  heritageLabel: {
    flex: 1,
  },
});
