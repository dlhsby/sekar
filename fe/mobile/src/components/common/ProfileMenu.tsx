/**
 * ProfileMenu — Design System v2.1 grouped menu (PRF-1).
 *
 * Two titled sections ("Akun" / "Aplikasi") of chip-icon rows with dashed
 * dividers. Logout is rendered as a danger row at the end of the Aplikasi group.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../nb/NBText';
import {
  nbColors,
  nbSpacing,
  nbRadius,
  nbBorders,
  nbShadows,
  withAlpha,
} from '../../constants/nbTokens';

export interface MenuItem {
  key: string;
  icon: string;
  label: string;
  onPress: () => void;
  /** Chip background tint (defaults to gray100). */
  chipColor?: string;
  /** Danger styling: red label, no chevron. */
  danger?: boolean;
  testID?: string;
}

interface ProfileMenuProps {
  onEditProfile: () => void;
  onChangePassword: () => void;
  /** Field-only — row hidden when omitted. */
  onShiftHistory?: () => void;
  onMySchedule?: () => void;
  onSettings: () => void;
  onDiagnostics: () => void;
  onAbout: () => void;
  onLogout: () => void;
  testID?: string;
}

function MenuRow({ item, isLast }: { item: MenuItem; isLast: boolean }): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.row, !isLast && styles.rowDivider]}
      onPress={item.onPress}
      activeOpacity={0.7}
      testID={item.testID}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <View
        style={[
          styles.chip,
          { backgroundColor: item.chipColor ?? nbColors.gray100 },
        ]}
      >
        <MaterialCommunityIcons
          name={item.icon}
          size={16}
          color={item.danger ? nbColors.danger : nbColors.black}
        />
      </View>
      <NBText
        variant="body-sm"
        color={item.danger ? 'danger' : 'black'}
        style={styles.label}
      >
        {item.label}
      </NBText>
      {!item.danger && (
        <MaterialCommunityIcons name="chevron-right" size={18} color={nbColors.gray400} />
      )}
    </TouchableOpacity>
  );
}

function MenuGroup({ title, items }: { title: string; items: MenuItem[] }): React.JSX.Element {
  return (
    <View style={styles.group}>
      <NBText variant="mono-sm" color="gray600" uppercase style={styles.groupTitle}>
        {title}
      </NBText>
      <View style={styles.groupCard}>
        {items.map((item, index) => (
          <MenuRow key={item.key} item={item} isLast={index === items.length - 1} />
        ))}
      </View>
    </View>
  );
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  onEditProfile,
  onChangePassword,
  onShiftHistory,
  onMySchedule,
  onSettings,
  onDiagnostics,
  onAbout,
  onLogout,
  testID = 'profile-menu',
}) => {
  const { t } = useTranslation();

  const akunItems: MenuItem[] = [
    {
      key: 'edit-profile',
      icon: 'account-edit-outline',
      label: t('profile:menu.editProfile'),
      chipColor: nbColors.bgAccentMint,
      onPress: onEditProfile,
      testID: 'edit-profile-button',
    },
    {
      key: 'change-password',
      icon: 'lock-outline',
      label: t('profile:menu.changePassword'),
      chipColor: nbColors.bgAccentYellow,
      onPress: onChangePassword,
      testID: 'change-password-button',
    },
    ...(onMySchedule
      ? [
          {
            key: 'my-schedule',
            icon: 'calendar-month-outline',
            label: t('profile:menu.mySchedule'),
            chipColor: nbColors.bgAccentMint,
            onPress: onMySchedule,
            testID: 'my-schedule-button',
          },
        ]
      : []),
    ...(onShiftHistory
      ? [
          {
            key: 'shift-history',
            icon: 'clock-outline',
            label: t('profile:menu.shiftHistory'),
            chipColor: nbColors.bgAccentPink,
            onPress: onShiftHistory,
            testID: 'shift-history-button',
          },
        ]
      : []),
  ];

  const aplikasiItems: MenuItem[] = [
    {
      key: 'settings',
      icon: 'cog-outline',
      label: t('profile:menu.settings'),
      onPress: onSettings,
      testID: 'settings-button',
    },
    {
      key: 'diagnostics',
      icon: 'stethoscope',
      label: t('profile:menu.diagnostics'),
      chipColor: withAlpha(nbColors.info, 0.18),
      onPress: onDiagnostics,
      testID: 'diagnostics-button',
    },
    {
      key: 'about',
      icon: 'information-outline',
      label: t('profile:menu.about'),
      onPress: onAbout,
      testID: 'about-button',
    },
    {
      key: 'logout',
      icon: 'logout',
      label: t('profile:menu.logout'),
      chipColor: withAlpha(nbColors.danger, 0.18),
      danger: true,
      onPress: onLogout,
      testID: 'logout-button',
    },
  ];

  return (
    <View testID={testID}>
      <MenuGroup title={t('profile:menu.account')} items={akunItems} />
      <MenuGroup title={t('profile:menu.application')} items={aplikasiItems} />
    </View>
  );
};

const styles = StyleSheet.create({
  group: {
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
  },
  groupTitle: {
    letterSpacing: 0.5,
    marginBottom: nbSpacing.sm,
    marginLeft: nbSpacing.xs,
  },
  groupCard: {
    backgroundColor: nbColors.white,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    overflow: 'hidden',
    ...nbShadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.md,
    gap: nbSpacing.sm,
  },
  rowDivider: {
    borderBottomWidth: 1.5,
    borderBottomColor: nbColors.gray300,
    borderStyle: 'dashed',
  },
  chip: {
    width: 30,
    height: 30,
    borderRadius: nbRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    flex: 1,
    fontWeight: '600',
  },
});
