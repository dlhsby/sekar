/**
 * RoleAvatar — Design System v2.1 avatar primitive.
 *
 * Renders the user's profile photo when `photoUrl` is set; otherwise falls back
 * to role-tinted initials (role-accent fill at 0.22 alpha + role-accent border +
 * BLACK initials). The pale tint keeps black text ≥ WCAG AA for every role accent
 * (worst case ~10.9:1) — do NOT switch to a solid role fill (white-on-sage/yellow
 * would fail).
 *
 * Decorative by default (`accessibilityElementsHidden`): the name/role is always
 * announced by adjacent text (header) or an aggregate count (team grid), so the
 * avatar itself is redundant for screen readers.
 */

import React from 'react';
import { View, Image, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { NBText } from '../nb/NBText';
import { nbColors, nbBorders, nbRadius, nbShadows, withAlpha } from '../../constants/nbTokens';
import type { UserRole } from '../../types/models.types';

/** Role → avatar accent token. */
export const ROLE_AVATAR_COLOR: Record<UserRole, string> = {
  satgas: nbColors.roleSatgas,
  linmas: nbColors.roleLinmas,
  korlap: nbColors.roleKorlap,
  admin_data: nbColors.roleAdminData,
  kepala_rayon: nbColors.roleKepala,
  top_management: nbColors.roleTop,
  admin_system: nbColors.roleAdminSys,
  superadmin: nbColors.roleSuperadmin,
  staff_kecamatan: nbColors.roleKecamatan,
};

/** Accent color for a role; falls back to the brand primary for unknown roles. */
export function roleAccent(role?: string | null): string {
  return role && role in ROLE_AVATAR_COLOR ? ROLE_AVATAR_COLOR[role as UserRole] : nbColors.primary;
}

/** First + last initial from a full name, e.g. "Budi Santoso" → "BS". */
export function getInitials(name?: string | null): string {
  if (!name) {
    return '?';
  }
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

interface RoleAvatarProps {
  name?: string | null;
  role?: string | null;
  /** When set, the photo replaces the initials fallback. */
  photoUrl?: string | null;
  /** Square dimension in px (default 40). */
  size?: number;
  /** Corner radius (default `nbRadius.base`; pass `nbRadius.full` for a circle). */
  radius?: number;
  /** Hard-edge shadow under the avatar (default false). */
  withShadow?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function RoleAvatar({
  name,
  role,
  photoUrl,
  size = 40,
  radius = nbRadius.base,
  withShadow = false,
  style,
}: RoleAvatarProps): React.JSX.Element {
  const accent = roleAccent(role);
  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: withAlpha(accent, 0.22),
          borderColor: accent,
        },
        withShadow && nbShadows.xs,
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={{ width: size, height: size, borderRadius: radius }}
          resizeMode="cover"
        />
      ) : (
        <NBText variant="mono-sm" color="black" style={[styles.initials, { fontSize: Math.round(size * 0.375) }]}>
          {getInitials(name)}
        </NBText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: nbBorders.widthBase,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  // Initials are sized relative to the box (≈0.375×) so the same primitive works
  // at header (40 → 15) and team-grid (30 → 11) scales.
  initials: { fontWeight: '700' },
});

export default RoleAvatar;
