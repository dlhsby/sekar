/**
 * PersonnelGroupCard — role-grouped personnel summary for the monitoring peek
 * sheet "Daftar Petugas" (Phase 4 M3). One card per role the supervisor handles:
 * role-tinted icon + label + headcount + a compact status breakdown. Tapping
 * opens a list modal of that group's petugas (each row drills into UserDetailSheet).
 */

import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../nb/NBText';
import { roleAccent } from '../common/RoleAvatar';
import { getStatusColor } from '../../utils/mapUtils';
import { ROLE_LABELS } from '../../constants/roles';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows, withAlpha } from '../../constants/nbTokens';
import type { LiveUser, TrackingStatus, UserRole } from '../../types/models.types';

const ROLE_ICON: Record<string, string> = {
  satgas: 'account-hard-hat',
  linmas: 'shield-account',
  korlap: 'account-tie',
  kepala_rayon: 'account-star',
  admin_data: 'account-cog',
};

// Statuses shown in the compact breakdown row (offline is omitted — it's the
// "no fix ever" bucket and isn't actionable at a glance).
const BREAKDOWN_STATUSES: TrackingStatus[] = ['active', 'inactive', 'outside_area', 'missing'];

export interface PersonnelGroup {
  role: string;
  users: LiveUser[];
}

interface PersonnelGroupCardProps {
  group: PersonnelGroup;
  onPress: (group: PersonnelGroup) => void;
}

export const PersonnelGroupCard = React.memo(function PersonnelGroupCard({
  group,
  onPress,
}: PersonnelGroupCardProps): React.JSX.Element {
  const accent = roleAccent(group.role);
  const label = ROLE_LABELS[group.role as UserRole] ?? group.role;
  const icon = ROLE_ICON[group.role] ?? 'account-group';

  // Always surface every status (including zeros) so the split is stable and
  // comparable across role cards — a missing dot would read as "no data".
  const breakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of group.users) {
      counts[u.status] = (counts[u.status] ?? 0) + 1;
    }
    return BREAKDOWN_STATUSES.map(status => ({ status, count: counts[status] ?? 0 }));
  }, [group.users]);

  const handlePress = useCallback(() => onPress(group), [onPress, group]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${group.users.length} petugas`}
      testID={`personnel-group-${group.role}`}
    >
      <View
        style={[styles.iconChip, { backgroundColor: withAlpha(accent, 0.14), borderColor: accent }]}
      >
        <MaterialCommunityIcons name={icon} size={20} color={accent} />
      </View>

      <View style={styles.info}>
        <NBText variant="body-sm" color="black" numberOfLines={1} style={styles.label}>
          {label}
        </NBText>
        <View style={styles.breakdownRow}>
          {breakdown.map(({ status, count }) => (
            <View key={status} style={styles.breakdownItem}>
              <View style={[styles.dot, { backgroundColor: getStatusColor(status) }]} />
              <NBText
                variant="caption"
                color={count > 0 ? 'gray700' : 'gray400'}
                style={styles.breakdownCount}
              >
                {count}
              </NBText>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.right}>
        <View style={styles.countBlock}>
          <NBText variant="h3" color="black">{group.users.length}</NBText>
          <NBText variant="caption" color="gray500" style={styles.countLabel}>total</NBText>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={18} color={nbColors.gray400} />
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.sm,
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.sm,
    ...nbShadows.sm,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  label: {
    fontWeight: '700',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.sm,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: nbColors.black,
  },
  breakdownCount: {
    fontWeight: '600',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  countBlock: {
    alignItems: 'center',
  },
  countLabel: {
    fontSize: 10,
    marginTop: -2,
  },
});

export default PersonnelGroupCard;
