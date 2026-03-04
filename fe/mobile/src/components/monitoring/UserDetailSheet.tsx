/**
 * UserDetailSheet Component
 * Phase 2D: Bottom sheet showing user detail when a marker or list card is tapped.
 * Uses @gorhom/bottom-sheet. Fetches day-summary on open.
 */

import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbBorderRadius,
  nbShadows,
} from '../../constants/nbTokens';
import { getStatusColor, getStatusLabel, getRoleIcon } from '../../utils/mapUtils';
import { ROLE_LABELS } from '../../constants/roles';
import type { LiveUser, UserDaySummary, UserRole } from '../../types/models.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserDetailSheetProps {
  user: LiveUser | null;
  daySummary: UserDaySummary | null;
  isLoadingDaySummary: boolean;
  onClose: () => void;
  onTrailPress: (user: LiveUser) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPhone(phone: string | null): string | null {
  if (!phone) { return null; }
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('62')) { return digits; }
  if (digits.startsWith('0')) { return `62${digits.slice(1)}`; }
  return `62${digits}`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) { return `${m}m`; }
  return `${h}j ${m}m`;
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) { return 'baru saja'; }
  if (minutes < 60) { return `${minutes} mnt lalu`; }
  return `${Math.floor(minutes / 60)} jam lalu`;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

const TASK_STATUS_COLORS: Record<string, string> = {
  pending: nbColors.warning,
  in_progress: nbColors.accentSky,
  completed: nbColors.successDark,
  verified: nbColors.successDark,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function UserDetailSheet({
  user,
  daySummary,
  isLoadingDaySummary,
  onClose,
  onTrailPress,
}: UserDetailSheetProps): React.JSX.Element | null {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '85%'], []);

  useEffect(() => {
    if (user) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [user]);

  const handleClose = useCallback(() => {
    sheetRef.current?.close();
    onClose();
  }, [onClose]);

  const handleWhatsApp = useCallback(() => {
    if (!user?.phone) { return; }
    const phone = formatPhone(user.phone);
    if (phone) {
      Linking.openURL(`https://wa.me/${phone}`).catch(() => {});
    }
  }, [user?.phone]);

  const handleCall = useCallback(() => {
    if (!user?.phone) { return; }
    const phone = formatPhone(user.phone);
    if (phone) {
      Linking.openURL(`tel:+${phone}`).catch(() => {});
    }
  }, [user?.phone]);

  const handleTrail = useCallback(() => {
    if (user) { onTrailPress(user); }
  }, [user, onTrailPress]);

  if (!user) { return null; }

  const statusColor = getStatusColor(user.status);
  const roleIcon = getRoleIcon(user.role);
  const roleLabel = ROLE_LABELS[user.role as UserRole] ?? user.role;
  const hasPhone = Boolean(user.phone);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
          <View style={styles.headerInfo}>
            <Text style={styles.userName}>{user.full_name}</Text>
            <Text style={styles.userMeta}>
              {roleLabel}  {user.area_name}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeBtn}
            accessibilityLabel="Tutup"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="close" size={20} color={nbColors.gray['700']} />
          </TouchableOpacity>
        </View>

        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>
            {getStatusLabel(user.status)}
          </Text>
        </View>

        {isLoadingDaySummary ? (
          <ActivityIndicator
            size="small"
            color={nbColors.primary}
            style={styles.loader}
          />
        ) : (
          <DaySummaryContent
            daySummary={daySummary}
            user={user}
          />
        )}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <ActionButton
            icon="whatsapp"
            label="WhatsApp"
            color="#25D366"
            disabled={!hasPhone}
            onPress={handleWhatsApp}
          />
          <ActionButton
            icon="phone"
            label="Telepon"
            color={nbColors.accentSky}
            disabled={!hasPhone}
            onPress={handleCall}
          />
          <ActionButton
            icon="map-marker-path"
            label="Trail"
            color={nbColors.primary}
            disabled={false}
            onPress={handleTrail}
          />
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

// ─── DaySummaryContent sub-component ─────────────────────────────────────────

interface DaySummaryContentProps {
  daySummary: UserDaySummary | null;
  user: LiveUser;
}

function DaySummaryContent({ daySummary, user }: DaySummaryContentProps): React.JSX.Element {
  return (
    <>
      {/* Shift Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Info Shift</Text>
        {daySummary?.shift ? (
          <View style={styles.infoBox}>
            <InfoRow label="Shift" value={daySummary.shift.name} />
            <InfoRow label="Masuk" value={formatTime(daySummary.shift.clock_in_time)} />
            <InfoRow
              label="Durasi"
              value={formatDuration(daySummary.shift.duration_minutes)}
            />
            <InfoRow
              label="Batas Area"
              value={daySummary.shift.outside_boundary ? 'Di Luar Area' : 'Di Dalam Area'}
              valueColor={daySummary.shift.outside_boundary ? nbColors.dangerDark : nbColors.successDark}
            />
          </View>
        ) : (
          <Text style={styles.emptyText}>Belum ada data shift hari ini</Text>
        )}
      </View>

      {/* Last Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lokasi Terakhir</Text>
        {daySummary?.last_location ? (
          <View style={styles.infoBox}>
            <InfoRow
              label="Koordinat"
              value={`${daySummary.last_location.latitude.toFixed(4)}, ${daySummary.last_location.longitude.toFixed(4)}`}
            />
            {daySummary.last_location.accuracy != null && (
              <InfoRow label="Akurasi" value={`±${daySummary.last_location.accuracy.toFixed(0)}m`} />
            )}
            {daySummary.last_location.battery_level != null && (
              <InfoRow label="Baterai" value={`${daySummary.last_location.battery_level}%`} />
            )}
            <InfoRow
              label="Diperbarui"
              value={formatRelativeTime(daySummary.last_location.logged_at)}
            />
          </View>
        ) : (
          <View style={styles.infoBox}>
            <InfoRow
              label="Koordinat"
              value={`${user.latitude.toFixed(4)}, ${user.longitude.toFixed(4)}`}
            />
          </View>
        )}
      </View>

      {/* Activities Today */}
      {daySummary && daySummary.activities_today.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Aktivitas Hari Ini ({daySummary.activities_today.length})
          </Text>
          <View style={styles.infoBox}>
            {daySummary.activities_today.slice(0, 5).map(act => (
              <View key={act.id} style={styles.listRow}>
                <Text style={styles.listBullet}>•</Text>
                <Text style={styles.listLabel} numberOfLines={1}>{act.title}</Text>
                <Text style={styles.listTime}>{formatTime(act.created_at)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Tasks Today */}
      {daySummary && daySummary.tasks_today.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Tugas Hari Ini ({daySummary.tasks_today.length})
          </Text>
          <View style={styles.infoBox}>
            {daySummary.tasks_today.map(task => (
              <View key={task.id} style={styles.listRow}>
                <Text style={styles.listBullet}>•</Text>
                <Text style={styles.listLabel} numberOfLines={1}>{task.title}</Text>
                <View
                  style={[
                    styles.taskStatusBadge,
                    {
                      backgroundColor:
                        TASK_STATUS_COLORS[task.status] ?? nbColors.gray['300'],
                    },
                  ]}
                >
                  <Text style={styles.taskStatusText}>{task.status}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </>
  );
}

// ─── InfoRow helper ───────────────────────────────────────────────────────────

interface InfoRowProps {
  label: string;
  value: string;
  valueColor?: string;
}

function InfoRow({ label, value, valueColor }: InfoRowProps): React.JSX.Element {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}>
        {value}
      </Text>
    </View>
  );
}

// ─── ActionButton helper ──────────────────────────────────────────────────────

interface ActionButtonProps {
  icon: string;
  label: string;
  color: string;
  disabled: boolean;
  onPress: () => void;
}

function ActionButton({ icon, label, color, disabled, onPress }: ActionButtonProps): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, disabled && styles.actionBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <MaterialCommunityIcons
        name={icon}
        size={22}
        color={disabled ? nbColors.gray['400'] : color}
      />
      <Text style={[styles.actionBtnText, disabled && styles.actionBtnTextDisabled]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: nbColors.white,
    borderTopLeftRadius: nbBorderRadius.lg,
    borderTopRightRadius: nbBorderRadius.lg,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
  },
  handle: {
    backgroundColor: nbColors.gray['400'],
    width: 40,
  },
  content: {
    paddingHorizontal: nbSpacing.md,
    paddingBottom: nbSpacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nbSpacing.md,
    gap: nbSpacing.sm,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    flexShrink: 0,
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
  userMeta: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['600'],
    marginTop: 2,
  },
  closeBtn: {
    padding: nbSpacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: nbBorderRadius.full,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.xs,
    marginBottom: nbSpacing.md,
    gap: nbSpacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
  },
  loader: {
    marginVertical: nbSpacing.xl,
  },
  section: {
    marginBottom: nbSpacing.md,
  },
  sectionTitle: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.gray['700'],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: nbSpacing.xs,
  },
  infoBox: {
    backgroundColor: nbColors.gray['100'],
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.thin,
    borderColor: nbColors.gray['300'],
    padding: nbSpacing.sm,
    gap: nbSpacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['600'],
  },
  infoValue: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.gray['800'],
    maxWidth: '60%',
    textAlign: 'right',
  },
  emptyText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['500'],
    fontStyle: 'italic',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  listBullet: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray['500'],
    flexShrink: 0,
  },
  listLabel: {
    flex: 1,
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['700'],
  },
  listTime: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray['500'],
    flexShrink: 0,
  },
  taskStatusBadge: {
    borderRadius: nbBorderRadius.sm,
    paddingHorizontal: nbSpacing.xs,
    paddingVertical: 2,
    flexShrink: 0,
  },
  taskStatusText: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.white,
    fontWeight: nbTypography.fontWeight.semibold,
  },
  actionRow: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
    marginTop: nbSpacing.md,
    paddingTop: nbSpacing.md,
    borderTopWidth: nbBorders.thin,
    borderTopColor: nbColors.gray['300'],
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: nbSpacing.sm,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.thin,
    borderColor: nbColors.gray['300'],
    backgroundColor: nbColors.gray['100'],
    gap: nbSpacing.xs,
    minHeight: 48,
  },
  actionBtnDisabled: {
    opacity: 0.4,
  },
  actionBtnText: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray['700'],
  },
  actionBtnTextDisabled: {
    color: nbColors.gray['400'],
  },
});
