/**
 * StaffingSummarySection Component
 * Phase 2D Gap #8: Always-visible staffing summary with day type badge.
 * Three modes: city (per-rayon accordion), rayon (per-area), area (per-role).
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { NBText } from '../nb/NBText';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbRadius,
} from '../../constants/nbTokens';
import { ROLE_LABELS } from '../../constants/roles';
import type { StaffingSummaryItem, UserRole, AreaBoundary } from '../../types/models.types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface StaffingSummarySectionProps {
  items: StaffingSummaryItem[];
  isLoading: boolean;
  currentDayTypeLabel: string | null;
  selectedRayonId?: string;
  selectedAreaId?: string;
  onReassignPress?: (area: AreaBoundary) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDayTypeBadgeColor(label: string | null): string {
  if (!label) return nbColors.gray500;
  if (label.includes('Libur')) return nbColors.dangerDark;
  if (label.includes('Pekan')) return nbColors.warning;
  return nbColors.successDark;
}

function getStaffingPercentage(item: StaffingSummaryItem): number {
  const total = item.total_active + item.total_idle + item.total_outside_area + item.total_missing + item.total_offline;
  const required = item.roles.reduce((sum, r) => sum + r.total_required, 0);
  if (required === 0) return 100;
  return Math.round((item.total_active / required) * 100);
}

function getProgressColor(pct: number): string {
  if (pct >= 80) return nbColors.successDark;
  if (pct >= 50) return nbColors.warning;
  return nbColors.dangerDark;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StaffingSummarySection({
  items,
  isLoading,
  currentDayTypeLabel,
  selectedRayonId,
  selectedAreaId,
}: StaffingSummarySectionProps): React.JSX.Element {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Determine mode
  const isAreaView = Boolean(selectedAreaId);
  const isRayonView = Boolean(selectedRayonId) && !isAreaView;

  return (
    <View style={styles.container}>
      {/* Day type badge */}
      {currentDayTypeLabel && (
        <View style={[styles.dayTypeBadge, { backgroundColor: getDayTypeBadgeColor(currentDayTypeLabel) }]}>
          <MaterialCommunityIcons name="calendar" size={12} color={nbColors.white} />
          <NBText variant="caption" color="white" style={{ fontWeight: '600' }}>
            {currentDayTypeLabel}
          </NBText>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator size="small" color={nbColors.primary} />
      ) : items.length === 0 ? (
        <NBText variant="body-sm" color="gray500" style={{ fontStyle: 'italic' }}>
          Tidak ada data kepegawaian
        </NBText>
      ) : (
        items.map(item => {
          const pct = getStaffingPercentage(item);
          const isExpanded = expandedIds.has(item.id);

          return (
            <View key={item.id} style={styles.itemCard}>
              {/* Summary row */}
              <TouchableOpacity
                style={styles.itemHeader}
                onPress={() => toggleExpand(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.itemHeaderLeft}>
                  <NBText variant="body-sm" style={{ color: nbColors.black, fontWeight: 'bold' }} numberOfLines={1}>
                    {item.name}
                  </NBText>
                  <NBText variant="caption" color="gray600" style={{ marginTop: 2 }}>
                    {item.total_active} aktif / {item.roles.reduce((s, r) => s + r.total_required, 0)} dibutuhkan
                  </NBText>
                </View>
                <View style={styles.itemHeaderRight}>
                  {item.is_fully_staffed ? (
                    <MaterialCommunityIcons name="check-circle" size={18} color={nbColors.successDark} />
                  ) : (
                    <View style={styles.shortageLabel}>
                      <MaterialCommunityIcons name="alert" size={12} color={nbColors.dangerDark} />
                      <Text style={styles.shortageLabelText}>
                        Kurang {item.roles.reduce((s, r) => s + Math.max(0, r.total_required - r.active), 0)}
                      </Text>
                    </View>
                  )}
                  <MaterialCommunityIcons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={nbColors.gray500}
                  />
                </View>
              </TouchableOpacity>

              {/* Progress bar */}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(pct, 100)}%`,
                      backgroundColor: getProgressColor(pct),
                    },
                  ]}
                />
              </View>

              {/* Expanded detail: per-role breakdown */}
              {isExpanded && (
                <View style={styles.expandedContent}>
                  {item.roles.map(role => {
                    const met = role.active >= role.total_required;
                    return (
                      <View key={role.role} style={styles.roleRow}>
                        <Text style={styles.roleLabel}>
                          {ROLE_LABELS[role.role as UserRole] ?? role.role}
                        </Text>
                        <Text
                          style={[styles.roleValue, { color: met ? nbColors.successDark : nbColors.dangerDark }]}
                        >
                          {role.active}/{role.total_required}
                          {!met ? ` (Kurang ${role.total_required - role.active})` : ''}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: nbSpacing.sm,
  },
  dayTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: nbRadius.full,
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: 2,
    gap: 4,
  },
  dayTypeBadgeText: {
    color: nbColors.white,
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.semibold,
  },
  emptyText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray500,
    fontStyle: 'italic',
  },
  itemCard: {
    backgroundColor: nbColors.white,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.gray300,
    overflow: 'hidden',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: nbSpacing.sm,
  },
  itemHeaderLeft: {
    flex: 1,
    marginRight: nbSpacing.sm,
  },
  itemName: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
  itemStats: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray600,
    marginTop: 2,
  },
  itemHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  shortageLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  shortageLabelText: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.dangerDark,
    fontWeight: nbTypography.fontWeight.semibold,
  },
  progressTrack: {
    height: 4,
    backgroundColor: nbColors.gray200,
  },
  progressFill: {
    height: 4,
  },
  expandedContent: {
    padding: nbSpacing.sm,
    backgroundColor: nbColors.gray50,
    borderTopWidth: 1,
    borderTopColor: nbColors.gray200,
    gap: nbSpacing.xs,
  },
  roleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleLabel: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray600,
  },
  roleValue: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
  },
});
