/**
 * UserInfoCard Component
 * Slide-up card showing detailed user information
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {
  nbColors,
  nbSpacing,
  nbBorderRadius,
  nbTypography,
  nbShadows,
  nbBorders,
} from '../../constants/nbTokens';
import type { ActiveUserData } from '../../types/api.types';
import { formatTime, calculateDuration, getRelativeTime } from '../../utils/dateUtils';

interface UserInfoCardProps {
  user: ActiveUserData | null;
  visible: boolean;
  onClose: () => void;
  onViewDetails?: () => void;
}

const CARD_HEIGHT = 240;

/**
 * UserInfoCard - Bottom sheet with user details
 */
export function UserInfoCard({
  user,
  visible,
  onClose,
  onViewDetails,
}: UserInfoCardProps): React.JSX.Element {
  const translateY = React.useRef(new Animated.Value(CARD_HEIGHT)).current;

  React.useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : CARD_HEIGHT,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [visible, translateY]);

  if (!user) {
    return <View />;
  }

  const clockInTime = new Date(user.shift.clock_in_time);
  const duration = calculateDuration(clockInTime);
  const lastUpdate = user.latest_location
    ? getRelativeTime(user.latest_location.logged_at)
    : 'Tidak ada data lokasi';

  return (
    <>
      {visible && (
        <TouchableOpacity
          testID="overlay"
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        />
      )}

      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        <View style={styles.content}>
          <View style={styles.headerSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(user.full_name)}
              </Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.userName}>{user.full_name}</Text>
              <Text style={styles.userUsername}>@{user.username}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Lokasi</Text>
            <Text style={styles.infoValue}>{user.shift.area.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Masuk</Text>
            <Text style={styles.infoValue}>{formatTime(clockInTime)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Durasi kerja</Text>
            <Text style={styles.infoValue}>{duration.formatted}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Update lokasi</Text>
            <Text style={styles.infoValue}>{lastUpdate}</Text>
          </View>

          {onViewDetails && (
            <TouchableOpacity
              style={styles.detailsButton}
              onPress={onViewDetails}
            >
              <Text style={styles.detailsButtonText}>Lihat Detail</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </>
  );
}

function getInitials(fullName: string): string {
  const names = fullName.trim().split(' ');
  if (names.length === 1) {
    return names[0].substring(0, 2).toUpperCase();
  }
  return (names[0][0] + names[names.length - 1][0]).toUpperCase();
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  card: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: CARD_HEIGHT,
    backgroundColor: nbColors.surface,
    borderTopLeftRadius: nbBorderRadius.lg,
    borderTopRightRadius: nbBorderRadius.lg,
    borderTopWidth: nbBorders.base,
    borderLeftWidth: nbBorders.base,
    borderRightWidth: nbBorders.base,
    borderColor: nbColors.black,
    ...nbShadows.lg,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: nbSpacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: nbColors.gray['300'],
    borderRadius: nbBorderRadius.sm,
  },
  content: {
    paddingHorizontal: nbSpacing.md,
    paddingBottom: nbSpacing.md,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: nbSpacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: nbColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: nbSpacing.md,
  },
  avatarText: {
    color: nbColors.surface,
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.bold,
  },
  headerText: {
    flex: 1,
  },
  userName: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
    marginBottom: 2,
  },
  userUsername: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['600'],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: nbSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: nbColors.gray['200'],
  },
  infoLabel: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray['600'],
  },
  infoValue: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.black,
  },
  detailsButton: {
    marginTop: nbSpacing.md,
    backgroundColor: nbColors.primary,
    paddingVertical: nbSpacing.md,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    alignItems: 'center',
    ...nbShadows.sm,
  },
  detailsButtonText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.surface,
  },
});
