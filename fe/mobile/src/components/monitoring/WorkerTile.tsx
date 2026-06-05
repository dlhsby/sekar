/**
 * WorkerTile — clickable personnel tile for the monitoring peek sheet
 * "Daftar Petugas" list (Phase 4 M3). Replaces the bespoke status-dot row with a
 * token-driven NB card: role avatar + name/role·area + dotted presence pill +
 * last-seen. Tapping opens the UserDetailSheet (via `onPress`).
 */

import React, { useCallback } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../nb/NBText';
import { StatusPill } from '../home/StatusPill';
import { RoleAvatar } from '../common/RoleAvatar';
import { userAxes, presenceActivityPill } from '../../utils/statusHelpers';
import { ROLE_LABELS } from '../../constants/roles';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';
import type { LiveUser, UserRole } from '../../types/models.types';

const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

function formatLastSeen(iso: string | null): string | null {
  if (!iso) { return null; }
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

interface WorkerTileProps {
  user: LiveUser;
  onPress?: (user: LiveUser) => void;
}

export const WorkerTile = React.memo(function WorkerTile({
  user,
  onPress,
}: WorkerTileProps): React.JSX.Element {
  const { activity, location } = userAxes(user);
  const { tone, label } = presenceActivityPill(activity);
  const roleLabel = ROLE_LABELS[user.role as UserRole] ?? user.role;
  const lastSeen = formatLastSeen(user.last_update);
  const isStale = user.last_update
    ? Date.now() - new Date(user.last_update).getTime() > STALE_THRESHOLD_MS
    : false;

  const handlePress = useCallback(() => onPress?.(user), [onPress, user]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${user.full_name}, ${label}`}
      testID={`worker-tile-${user.id}`}
    >
      <RoleAvatar name={user.full_name} role={user.role} size={40} />

      <View style={styles.info}>
        <NBText variant="body-sm" color="black" numberOfLines={1} style={styles.name}>
          {user.full_name}
        </NBText>
        <NBText variant="caption" color="gray500" numberOfLines={1}>
          {roleLabel} · {user.area_name}
        </NBText>
        <View style={styles.metaRow}>
          <StatusPill dot tone={tone} label={label} />
          {location === 'luar_area' ? (
            <View style={styles.outsideChip}>
              <MaterialCommunityIcons name="map-marker-alert" size={11} color={nbColors.statusOutside} />
              <NBText variant="caption" color="statusOutside" style={styles.outsideLabel}>
                Luar area
              </NBText>
            </View>
          ) : null}
          {isStale ? (
            <View style={styles.staleChip}>
              <MaterialCommunityIcons name="wifi-off" size={11} color={nbColors.statusMissing} />
              <NBText variant="caption" color="statusMissing" style={styles.staleLabel}>
                GPS mati
              </NBText>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.right}>
        {lastSeen ? (
          <NBText variant="mono-sm" color="gray400" style={styles.lastSeen}>
            {lastSeen}
          </NBText>
        ) : null}
        {onPress ? (
          <MaterialCommunityIcons name="chevron-right" size={18} color={nbColors.gray400} />
        ) : null}
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
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
    marginTop: 2,
  },
  staleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  staleLabel: {
    fontSize: 10,
  },
  outsideChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  outsideLabel: {
    fontSize: 10,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  lastSeen: {
    fontSize: 10,
  },
});

export default WorkerTile;
