/**
 * UserDetailSheet — bottom sheet shown when a marker or list card is tapped.
 * Rebuilt on NBModal (Phase 4 M3) with tile-driven detail sub-sheets:
 *   Lokasi    → LocationMapModal (pin + accuracy)
 *   Jam kerja → shift detail sheet
 *   Tugas     → today's tasks list
 *   Aktivitas → today's activities list
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import {
  nbColors,
  nbSpacing,
  nbBorders,
} from '../../constants/nbTokens';
import { NBText } from '../nb/NBText';
import { NBButton } from '../nb/NBButton';
import { NBModal } from '../nb/NBModal';
import { NBSkeleton } from '../nb/NBSkeleton';
import { RoleAvatar } from '../common/RoleAvatar';
import { StatusPill } from '../home/StatusPill';
import { HomeStatTile } from '../home/HomeStatTile';
import { ListItemCard, type ListItemMeta } from '../common';
import { LocationMapModal } from '../modals/LocationMapModal';
import { userAxes, presenceActivityPill, overtimePill, activityPill, formatDate, formatTime as formatTimeShort } from '../../utils/statusHelpers';
import { taskPill, isTaskScopedToday } from '../../utils/taskStatus';
import { ROLE_LABELS } from '../../constants/roles';
import { getOvertimes } from '../../services/api/overtimeApi';
import { getTasks } from '../../services/api/tasksApi';
import { getActivities } from '../../services/api/activitiesApi';
import { getUserById } from '../../services/api/usersApi';
import type {
  LiveUser,
  UserDaySummary,
  UserRole,
  Overtime,
  Task,
  Activity,
} from '../../types/models.types';

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

function todayISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
  const d = new Date(isoString);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
  urgent: 'Mendesak',
};

const NOOP = () => {};

// ─── Component ────────────────────────────────────────────────────────────────

export function UserDetailSheet({
  user,
  daySummary,
  isLoadingDaySummary,
  onClose,
  onTrailPress,
}: UserDetailSheetProps): React.JSX.Element {
  const [mapOpen, setMapOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [activitiesOpen, setActivitiesOpen] = useState(false);
  const [overtimes, setOvertimes] = useState<Overtime[]>([]);
  const [overtimesLoading, setOvertimesLoading] = useState(false);
  const [tasksFull, setTasksFull] = useState<Task[]>([]);
  const [tasksFullLoading, setTasksFullLoading] = useState(false);
  const [activitiesFull, setActivitiesFull] = useState<Activity[]>([]);
  const [activitiesFullLoading, setActivitiesFullLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Lazy fetch today's overtime entries when the Jam kerja modal opens.
  useEffect(() => {
    if (!shiftOpen || !user) { return; }
    let cancelled = false;
    setOvertimesLoading(true);
    const date = todayISODate();
    getOvertimes({ user_id: user.id, from_date: date, to_date: date, limit: 20 })
      .then((res) => {
        if (cancelled) { return; }
        setOvertimes(res.data?.data ?? []);
      })
      .catch(() => {
        if (cancelled) { return; }
        setOvertimes([]);
      })
      .finally(() => {
        if (cancelled) { return; }
        setOvertimesLoading(false);
      });
    return () => { cancelled = true; };
  }, [shiftOpen, user]);

  // Pre-fetch today's tasks + activities + profile picture when the sheet
  // opens. Task scope matches FieldHomeScreen's `activeTasks` filter
  // (ACTIVE_TASK_STATUSES + deadline ≤ EOD) so the count this supervisor sees
  // here lines up with what the worker sees on their own Home screen.
  useEffect(() => {
    if (!user) {
      setTasksFull([]);
      setActivitiesFull([]);
      setPhotoUrl(null);
      return;
    }
    let cancelled = false;
    const today = todayISODate();

    setTasksFullLoading(true);
    getTasks({ assigned_to: user.id, limit: 50 })
      .then((res) => {
        if (cancelled) { return; }
        const all = res.data?.data ?? [];
        setTasksFull(all.filter(isTaskScopedToday));
      })
      .catch(() => {
        if (cancelled) { return; }
        setTasksFull([]);
      })
      .finally(() => {
        if (cancelled) { return; }
        setTasksFullLoading(false);
      });

    setActivitiesFullLoading(true);
    getActivities({ user_id: user.id, from_date: today, to_date: today, limit: 50 })
      .then((res) => {
        if (cancelled) { return; }
        setActivitiesFull(res.data?.data ?? []);
      })
      .catch(() => {
        if (cancelled) { return; }
        setActivitiesFull([]);
      })
      .finally(() => {
        if (cancelled) { return; }
        setActivitiesFullLoading(false);
      });

    // profile_picture_url isn't on LiveUser/UserDaySummary — fetch the full
    // User record so the avatar matches the top header + profile screen.
    getUserById(user.id)
      .then((res) => {
        if (cancelled) { return; }
        setPhotoUrl(res.data?.profile_picture_url ?? null);
      })
      .catch(() => {
        if (cancelled) { return; }
        setPhotoUrl(null);
      });

    return () => { cancelled = true; };
  }, [user?.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleCall = useCallback(() => {
    if (!user?.phone) { return; }
    const phone = formatPhone(user.phone);
    if (phone) {
      Linking.openURL(`tel:+${phone}`).catch(() => {});
    }
  }, [user?.phone]);

  const handleWhatsApp = useCallback(() => {
    const link = daySummary?.whatsapp_links?.chat;
    if (link) {
      Linking.openURL(link).catch(() => {});
      return;
    }
    if (!user?.phone) { return; }
    const phone = formatPhone(user.phone);
    if (phone) {
      Linking.openURL(`https://wa.me/${phone}`).catch(() => {});
    }
  }, [user?.phone, daySummary?.whatsapp_links?.chat]);

  const handleTrail = useCallback(() => {
    if (user) { onTrailPress(user); }
  }, [user, onTrailPress]);

  const visible = user !== null;
  const hasPhone = Boolean(user?.phone);
  const shift = daySummary?.shift;

  const locationDetail = user
    ? [
        user.accuracy != null ? `±${Math.round(user.accuracy)}m` : null,
        user.latitude != null && user.longitude != null
          ? `${user.latitude.toFixed(5)}, ${user.longitude.toFixed(5)}`
          : null,
      ]
        .filter(Boolean)
        .join(' · ') || undefined
    : undefined;

  return (
    <>
      <NBModal
        visible={visible}
        onClose={onClose}
        type="sheet"
        testID="user-detail-sheet"
      >
        {user ? (
          <>
            {/* Profile header */}
            <View style={styles.profileRow}>
              <RoleAvatar
                name={user.full_name}
                role={user.role}
                photoUrl={photoUrl ?? undefined}
                size={48}
              />
              <View style={styles.profileInfo}>
                <NBText variant="h3" color="black" numberOfLines={2}>
                  {user.full_name}
                </NBText>
                <NBText variant="mono-sm" color="gray600">
                  {ROLE_LABELS[user.role as UserRole] ?? user.role} · {user.area_name}
                </NBText>
              </View>
              <View style={styles.profileMeta}>
                {(() => {
                  const { activity, location } = userAxes(user);
                  const pill = presenceActivityPill(activity);
                  return (
                    <>
                      <StatusPill dot tone={pill.tone} label={pill.label} />
                      {location === 'luar_area' ? (
                        <StatusPill dot tone="bad" label="Luar area" />
                      ) : null}
                    </>
                  );
                })()}
                {user.last_update ? (
                  <NBText variant="mono-sm" color="gray500" style={styles.lastUpdate}>
                    {formatRelativeTime(user.last_update)}
                  </NBText>
                ) : null}
              </View>
            </View>

            {/* Lokasi tile — solo row */}
            <View style={styles.statSection}>
              <HomeStatTile
                label="Lokasi"
                value={user.area_name || '—'}
                detail={locationDetail}
                onPress={() => setMapOpen(true)}
              />

              {/* Jam kerja / Tugas / Aktivitas — 3-column row, each with its
                  own loading state so a slow API doesn't block the others. */}
              <View style={styles.statRow}>
                {isLoadingDaySummary ? (
                  <NBSkeleton variant="card" height={84} style={styles.skeletonTile} />
                ) : (
                  <HomeStatTile
                    label="Jam kerja"
                    variant="yellow"
                    value={shift ? formatDuration(shift.duration_minutes) : '—'}
                    detail={user.clock_in_time ? formatTime(user.clock_in_time) : undefined}
                    onPress={() => setShiftOpen(true)}
                  />
                )}
                {tasksFullLoading ? (
                  <NBSkeleton variant="card" height={84} style={styles.skeletonTile} />
                ) : (
                  <HomeStatTile
                    label="Tugas"
                    variant="info"
                    value={String(tasksFull.length)}
                    detail="hari ini"
                    onPress={() => setTasksOpen(true)}
                  />
                )}
                {activitiesFullLoading ? (
                  <NBSkeleton variant="card" height={84} style={styles.skeletonTile} />
                ) : (
                  <HomeStatTile
                    label="Aktivitas"
                    variant="ok"
                    value={String(activitiesFull.length)}
                    detail="hari ini"
                    onPress={() => setActivitiesOpen(true)}
                  />
                )}
              </View>
            </View>

            {/* Action buttons — stacked, label + icon */}
            <View style={styles.actionStack}>
              <NBButton
                variant="secondary"
                title="Hubungi"
                leftIcon="phone"
                disabled={!hasPhone}
                onPress={handleCall}
                size="md"
                fullWidth
              />
              <NBButton
                variant="success"
                title="Chat WhatsApp"
                leftIcon="whatsapp"
                disabled={!hasPhone}
                onPress={handleWhatsApp}
                size="md"
                fullWidth
              />
              <NBButton
                variant="primary"
                title="Lihat jejak"
                leftIcon="map-marker-path"
                onPress={handleTrail}
                size="md"
                fullWidth
              />
            </View>
          </>
        ) : null}
      </NBModal>

      {/* ─── Nested detail modals ──────────────────────────────────────────── */}
      {user ? (
        <>
          <LocationMapModal
            visible={mapOpen}
            onClose={() => setMapOpen(false)}
            title={`Lokasi ${user.full_name}`}
            markerTitle={user.full_name}
            location={{
              latitude: user.latitude ?? null,
              longitude: user.longitude ?? null,
              accuracy: user.accuracy ?? null,
              isWithinArea: user.is_within_area,
              updatedAt: user.last_update ? new Date(user.last_update) : null,
            }}
          />

          <NBModal
            visible={shiftOpen}
            onClose={() => setShiftOpen(false)}
            type="sheet"
            title="Jam Kerja Hari Ini"
            testID="user-shift-modal"
          >
            <View style={styles.list}>
              {/* Primary shift row */}
              {shift ? (
                <ListItemCard
                  statusTone={shift.clock_out_time ? 'neutral' : 'ok'}
                  statusLabel={shift.clock_out_time ? 'Selesai' : 'Berjalan'}
                  rightText={formatDuration(shift.duration_minutes)}
                  title={shift.name || 'Shift'}
                  meta={[
                    { icon: 'login', label: `Mulai ${formatTime(shift.clock_in_time)}` },
                    {
                      icon: 'logout',
                      label: shift.clock_out_time
                        ? `Selesai ${formatTime(shift.clock_out_time)}`
                        : 'Belum clock out',
                    },
                    ...(shift.outside_boundary
                      ? [{ icon: 'map-marker-alert', label: 'Di luar area' }]
                      : []),
                  ]}
                  onPress={NOOP}
                  testID="user-shift-row"
                />
              ) : (
                <NBText variant="body" color="gray600" align="center">
                  Belum clock in hari ini
                </NBText>
              )}

              {/* Lembur section */}
              <NBText variant="mono-sm" uppercase color="gray600" style={styles.sectionHeader}>
                Lembur Hari Ini ({overtimes.length})
              </NBText>
              {overtimesLoading ? (
                <NBText variant="body-sm" color="gray500" align="center">
                  Memuat lembur…
                </NBText>
              ) : overtimes.length === 0 ? (
                <NBText variant="body-sm" color="gray500" align="center">
                  Belum ada lembur hari ini
                </NBText>
              ) : (
                overtimes.map((ot) => {
                  const p = overtimePill(ot.status);
                  return (
                    <ListItemCard
                      key={ot.id}
                      statusTone={p.tone}
                      statusLabel={p.label}
                      rightText={`${formatTimeShort(ot.start_datetime)}${ot.end_datetime ? `–${formatTimeShort(ot.end_datetime)}` : ''}`}
                      title={ot.activityType?.name ?? 'Lembur'}
                      description={ot.reason || ot.description || undefined}
                      meta={ot.area?.name ? [{ icon: 'map-marker', label: ot.area.name }] : undefined}
                      onPress={NOOP}
                      testID={`user-overtime-${ot.id}`}
                    />
                  );
                })
              )}
            </View>
          </NBModal>

          {/* Tugas Hari Ini — full Task records pre-fetched on sheet open; same
              card layout as Home's TodayTasksModal. Rows non-interactive. */}
          <NBModal
            visible={tasksOpen}
            onClose={() => setTasksOpen(false)}
            type="sheet"
            title={`Tugas Hari Ini (${tasksFullLoading ? '…' : tasksFull.length})`}
            testID="user-tasks-modal"
          >
            {tasksFullLoading ? (
              <NBText variant="body-sm" color="gray500" align="center">
                Memuat tugas…
              </NBText>
            ) : tasksFull.length === 0 ? (
              <NBText variant="body" color="gray600" align="center">
                Belum ada tugas hari ini
              </NBText>
            ) : (
              <View style={styles.list}>
                {tasksFull.map((t) => {
                  const p = taskPill(t.status);
                  const meta: ListItemMeta[] = [];
                  if (t.area?.name) { meta.push({ icon: 'map-marker', label: t.area.name }); }
                  if (t.deadline) { meta.push({ icon: 'clock-outline', label: formatDate(t.deadline) }); }
                  if (t.priority) {
                    meta.push({ icon: 'flag', label: PRIORITY_LABEL[t.priority] ?? t.priority });
                  }
                  return (
                    <ListItemCard
                      key={t.id}
                      statusTone={p.tone}
                      statusLabel={p.label}
                      rightText={`${formatDate(t.created_at)} · ${formatTimeShort(t.created_at)}`}
                      title={t.title}
                      description={t.description || undefined}
                      meta={meta.length ? meta : undefined}
                      onPress={NOOP}
                      testID={`user-task-${t.id}`}
                    />
                  );
                })}
              </View>
            )}
          </NBModal>

          {/* Aktivitas Hari Ini — full Activity records; same card layout as
              Home's TodayActivitiesModal. Rows non-interactive. */}
          <NBModal
            visible={activitiesOpen}
            onClose={() => setActivitiesOpen(false)}
            type="sheet"
            title={`Aktivitas Hari Ini (${activitiesFullLoading ? '…' : activitiesFull.length})`}
            testID="user-activities-modal"
          >
            {activitiesFullLoading ? (
              <NBText variant="body-sm" color="gray500" align="center">
                Memuat aktivitas…
              </NBText>
            ) : activitiesFull.length === 0 ? (
              <NBText variant="body" color="gray600" align="center">
                Belum ada aktivitas hari ini
              </NBText>
            ) : (
              <View style={styles.list}>
                {activitiesFull.map((a) => {
                  const p = activityPill(a.status);
                  const meta: ListItemMeta[] = [];
                  if (a.area?.name) { meta.push({ icon: 'map-marker', label: a.area.name }); }
                  if (a.photo_urls && a.photo_urls.length > 0) {
                    meta.push({ icon: 'camera', label: `${a.photo_urls.length} foto` });
                  }
                  return (
                    <ListItemCard
                      key={a.id}
                      statusTone={p.tone}
                      statusLabel={p.label}
                      rightText={`${formatDate(a.created_at)} · ${formatTimeShort(a.created_at)}`}
                      title={a.activityType?.name ?? 'Aktivitas'}
                      description={a.description || undefined}
                      meta={meta.length ? meta : undefined}
                      onPress={NOOP}
                      testID={`user-activity-${a.id}`}
                    />
                  );
                })}
              </View>
            )}
          </NBModal>
        </>
      ) : null}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
  profileMeta: {
    alignItems: 'flex-end',
    gap: nbSpacing.xs,
  },
  lastUpdate: {
    textAlign: 'right',
  },
  statSection: {
    flexDirection: 'column',
    gap: nbSpacing.sm,
    paddingVertical: nbSpacing.md,
    borderBottomWidth: nbBorders.widthThin,
    borderBottomColor: nbColors.gray200,
  },
  statRow: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
  skeletonTile: {
    flex: 1,
  },
  actionStack: {
    flexDirection: 'column',
    gap: nbSpacing.sm,
    marginTop: nbSpacing.md,
  },
  list: {
    gap: nbSpacing.sm,
  },
  sectionHeader: {
    marginTop: nbSpacing.md,
    marginBottom: nbSpacing.xs,
    letterSpacing: 0.4,
  },
});

export default UserDetailSheet;
