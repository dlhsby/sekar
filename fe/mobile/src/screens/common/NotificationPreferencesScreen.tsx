/**
 * NotificationPreferencesScreen (Phase 4-3 §E3)
 *
 * Per-type push notification toggles. Loads the user's effective preferences
 * on mount, persists each toggle optimistically via
 * `PATCH /users/:id/notification-preferences`, and reverts + toasts on failure.
 *
 * Reached from Settings → "Preferensi notifikasi". The 76px header is supplied
 * by the MainStack `withProfileHeader` wrapper, so this screen renders content
 * only.
 *
 * @see specs/ui-ux/design-tokens.md
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NBBackgroundPattern, NBText, NBToast } from '../../components/nb';
import { useAppSelector } from '../../store/hooks';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreference,
} from '../../services/api/notificationsApi';
import { nbColors, nbSpacing, nbRadius, nbBorders, nbShadows } from '../../constants/nbTokens';

// Per-type Indonesian labels, grouped into UI sections. Order is presentation.
const SECTIONS: { title: string; items: { type: string; label: string }[] }[] = [
  {
    title: 'Tugas',
    items: [
      { type: 'task_assigned', label: 'Tugas baru' },
      { type: 'task_completed', label: 'Tugas selesai' },
      { type: 'task_updated', label: 'Pembaruan & revisi tugas' },
    ],
  },
  {
    title: 'Aktivitas',
    items: [
      { type: 'activity_approved', label: 'Aktivitas disetujui' },
      { type: 'activity_rejected', label: 'Aktivitas ditolak' },
    ],
  },
  {
    title: 'Lembur',
    items: [
      { type: 'overtime_approved', label: 'Lembur disetujui' },
      { type: 'overtime_rejected', label: 'Lembur ditolak' },
    ],
  },
  {
    title: 'Lainnya',
    items: [
      { type: 'shift_reminder', label: 'Pengingat shift' },
      { type: 'missing_worker_alert', label: 'Peringatan pekerja hilang' },
    ],
  },
];

function NBToggle({
  value,
  onValueChange,
  label,
  disabled,
  testID,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  testID?: string;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      onPress={() => onValueChange(!value)}
      activeOpacity={0.8}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      accessibilityLabel={label}
      testID={testID}
      style={[styles.toggleTrack, value ? styles.toggleTrackOn : styles.toggleTrackOff]}
    >
      <View style={[styles.toggleKnob, value ? styles.toggleKnobOn : styles.toggleKnobOff]} />
    </TouchableOpacity>
  );
}

export function NotificationPreferencesScreen(): React.JSX.Element {
  const userId = useAppSelector((state) => state.auth.user?.id);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await getNotificationPreferences(userId);
    if (res.data) {
      const map: Record<string, boolean> = {};
      res.data.forEach((p: NotificationPreference) => {
        map[p.type] = p.enabled;
      });
      setPrefs(map);
    } else {
      NBToast.show({
        level: 'danger',
        title: 'Gagal',
        body: 'Gagal memuat preferensi notifikasi.',
      });
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = useCallback(
    async (type: string, next: boolean) => {
      if (!userId) return;
      const previous = prefs[type] ?? true;
      // Optimistic update.
      setPrefs((p) => ({ ...p, [type]: next }));
      setSavingType(type);
      const res = await updateNotificationPreferences(userId, [{ type, enabled: next }]);
      setSavingType(null);
      if (res.error) {
        // Revert on failure.
        setPrefs((p) => ({ ...p, [type]: previous }));
        NBToast.show({
          level: 'danger',
          title: 'Gagal',
          body: 'Perubahan tidak tersimpan. Coba lagi.',
        });
      }
    },
    [userId, prefs],
  );

  if (loading) {
    return (
      <NBBackgroundPattern
        pattern="grid"
        backgroundColor={nbColors.bgCanvas}
        patternColor={nbColors.primary}
        opacity={0.03}
      >
        <View style={styles.loading} testID="notif-prefs-loading">
          <ActivityIndicator size="large" color={nbColors.primary} />
        </View>
      </NBBackgroundPattern>
    );
  }

  return (
    <NBBackgroundPattern
      pattern="grid"
      backgroundColor={nbColors.bgCanvas}
      patternColor={nbColors.primary}
      opacity={0.03}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <NBText variant="body-sm" color="gray600" style={styles.intro}>
          Pilih notifikasi yang ingin Anda terima. Menonaktifkan sebuah jenis akan menghentikan
          push untuk jenis tersebut.
        </NBText>

        {SECTIONS.map((section) => (
          <View key={section.title}>
            <NBText variant="mono-sm" color="gray600" uppercase style={styles.sectionTitle}>
              {section.title}
            </NBText>
            <View style={styles.card}>
              {section.items.map((item, idx) => {
                const enabled = prefs[item.type] ?? true;
                return (
                  <View
                    key={item.type}
                    style={[styles.row, idx < section.items.length - 1 && styles.rowDivider]}
                  >
                    <View style={styles.rowText}>
                      <NBText variant="body-sm" color="black">
                        {item.label}
                      </NBText>
                    </View>
                    <NBToggle
                      value={enabled}
                      onValueChange={(next) => handleToggle(item.type, next)}
                      label={item.label}
                      disabled={savingType === item.type}
                      testID={`pref-toggle-${item.type}`}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: nbSpacing.lg,
    paddingBottom: nbSpacing.xl,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intro: {
    marginBottom: nbSpacing.lg,
  },
  sectionTitle: {
    marginBottom: nbSpacing.sm,
    marginTop: nbSpacing.md,
  },
  card: {
    backgroundColor: nbColors.white,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
  },
  rowDivider: {
    borderBottomWidth: nbBorders.widthThin,
    borderBottomColor: nbColors.gray200,
  },
  rowText: {
    flex: 1,
    paddingRight: nbSpacing.md,
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: nbRadius.full,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackOn: {
    backgroundColor: nbColors.primary,
  },
  toggleTrackOff: {
    backgroundColor: nbColors.gray200,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: nbRadius.full,
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.black,
  },
  toggleKnobOn: {
    alignSelf: 'flex-end',
  },
  toggleKnobOff: {
    alignSelf: 'flex-start',
  },
});

export default NotificationPreferencesScreen;
