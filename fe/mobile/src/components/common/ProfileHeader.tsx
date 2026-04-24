/**
 * ProfileHeader Component
 * Shared header for profile screens showing avatar, name, username, and role badge
 */

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import {
  nbColors,
  nbTypography,
  nbSpacing,
  nbBorderRadius,
  nbShadows,
  nbBorders,
} from '../../constants/nbTokens';
import { ROLE_LABELS } from '../../constants/roles';
import type { User, UserRole } from '../../types/models.types';

interface ProfileHeaderProps {
  user: User | null;
  testID?: string;
}

/**
 * Get user initials for avatar
 */
const getUserInitials = (fullName?: string): string => {
  if (!fullName) {
    return '??';
  }
  const names = fullName.split(' ');
  if (names.length >= 2) {
    return `${names[0][0]}${names[1][0]}`.toUpperCase();
  }
  return fullName.substring(0, 2).toUpperCase();
};

/**
 * Get role badge text
 */
const getRoleBadge = (role?: string): string => {
  if (!role) return 'Pengguna';
  return ROLE_LABELS[role as UserRole] || 'Pengguna';
};

/**
 * ProfileHeader Component
 */
export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user, testID = 'profile-header' }) => {
  return (
    <View style={styles.header} testID={testID}>
      <View style={styles.avatarContainer}>
        {user?.profile_picture_url ? (
          <Image
            source={{ uri: user.profile_picture_url }}
            style={styles.avatarImage}
            accessibilityLabel="Foto profil"
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getUserInitials(user?.full_name)}</Text>
          </View>
        )}
      </View>
      <Text style={styles.fullName}>{user?.full_name || 'Pengguna'}</Text>
      <Text style={styles.username}>@{user?.username || 'unknown'}</Text>
      <View style={styles.roleBadge}>
        <Text style={styles.roleBadgeText}>{getRoleBadge(user?.role)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: nbSpacing.xl,
    backgroundColor: nbColors.white,
    marginBottom: nbSpacing.md,
    borderBottomWidth: nbBorders.base,
    borderBottomColor: nbColors.black,
  },
  avatarContainer: {
    marginBottom: nbSpacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: nbBorderRadius.full,
    backgroundColor: nbColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    ...nbShadows.md,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: nbBorderRadius.full,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    ...nbShadows.md,
  },
  avatarText: {
    fontSize: nbTypography.fontSize['3xl'],
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.white,
  },
  fullName: {
    fontSize: nbTypography.fontSize.xl,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    marginBottom: nbSpacing.xs,
  },
  username: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray['600'],
    marginBottom: nbSpacing.sm,
  },
  roleBadge: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.xs,
    backgroundColor: nbColors.primary,
    borderRadius: nbBorderRadius.sm,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
  },
  roleBadgeText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.white,
  },
});
