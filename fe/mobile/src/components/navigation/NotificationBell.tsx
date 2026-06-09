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
import { useAppSelector } from '../../store/hooks';
import { selectUnreadCount } from '../../store/slices/notificationsSlice';
import { nbBorders, nbColors } from '../../constants/nbTokens';

export const NotificationBell: React.FC = () => {
  const navigation = useNavigation();
  const unreadCount = useAppSelector(selectUnreadCount);

  const display = unreadCount > 99 ? '99+' : String(unreadCount);

  // Record the tab the bell is tapped from so the inbox's back button can
  // return there instead of defaulting to Home.
  const openInbox = () => {
    const nav = navigation as unknown as {
      getState?: () => { index: number; routes: Array<{ name: string }> };
      navigate: (name: string, params?: { origin?: string }) => void;
    };
    const state = nav.getState?.();
    const origin = state ? state.routes[state.index]?.name : undefined;
    nav.navigate('Notifications', { origin });
  };

  return (
    <TouchableOpacity
      onPress={openInbox}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={
        unreadCount > 0
          ? `Notifikasi (${unreadCount} belum dibaca)`
          : 'Notifikasi'
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
