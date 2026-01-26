/**
 * NBTab - Neo Brutalism Tab Component
 *
 * Tab navigation with bold borders and clear active state.
 * Used for switching between content sections.
 *
 * @see specs/ui-ux/neo-brutalism.md
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbTypography,
  nbTouchTarget,
} from '../../constants/nbTokens';

export interface NBTabItem {
  /** Unique key for the tab */
  key: string;
  /** Tab label */
  label: string;
  /** Optional badge count */
  count?: number;
  /** Icon component (optional) */
  icon?: React.ReactNode;
}

export interface NBTabProps {
  /** Array of tab items */
  tabs: NBTabItem[];
  /** Currently active tab key */
  activeTab: string;
  /** Tab change handler */
  onTabChange: (key: string) => void;
  /** Custom container style */
  style?: ViewStyle;
  /** Custom tab style */
  tabStyle?: ViewStyle;
  /** Custom active tab style */
  activeTabStyle?: ViewStyle;
  /** Custom text style */
  textStyle?: TextStyle;
  /** Custom active text style */
  activeTextStyle?: TextStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Neo Brutalism styled tab navigation
 *
 * @example
 * <NBTab
 *   tabs={[
 *     { key: 'tasks', label: 'TUGAS', count: 3 },
 *     { key: 'reports', label: 'LAPORAN', count: 5 },
 *   ]}
 *   activeTab={activeTab}
 *   onTabChange={setActiveTab}
 * />
 */
export const NBTab: React.FC<NBTabProps> = ({
  tabs,
  activeTab,
  onTabChange,
  style,
  tabStyle,
  activeTabStyle,
  textStyle,
  activeTextStyle,
  testID,
}) => {
  const handleTabPress = useCallback(
    (key: string) => {
      if (key !== activeTab) {
        if (Platform.OS !== 'web') {
          ReactNativeHapticFeedback.trigger('impactLight', {
            enableVibrateFallback: true,
            ignoreAndroidSystemSettings: false,
          });
        }
        onTabChange(key);
      }
    },
    [activeTab, onTabChange],
  );

  return (
    <View style={[styles.container, style]} testID={testID}>
      {tabs.map((tab, index) => {
        const isActive = tab.key === activeTab;
        const isFirst = index === 0;
        const isLast = index === tabs.length - 1;

        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.8}
            onPress={() => handleTabPress(tab.key)}
            accessible
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${tab.label}${tab.count ? `, ${tab.count} items` : ''}`}
            testID={testID ? `${testID}-${tab.key}` : undefined}
            style={[
              styles.tab,
              isFirst && styles.firstTab,
              isLast && styles.lastTab,
              isActive && styles.activeTab,
              tabStyle,
              isActive && activeTabStyle,
            ]}
          >
            <View style={styles.tabContent}>
              {tab.icon && <View style={styles.icon}>{tab.icon}</View>}
              <Text
                style={[
                  styles.tabText,
                  isActive && styles.activeTabText,
                  textStyle,
                  isActive && activeTextStyle,
                ]}
              >
                {tab.label}
              </Text>
              {tab.count !== undefined && tab.count > 0 && (
                <View
                  style={[styles.badge, isActive && styles.activeBadge]}
                  testID={testID ? `${testID}-${tab.key}-count` : undefined}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      isActive && styles.activeBadgeText,
                    ]}
                  >
                    {tab.count > 99 ? '99+' : tab.count}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: nbBorders.default,
    borderColor: nbColors.black,
    backgroundColor: nbColors.white,
  },
  tab: {
    flex: 1,
    minHeight: nbTouchTarget.minHeight,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: nbColors.white,
    borderRightWidth: nbBorders.default,
    borderRightColor: nbColors.black,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
  },
  firstTab: {
    // No special styling needed
  },
  lastTab: {
    borderRightWidth: 0,
  },
  activeTab: {
    backgroundColor: nbColors.primary,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: nbSpacing.sm,
  },
  icon: {
    marginRight: nbSpacing.xs,
  },
  tabText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeTabText: {
    color: nbColors.white,
  },
  badge: {
    backgroundColor: nbColors.gray[200],
    paddingHorizontal: nbSpacing.xs,
    paddingVertical: 2,
    borderRadius: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadge: {
    backgroundColor: nbColors.white,
  },
  badgeText: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
  activeBadgeText: {
    color: nbColors.primary,
  },
});

export default NBTab;
