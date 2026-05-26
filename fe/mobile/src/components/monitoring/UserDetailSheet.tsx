/**
 * UserDetailSheet Component
 * Phase 2D: Bottom sheet showing user detail when a marker or list card is tapped.
 * Uses @gorhom/bottom-sheet. Fetches day-summary on open.
 */

import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetDefaultBackdropProps } from '@gorhom/bottom-sheet/lib/typescript/components/bottomSheetBackdrop/types';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
} from '../../constants/nbTokens';
import { NBText } from '../nb/NBText';
import { NBButton } from '../nb/NBButton';
import { RoleAvatar } from '../common/RoleAvatar';
import { StatusPill } from '../home/StatusPill';
import { HomeStatTile } from '../home/HomeStatTile';
import { getStatusLabel } from '../../utils/mapUtils';
import { ROLE_LABELS } from '../../constants/roles';
import type { LiveUser, UserDaySummary, UserRole } from '../../types/models.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserDetailSheetProps {
  user: LiveUser | null;
  daySummary: UserDaySummary | null;
  isLoadingDaySummary: boolean;
  onClose: () => void;
  onTrailPress: (user: LiveUser) => void;
  onReassignPress?: (user: LiveUser) => void;
  currentUserRole?: UserRole;
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

// ─── Component ────────────────────────────────────────────────────────────────

export function UserDetailSheet({
  user,
  daySummary,
  isLoadingDaySummary,
  onClose,
  onTrailPress,
}: UserDetailSheetProps): React.JSX.Element {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['70%', '90%'], []);

  useEffect(() => {
    if (user) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [user]);

  const renderBackdrop = useCallback(
    (props: BottomSheetDefaultBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
        pressBehavior="close"
      />
    ),
    [],
  );

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

  const hasPhone = Boolean(user?.phone);

  return (
    <BottomSheet
      ref={sheetRef}
      index={user ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onClose={onClose}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
      {user && (
        <>
        {/* Drag handle bar */}
        <View style={styles.dragHandle} />

        {/* Profile row: avatar + name + role + status */}
        <View style={styles.profileRow}>
          <RoleAvatar
            name={user.full_name}
            role={user.role}
            photoUrl={undefined}
            size={48}
          />
          <View style={styles.profileInfo}>
            <NBText variant="h2">{user.full_name}</NBText>
            <NBText variant="mono-sm" color="gray600">
              {ROLE_LABELS[user.role as UserRole] ?? user.role} · {user.area_name}
            </NBText>
          </View>
          <StatusPill
            tone={user.status === 'active' ? 'ok' : user.status === 'inactive' ? 'warn' : 'bad'}
            label={getStatusLabel(user.status)}
          />
        </View>

        {/* 3-stat grid */}
        {isLoadingDaySummary ? (
          <ActivityIndicator
            size="small"
            color={nbColors.primary}
            style={styles.loader}
          />
        ) : (
          <View style={styles.statGrid}>
            <HomeStatTile
              label="Lokasi"
              value={user.latitude !== undefined && user.longitude !== undefined
                ? `${user.latitude.toFixed(2)}, ${user.longitude.toFixed(2)}`
                : '—'}
            />
            <HomeStatTile
              label="Update"
              value={user.last_update
                ? formatRelativeTime(user.last_update)
                : '—'}
            />
            <HomeStatTile
              label="Jam kerja"
              value={daySummary?.shift
                ? formatDuration(daySummary.shift.duration_minutes)
                : '—'}
            />
          </View>
        )}

        {/* Activities section */}
        {daySummary && Array.isArray(daySummary.activities_today) && daySummary.activities_today.length > 0 && (
          <View style={styles.section}>
            <NBText variant="mono-sm" uppercase color="gray600" style={styles.sectionTitle}>
              Aktivitas hari ini
            </NBText>
            <View style={styles.activityList}>
              {daySummary.activities_today.slice(0, 5).map(act => (
                <View key={act.id} style={styles.timelineRow}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineContent}>
                    <NBText variant="caption" style={{ fontWeight: '700' }}>
                      {formatTime(act.created_at)}
                    </NBText>
                    <NBText variant="body-sm">{act.title}</NBText>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <NBButton
            variant="secondary"
            title="Hubungi"
            disabled={!hasPhone}
            onPress={handleCall}
            size="sm"
          />
          <NBButton
            variant="primary"
            title="Lihat profil"
            disabled={false}
            onPress={handleTrail}
            size="sm"
          />
        </View>
        </>
      )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: nbColors.white,
    borderTopWidth: nbBorders.widthThick,
    borderTopColor: nbColors.black,
    borderTopLeftRadius: nbRadius.lg,
    borderTopRightRadius: nbRadius.lg,
  },
  handle: {
    display: 'none', // Hidden — using custom dragHandle instead
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: nbColors.gray400,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: nbSpacing.sm,
    marginBottom: nbSpacing.md,
  },
  content: {
    paddingHorizontal: nbSpacing.md,
    paddingBottom: nbSpacing.xl,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: nbSpacing.sm,
    paddingBottom: nbSpacing.md,
    borderBottomWidth: nbBorders.widthThin,
    borderBottomColor: nbColors.gray200,
  },
  profileInfo: {
    flex: 1,
    gap: nbSpacing.xs,
  },
  statGrid: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
    paddingVertical: nbSpacing.md,
    borderBottomWidth: nbBorders.widthThin,
    borderBottomColor: nbColors.gray200,
  },
  loader: {
    marginVertical: nbSpacing.xl,
  },
  section: {
    marginTop: nbSpacing.md,
    marginBottom: nbSpacing.md,
  },
  sectionTitle: {
    marginBottom: nbSpacing.sm,
  },
  activityList: {
    gap: nbSpacing.sm,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
    alignItems: 'flex-start',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: nbColors.statusActive,
    marginTop: nbSpacing.xs,
    flexShrink: 0,
  },
  timelineContent: {
    flex: 1,
    gap: nbSpacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
    marginTop: nbSpacing.md,
    paddingTop: nbSpacing.md,
    borderTopWidth: nbBorders.widthThin,
    borderTopColor: nbColors.gray200,
  },
});;
