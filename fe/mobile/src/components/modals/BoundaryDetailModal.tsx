/**
 * BoundaryDetailModal Component
 * Phase 2D Gap #2: Shows rayon/area staffing details when center marker is tapped.
 * Rayon mode: list of areas with understaffed highlighted.
 * Area mode: per-role staffing breakdown table.
 */

import React from 'react';
import {
  View,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
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
import type { RayonBoundary, AreaBoundary, UserRole } from '../../types/models.types';

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
  if (!data) {
    return (
      <Modal visible={false} transparent>
        <View />
      </Modal>
    );
  }

  const isRayon = type === 'rayon';
  const rayonData = isRayon ? (data as RayonBoundary) : null;
  const areaData = !isRayon ? (data as AreaBoundary) : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
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

          <ScrollView style={styles.body}>
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
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: nbColors.bgOverlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: nbColors.white,
    borderTopLeftRadius: nbBorderRadius.lg,
    borderTopRightRadius: nbBorderRadius.lg,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    maxHeight: '70%',
    ...nbShadows.lg,
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
    padding: nbSpacing.md,
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
});
