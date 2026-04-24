/**
 * BoundaryDetailModal Component
 * Phase 2D Gap #2: Shows rayon/area staffing details when center marker is tapped.
 * Rayon mode: list of areas with understaffed highlighted.
 * Area mode: per-role staffing breakdown table.
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
              color={isRayon ? '#2563EB' : '#D97706'}
            />
            <Text style={styles.headerTitle}>
              {isRayon ? rayonData!.name : areaData!.name}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={20} color={nbColors.gray['700']} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            {/* Rayon mode: list areas */}
            {isRayon && rayonData && (
              <>
                <Text style={styles.sectionLabel}>
                  {rayonData.areas.length} Area
                  {rayonData.understaffed_area_count > 0
                    ? ` (${rayonData.understaffed_area_count} kurang staf)`
                    : ''}
                </Text>
                {rayonData.areas.map(area => (
                  <View
                    key={area.id}
                    style={[
                      styles.areaRow,
                      area.is_understaffed && styles.areaRowUnderstaffed,
                    ]}
                  >
                    <View style={styles.areaRowLeft}>
                      <Text style={styles.areaName}>{area.name}</Text>
                      <Text style={styles.areaStats}>
                        {area.total_active}/{area.total_required} aktif
                      </Text>
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
                  <Text style={styles.summaryLabel}>Total Aktif</Text>
                  <Text style={styles.summaryValue}>
                    {areaData.total_active}/{areaData.total_required}
                  </Text>
                </View>

                <Text style={styles.sectionLabel}>Detail per Peran</Text>
                <View style={styles.staffingTable}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, styles.tableRoleCol]}>Peran</Text>
                    <Text style={styles.tableHeaderCell}>Dibutuhkan</Text>
                    <Text style={styles.tableHeaderCell}>Aktif</Text>
                    <Text style={styles.tableHeaderCell}>Delta</Text>
                  </View>
                  {(areaData.staffing ?? []).map(item => {
                    const delta = item.active - item.required;
                    return (
                      <View key={item.role} style={styles.tableRow}>
                        <Text style={[styles.tableCell, styles.tableRoleCol]}>
                          {ROLE_LABELS[item.role as UserRole] ?? item.role}
                        </Text>
                        <Text style={styles.tableCell}>{item.required}</Text>
                        <Text style={styles.tableCell}>{item.active}</Text>
                        <Text
                          style={[
                            styles.tableCell,
                            { color: delta >= 0 ? nbColors.successDark : nbColors.dangerDark },
                          ]}
                        >
                          {delta >= 0 ? `+${delta}` : delta}
                        </Text>
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
                    <Text style={styles.reassignBtnText}>Reassign Petugas</Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    borderBottomColor: nbColors.gray['300'],
    gap: nbSpacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
  closeBtn: {
    padding: nbSpacing.xs,
  },
  body: {
    padding: nbSpacing.md,
  },
  sectionLabel: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.gray['700'],
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
    backgroundColor: nbColors.gray['100'],
  },
  areaRowUnderstaffed: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: nbColors.dangerDark,
  },
  areaRowLeft: {
    flex: 1,
  },
  areaName: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
  },
  areaStats: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['600'],
    marginTop: 2,
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
    backgroundColor: nbColors.gray['100'],
    borderRadius: nbBorderRadius.base,
  },
  summaryLabel: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.gray['700'],
  },
  summaryValue: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
  staffingTable: {
    borderWidth: nbBorders.thin,
    borderColor: nbColors.gray['300'],
    borderRadius: nbBorderRadius.base,
    overflow: 'hidden',
    marginBottom: nbSpacing.md,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: nbColors.gray['200'],
    paddingVertical: nbSpacing.xs,
    paddingHorizontal: nbSpacing.sm,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.gray['700'],
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
    borderTopColor: nbColors.gray['200'],
  },
  tableCell: {
    flex: 1,
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['800'],
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
  reassignBtnText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
});
