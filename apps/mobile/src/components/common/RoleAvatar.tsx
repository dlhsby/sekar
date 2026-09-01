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
import { View, Image, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { nbColors, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';
import type { UserRole } from '../../types/models.types';

/** Role → avatar accent token. */
export const ROLE_AVATAR_COLOR: Record<UserRole, string> = {
  satgas: nbColors.roleSatgas,
  linmas: nbColors.roleLinmas,
  korlap: nbColors.roleKorlap,
  admin_rayon: nbColors.roleAdminData,
  kepala_rayon: nbColors.roleKepala,
  management: nbColors.roleTop,
  admin_system: nbColors.roleAdminSys,
  superadmin: nbColors.roleSuperadmin,
  staff_kecamatan: nbColors.roleKecamatan,
};

/** Accent color for a role; falls back to the brand primary for unknown roles. */
export function roleAccent(role?: string | null): string {
  return role && role in ROLE_AVATAR_COLOR ? ROLE_AVATAR_COLOR[role as UserRole] : nbColors.primary;
}

// Opaque blend of a hex color over a white surface at the given alpha. Used
// instead of `withAlpha` for the avatar fill so the Text inside doesn't paint
// a second translucent layer over the View's translucent layer (alpha stacking
// produces a visibly darker rect around the glyphs on Android).
function opaqueBlend(hexColor: string, alpha: number): string {
  const hex = hexColor.replace('#', '');
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return hexColor;
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const blend = (fg: number): number => Math.round(fg * alpha + 255 * (1 - alpha));
  return `rgb(${blend(r)}, ${blend(g)}, ${blend(b)})`;
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
  // Opaque pale tint (accent blended over white at 22%). Using an opaque rgb
  // string — not withAlpha's rgba — so Android's Text-bg paint can stack on
  // the View's bg without producing a darker rect around the glyphs.
  const fill = opaqueBlend(accent, 0.22);
  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: fill,
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
        <Text
          allowFontScaling={false}
          style={[
            styles.initials,
            {
              fontSize: Math.round(size * 0.375),
              lineHeight: Math.round(size * 0.375),
              backgroundColor: fill,
            },
          ]}
        >
          {getInitials(name)}
        </Text>
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
  // at header (40 → 15) and team-grid (30 → 11) scales. Raw <Text> (not NBText)
  // is used here because NBText's variant-derived lineHeight conflicts with the
  // dynamic fontSize override and produces a visible Android paint artifact
  // around the glyphs ("text background"). lineHeight is set == fontSize and
  // includeFontPadding is off so the glyph fills its box exactly.
  initials: {
    color: nbColors.black,
    fontWeight: '700',
    backgroundColor: 'transparent',
    includeFontPadding: false,
    textAlignVertical: 'center',
    textAlign: 'center',
  },
});

export default RoleAvatar;
