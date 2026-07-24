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
import { useTranslation } from 'react-i18next';
import {
  nbColors,
  nbSpacing,
  nbBorders,
} from '../../constants/nbTokens';
import i18n from '../../i18n/config';
import { NBText } from '../nb/NBText';
import { NBButton } from '../nb/NBButton';
import { NBModal } from '../nb/NBModal';
import { NBSkeleton } from '../nb/NBSkeleton';
import { RoleAvatar } from '../common/RoleAvatar';
import { StatusPill } from '../home/StatusPill';
import { HomeStatTile } from '../home/HomeStatTile';
import { ListItemCard, type ListItemMeta } from '../common';
import { LocationMapModal } from '../modals/LocationMapModal';
import { userAxes, presenceActivityPill, lifecycleFlagPills, lifecycleStatePill, overtimePill, activityPill, formatDate, formatTime as formatTimeShort, formatDateIndonesian } from '../../utils/statusHelpers';
import { taskPill, isTaskScopedToday } from '../../utils/taskStatus';
import { ROLE_LABELS } from '../../constants/roles';
import { getOvertimes } from '../../services/api/overtimeApi';
import { getTasks } from '../../services/api/tasksApi';
import { getActivities } from '../../services/api/activitiesApi';
import { getUserById } from '../../services/api/usersApi';
import { getReassignmentHistory } from '../../services/api/monitoringApi';
import type {
  LiveUser,
  UserDaySummary,
  UserRole,
  Overtime,
  Task,
  Activity,
  ReassignmentHistory,
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
  if (minutes < 1) { return i18n.t('monitoring:relativeTime.justNow'); }
  if (minutes < 60) { return `${minutes} ${i18n.t('monitoring:relativeTime.minutesAgo')}`; }
  return `${Math.floor(minutes / 60)} ${i18n.t('monitoring:relativeTime.hoursAgo')}`;
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

// Priority labels now use i18n; see statusHelpers.getPriorityLabel()
const getPriorityLabel = (priority: string): string => {
  return i18n.t(`status:priority.${priority}`, priority);
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
  const { t } = useTranslation();
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
  const [reassignmentHistory, setReassignmentHistory] = useState<ReassignmentHistory | null>(null);
  const [reassignmentLoading, setReassignmentLoading] = useState(false);

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

    // Fetch reassignment history for the Riwayat Pemindahan section
    setReassignmentLoading(true);
    getReassignmentHistory(user.id)
      .then((res) => {
        if (cancelled) { return; }
        setReassignmentHistory(res.data ?? null);
      })
      .catch(() => {
        if (cancelled) { return; }
        setReassignmentHistory(null);
      })
      .finally(() => {
        if (cancelled) { return; }
        setReassignmentLoading(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
                  {ROLE_LABELS[user.role as UserRole] ?? user.role} · {user.location_name}
                </NBText>
              </View>
              <View style={styles.profileMeta}>
                {(() => {
                  const { activity, location } = userAxes(user);
                  const pill = presenceActivityPill(activity);
                  const lifePills = lifecycleFlagPills(user);
                  const statePill = lifecycleStatePill(user);
                  return (
                    <>
                      <StatusPill dot tone={pill.tone} label={pill.label} />
                      {/* Lifecycle axis itself (bertugas / belum hadir / terlambat /
                          pulang / tidak hadir), refined by an approved leave reason. */}
                      {statePill ? (
                        <StatusPill dot tone={statePill.tone} label={statePill.label} />
                      ) : null}
                      {location === 'luar_area' ? (
                        <StatusPill dot tone="bad" label={t('monitoring:userDetail.outsideArea')} />
                      ) : null}
                      {/* Third axis (ADR-050): lifecycle flags — terlambat, luar jadwal, lembur, lupa clock-out. */}
                      {lifePills.map((p, i) => (
                        // Stable position key — order is fixed by lifecycleFlagPills, so it
                        // won't churn when the language (and thus the label) changes.
                        <StatusPill key={`life-${i}`} dot tone={p.tone} label={p.label} />
                      ))}
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
                label={t('monitoring:userDetail.location')}
                value={user.location_name || '—'}
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
                    label={t('monitoring:userDetail.shiftLabel')}
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
                    label={t('monitoring:userDetail.tasksLabel')}
                    variant="info"
                    value={String(tasksFull.length)}
                    detail={t('monitoring:userDetail.today')}
                    onPress={() => setTasksOpen(true)}
                  />
                )}
                {activitiesFullLoading ? (
                  <NBSkeleton variant="card" height={84} style={styles.skeletonTile} />
                ) : (
                  <HomeStatTile
                    label={t('monitoring:userDetail.activitiesLabel')}
                    variant="ok"
                    value={String(activitiesFull.length)}
                    detail={t('monitoring:userDetail.today')}
                    onPress={() => setActivitiesOpen(true)}
                  />
                )}
              </View>
            </View>

            {/* Riwayat Pemindahan — collapsible section showing reassignment history */}
            <View style={styles.statSection}>
              <NBText variant="mono-sm" uppercase color="gray600" style={styles.sectionHeader}>
                {t('monitoring:userDetail.reassignmentHistory')}
              </NBText>
              {reassignmentLoading ? (
                <NBText variant="body-sm" color="gray500" align="center">
                  {t('monitoring:userDetail.loadingHistory')}
                </NBText>
              ) : !reassignmentHistory || reassignmentHistory.history.length === 0 ? (
                <NBText variant="body-sm" color="gray500" align="center">
                  {t('monitoring:userDetail.noHistory')}
                </NBText>
              ) : (
                <View style={styles.list}>
                  {reassignmentHistory.history.slice(0, 5).map((entry) => {
                    const transition = `${entry.previous_area_name ?? '—'} → ${entry.new_area_name}`;
                    const displayDate = entry.effective_date
                      ? formatDateIndonesian(entry.effective_date)
                      : new Date(entry.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        });
                    return (
                      <ListItemCard
                        key={entry.id}
                        statusTone="neutral"
                        statusLabel={entry.actor_name}
                        rightText={displayDate}
                        title={transition}
                        description={entry.reason || undefined}
                        onPress={NOOP}
                        testID={`reassign-history-${entry.id}`}
                      />
                    );
                  })}
                </View>
              )}
            </View>

            {/* Action buttons — stacked, label + icon */}
            <View style={styles.actionStack}>
              <NBButton
                variant="secondary"
                title={t('monitoring:userDetail.call')}
                leftIcon="phone"
                disabled={!hasPhone}
                onPress={handleCall}
                size="md"
                fullWidth
              />
              <NBButton
                variant="success"
                title={t('monitoring:userDetail.whatsapp')}
                leftIcon="whatsapp"
                disabled={!hasPhone}
                onPress={handleWhatsApp}
                size="md"
                fullWidth
              />
              <NBButton
                variant="primary"
                title={t('monitoring:userDetail.viewTrail')}
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
            title={`${t('monitoring:userDetail.location')} ${user.full_name}`}
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
            title={t('monitoring:userDetail.shift.title')}
            testID="user-shift-modal"
          >
            <View style={styles.list}>
              {/* Primary shift row */}
              {shift ? (
                <ListItemCard
                  statusTone={shift.clock_out_time ? 'neutral' : 'ok'}
                  statusLabel={shift.clock_out_time ? t('monitoring:userDetail.shift.status.completed') : t('monitoring:userDetail.shift.status.active')}
                  rightText={formatDuration(shift.duration_minutes)}
                  title={shift.name || t('monitoring:userDetail.shift.defaultName')}
                  meta={[
                    { icon: 'login', label: `${t('monitoring:userDetail.shift.startLabel')} ${formatTime(shift.clock_in_time)}` },
                    {
                      icon: 'logout',
                      label: shift.clock_out_time
                        ? `${t('monitoring:userDetail.shift.finishLabel')} ${formatTime(shift.clock_out_time)}`
                        : t('monitoring:userDetail.shift.notClockOut'),
                    },
                    ...(shift.outside_boundary
                      ? [{ icon: 'map-marker-alert', label: t('monitoring:userDetail.shift.outsideBoundary') }]
                      : []),
                  ]}
                  onPress={NOOP}
                  testID="user-shift-row"
                />
              ) : (
                <NBText variant="body" color="gray600" align="center">
                  {t('monitoring:userDetail.shift.notClockedIn')}
                </NBText>
              )}

              {/* Lembur section */}
              <NBText variant="mono-sm" uppercase color="gray600" style={styles.sectionHeader}>
                {t('monitoring:userDetail.overtime.title')} ({overtimes.length})
              </NBText>
              {overtimesLoading ? (
                <NBText variant="body-sm" color="gray500" align="center">
                  {t('monitoring:userDetail.overtime.loading')}
                </NBText>
              ) : overtimes.length === 0 ? (
                <NBText variant="body-sm" color="gray500" align="center">
                  {t('monitoring:userDetail.overtime.empty')}
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
                      title={ot.activityType?.name ?? t('monitoring:userDetail.overtime.defaultName')}
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
            title={`${t('monitoring:userDetail.tasks.title')} (${tasksFullLoading ? '…' : tasksFull.length})`}
            testID="user-tasks-modal"
          >
            {tasksFullLoading ? (
              <NBText variant="body-sm" color="gray500" align="center">
                {t('monitoring:userDetail.tasks.loading')}
              </NBText>
            ) : tasksFull.length === 0 ? (
              <NBText variant="body" color="gray600" align="center">
                {t('monitoring:userDetail.tasks.empty')}
              </NBText>
            ) : (
              <View style={styles.list}>
                {tasksFull.map((task) => {
                  const p = taskPill(task.status);
                  const meta: ListItemMeta[] = [];
                  if (task.area?.name) { meta.push({ icon: 'map-marker', label: task.area.name }); }
                  if (task.deadline) { meta.push({ icon: 'clock-outline', label: formatDate(task.deadline) }); }
                  if (task.priority) {
                    meta.push({ icon: 'flag', label: t(`monitoring:userDetail.priorities.${task.priority}`) ?? task.priority });
                  }
                  return (
                    <ListItemCard
                      key={task.id}
                      statusTone={p.tone}
                      statusLabel={p.label}
                      rightText={`${formatDate(task.created_at)} · ${formatTimeShort(task.created_at)}`}
                      title={task.title}
                      description={task.description || undefined}
                      meta={meta.length ? meta : undefined}
                      onPress={NOOP}
                      testID={`user-task-${task.id}`}
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
            title={`${t('monitoring:userDetail.activities.title')} (${activitiesFullLoading ? '…' : activitiesFull.length})`}
            testID="user-activities-modal"
          >
            {activitiesFullLoading ? (
              <NBText variant="body-sm" color="gray500" align="center">
                {t('monitoring:userDetail.activities.loading')}
              </NBText>
            ) : activitiesFull.length === 0 ? (
              <NBText variant="body" color="gray600" align="center">
                {t('monitoring:userDetail.activities.empty')}
              </NBText>
            ) : (
              <View style={styles.list}>
                {activitiesFull.map((a) => {
                  const p = activityPill(a.status);
                  const meta: ListItemMeta[] = [];
                  if (a.area?.name) { meta.push({ icon: 'map-marker', label: a.area.name }); }
                  const photoCount = a.photo_count ?? a.photo_urls?.length ?? 0;
                  if (photoCount > 0) {
                    meta.push({ icon: 'camera', label: `${photoCount} ${t('monitoring:userDetail.photos')}` });
                  }
                  return (
                    <ListItemCard
                      key={a.id}
                      statusTone={p.tone}
                      statusLabel={p.label}
                      rightText={`${formatDate(a.created_at)} · ${formatTimeShort(a.created_at)}`}
                      title={a.activityType?.name ?? t('monitoring:userDetail.activitiesLabel')}
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
