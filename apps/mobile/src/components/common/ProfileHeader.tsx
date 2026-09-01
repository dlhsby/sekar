/**
 * ProfileHeader — Design System v2.1 identity strip (PRF-1).
 *
 * Compact horizontal hero: role-colored RoleAvatar on the left, with name,
 * a "ROLE · RAYON" mono line, and a "@username · sejak year" meta line stacked
 * on the right. Kept low-profile to avoid wasted vertical space.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NBText } from '../nb/NBText';
import { RoleAvatar } from './RoleAvatar';
import {
  nbColors,
  nbSpacing,
  nbRadius,
  nbBorders,
  nbShadows,
} from '../../constants/nbTokens';
import { ROLE_LABELS } from '../../constants/roles';
import type { User, UserRole } from '../../types/models.types';

interface ProfileHeaderProps {
  user: User | null;
  testID?: string;
}

function getRoleLabel(role: string | null | undefined, defaultLabel: string): string {
  if (!role) {
    return defaultLabel;
  }
  return ROLE_LABELS[role as UserRole] ?? defaultLabel;
}

function getJoinedYear(createdAt?: string): string | null {
  if (!createdAt) {
    return null;
  }
  const year = new Date(createdAt).getFullYear();
  return Number.isFinite(year) ? String(year) : null;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  testID = 'profile-header',
}) => {
  const { t } = useTranslation();
  const defaultUserLabel = t('profile:header.user');
  const districtName = user?.district?.name ?? null;
  const joinedYear = getJoinedYear(user?.created_at);

  const roleLine = districtName
    ? `${getRoleLabel(user?.role, defaultUserLabel)} · ${districtName}`
    : getRoleLabel(user?.role, defaultUserLabel);

  const metaParts = [`@${user?.username ?? 'unknown'}`];
  if (joinedYear) {
    metaParts.push(`${t('profile:header.joinedSince')} ${joinedYear}`);
  }

  return (
    <View style={styles.card} testID={testID}>
      <RoleAvatar
        name={user?.full_name}
        role={user?.role}
        photoUrl={user?.profile_picture_url}
        size={52}
        withShadow
      />
      <View style={styles.info}>
        <NBText variant="h3" color="black" numberOfLines={1}>
          {user?.full_name || defaultUserLabel}
        </NBText>
        <NBText variant="mono-sm" color="gray700" uppercase numberOfLines={1} style={styles.roleLine}>
          {roleLine}
        </NBText>
        <NBText variant="mono-sm" color="gray500" numberOfLines={1}>
          {metaParts.join(' · ')}
        </NBText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.md,
    backgroundColor: nbColors.bgAccentMint,
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
    paddingVertical: nbSpacing.md,
    paddingHorizontal: nbSpacing.md,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    ...nbShadows.sm,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  roleLine: {
    letterSpacing: 0.5,
  },
});
