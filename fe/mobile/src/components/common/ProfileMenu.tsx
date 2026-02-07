/**
 * ProfileMenu Component
 * Shared menu list for profile screens with common and custom menu items
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbTypography,
  nbSpacing,
  nbBorderRadius,
  nbShadows,
  nbBorders,
} from '../../constants/nbTokens';
import { NBCard } from '../nb';

export interface MenuItem {
  key: string;
  icon: string;
  label: string;
  onPress: () => void;
  testID?: string;
}

interface ProfileMenuProps {
  /**
   * Additional menu items specific to the role
   * Will be inserted before "About" menu item
   */
  extraItems?: MenuItem[];

  /**
   * Handler for change password
   */
  onChangePassword: () => void;

  /**
   * Handler for about app
   */
  onAbout: () => void;

  /**
   * Optional handler for settings
   */
  onSettings?: () => void;

  testID?: string;
}

/**
 * ProfileMenu Component
 */
export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  extraItems = [],
  onChangePassword,
  onAbout,
  onSettings,
  testID = 'profile-menu',
}) => {
  // Build complete menu items list
  const menuItems: MenuItem[] = [
    {
      key: 'change-password',
      icon: 'lock-outline',
      label: 'Ubah Password',
      onPress: onChangePassword,
      testID: 'change-password-button',
    },
    ...extraItems,
    {
      key: 'about',
      icon: 'information-outline',
      label: 'Tentang Aplikasi',
      onPress: onAbout,
      testID: 'about-button',
    },
  ];

  // Add settings if provided
  if (onSettings) {
    menuItems.push({
      key: 'settings',
      icon: 'cog-outline',
      label: 'Pengaturan',
      onPress: onSettings,
      testID: 'settings-button',
    });
  }

  return (
    <NBCard variant="elevated" style={styles.menuContainer} testID={testID}>
      {menuItems.map((item, index) => (
        <React.Fragment key={item.key}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={item.onPress}
            activeOpacity={0.7}
            testID={item.testID}
            accessibilityRole="button"
            accessibilityLabel={item.label}
          >
            <MaterialCommunityIcons
              name={item.icon}
              size={24}
              color={nbColors.gray[600]}
              style={styles.menuIcon}
            />
            <Text style={styles.menuText}>{item.label}</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={nbColors.gray[600]}
            />
          </TouchableOpacity>

          {/* Divider between items (but not after last item) */}
          {index < menuItems.length - 1 && <View style={styles.menuDivider} />}
        </React.Fragment>
      ))}
    </NBCard>
  );
};

const styles = StyleSheet.create({
  menuContainer: {
    backgroundColor: nbColors.white,
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    overflow: 'hidden',
    ...nbShadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nbSpacing.md,
    paddingHorizontal: nbSpacing.md,
  },
  menuIcon: {
    marginRight: nbSpacing.md,
  },
  menuText: {
    flex: 1,
    fontSize: nbTypography.fontSize.base,
    color: nbColors.black,
  },
  menuDivider: {
    height: nbBorders.thin,
    backgroundColor: nbColors.black,
    marginLeft: nbSpacing.md + 24 + nbSpacing.md, // icon width + margins
  },
});
