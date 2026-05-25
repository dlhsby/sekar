/**
 * UserInfoCard Component
 * Slide-up card showing detailed user information
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { NBText } from '../nb/NBText';
import {
  nbColors,
  nbSpacing,
  nbBorderRadius,
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
    translateY.stopAnimation();
    Animated.spring(translateY, {
      toValue: visible ? 0 : CARD_HEIGHT,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [visible, translateY]);

  // Stop on unmount — without this, a card that unmounts while the
  // spring is still in flight (typical when tapping a marker then
  // immediately panning the map elsewhere) leaves the JS animation
  // pointing at a freed native node.
  React.useEffect(() => {
    return () => {
      translateY.stopAnimation();
    };
  }, [translateY]);

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
              <NBText variant="body-lg" color="white">
                {getInitials(user.full_name)}
              </NBText>
            </View>
            <View style={styles.headerText}>
              <NBText variant="body-lg" style={{ color: nbColors.black, marginBottom: 2 }}>
                {user.full_name}
              </NBText>
              <NBText variant="body-sm" color="gray600">
                @{user.username}
              </NBText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <NBText variant="body-sm" color="gray600">
              Lokasi
            </NBText>
            <NBText variant="body-sm" style={{ color: nbColors.black, fontWeight: '500' }}>
              {user.shift.area.name}
            </NBText>
          </View>

          <View style={styles.infoRow}>
            <NBText variant="body-sm" color="gray600">
              Masuk
            </NBText>
            <NBText variant="body-sm" style={{ color: nbColors.black, fontWeight: '500' }}>
              {formatTime(clockInTime)}
            </NBText>
          </View>

          <View style={styles.infoRow}>
            <NBText variant="body-sm" color="gray600">
              Durasi kerja
            </NBText>
            <NBText variant="body-sm" style={{ color: nbColors.black, fontWeight: '500' }}>
              {duration.formatted}
            </NBText>
          </View>

          <View style={styles.infoRow}>
            <NBText variant="body-sm" color="gray600">
              Update lokasi
            </NBText>
            <NBText variant="body-sm" style={{ color: nbColors.black, fontWeight: '500' }}>
              {lastUpdate}
            </NBText>
          </View>

          {onViewDetails && (
            <TouchableOpacity
              style={styles.detailsButton}
              onPress={onViewDetails}
            >
              <NBText variant="body-sm" color="white" style={{ fontWeight: '600' }}>
                Lihat Detail
              </NBText>
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
  headerText: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: nbSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: nbColors.gray['200'],
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
});
