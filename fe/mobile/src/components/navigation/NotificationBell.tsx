/**
 * NotificationBell — Phase 4 M3d (NOTIF-1).
 *
 * Bell icon + unread count badge. Mounted in the right slot of
 * `FieldHomeHeader` (alongside the online/sync/pending status badge). Tap
 * navigates to the Notifications inbox screen.
 *
 * Reads `unreadCount` from the `notifications` slice — already populated by
 * the FCM foreground handler (it dispatches `addNotification` on every
 * incoming push) and on inbox open (server refresh).
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../store/hooks';
import { selectUnreadCount } from '../../store/slices/notificationsSlice';
import { nbBorders, nbColors } from '../../constants/nbTokens';

// Visible bottom-tab roots (uniform across all roles — see UNIFORM_TAB_CONFIG in
// MainNavigator). The bell only renders on these no-back headers, so the inbox back
// target is one of them; anything else falls back to Home.
const ORIGIN_TABS = new Set(['Home', 'Menu', 'Profile']);

export const NotificationBell: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const unreadCount = useAppSelector(selectUnreadCount);

  const display = unreadCount > 99 ? '99+' : String(unreadCount);

  // Record the tab the bell is tapped from so the inbox's back button can
  // return there instead of defaulting to Home. Only accept real visible-tab
  // route names (the bell only renders on tab roots, but guard defensively so a
  // stray focused-route name can never become an unreachable back target).
  const openInbox = () => {
    const nav = navigation as unknown as {
      getState?: () => { index: number; routes: Array<{ name: string }> };
      navigate: (name: string, params?: { origin?: string }) => void;
    };
    const state = nav.getState?.();
    const focused = state ? state.routes[state.index]?.name : undefined;
    const origin = focused && ORIGIN_TABS.has(focused) ? focused : undefined;
    nav.navigate('Notifications', { origin });
  };

  return (
    <TouchableOpacity
      onPress={openInbox}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={
        unreadCount > 0
          ? t('notifications:bell.unreadLabel', { count: unreadCount })
          : t('notifications:bell.label')
      }
      testID="notification-bell"
    >
      <MaterialCommunityIcons name="bell-outline" size={22} color={nbColors.black} />
      {unreadCount > 0 ? (
        <View style={styles.badge} testID="notification-bell-badge">
          <Text style={styles.badgeText} numberOfLines={1}>
            {display}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 0,
    borderWidth: nbBorders?.widthThin ?? 1,
    borderColor: nbColors.black,
    backgroundColor: nbColors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: nbColors.white,
    lineHeight: 10,
  },
});

export default NotificationBell;
