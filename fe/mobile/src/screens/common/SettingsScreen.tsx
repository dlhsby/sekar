/**
 * Settings Screen (PRF-2)
 * Phase 4 M3 revamp: hi-fi sections (Notifikasi / Lokasi & data / Offline sync /
 * Tentang) with NB-styled toggles and an offline-sync queue card. Logout lives in
 * the Profile menu, so it is intentionally absent here.
 *
 * @see specs/ui-ux/design-tokens.md
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import DeviceInfo from 'react-native-device-info';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NBBackgroundPattern, NBButton, NBText } from '../../components/nb';
import { useProfileSync } from '../../hooks/useProfileSync';
import {
  nbColors,
  nbSpacing,
  nbRadius,
  nbBorders,
  nbShadows,
} from '../../constants/nbTokens';

type SettingsScreenProps = NativeStackScreenProps<{ Settings: undefined }, 'Settings'>;

// ─── NBToggle ───────────────────────────────────────────────────────────────

interface NBToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label: string;
  testID?: string;
}

function NBToggle({ value, onValueChange, label, testID }: NBToggleProps): React.JSX.Element {
  return (
    <TouchableOpacity
      onPress={() => onValueChange(!value)}
      activeOpacity={0.8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      testID={testID}
      style={[
        styles.toggleTrack,
        value ? styles.toggleTrackOn : styles.toggleTrackOff,
      ]}
    >
      <View style={[styles.toggleKnob, value ? styles.toggleKnobOn : styles.toggleKnobOff]} />
    </TouchableOpacity>
  );
}

// ─── Setting row ────────────────────────────────────────────────────────────

interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  isLast?: boolean;
  testID?: string;
}

function ToggleRow({
  label,
  description,
  value,
  onToggle,
  isLast,
  testID,
}: ToggleRowProps): React.JSX.Element {
  return (
    <View style={[styles.row, !isLast && styles.rowDivider]}>
      <View style={styles.rowText}>
        <NBText variant="body-sm" color="black" style={styles.rowLabel}>{label}</NBText>
        {description ? (
          <NBText variant="mono-sm" color="gray600" style={styles.rowDescription}>{description}</NBText>
        ) : null}
      </View>
      <NBToggle value={value} onValueChange={onToggle} label={label} testID={testID} />
    </View>
  );
}

function SectionTitle({ children }: { children: string }): React.JSX.Element {
  return (
    <NBText variant="mono-sm" color="gray600" uppercase style={styles.sectionTitle}>
      {children}
    </NBText>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export function SettingsScreen(_props: SettingsScreenProps): React.JSX.Element {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [soundVibrate, setSoundVibrate] = useState(false);
  const [backgroundTracking, setBackgroundTracking] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);

  const { syncStatus, isSyncing, loadSyncStatus, handleSyncNow } = useProfileSync();

  useEffect(() => {
    loadSyncStatus();
  }, [loadSyncStatus]);

  const appVersion = DeviceInfo.getVersion();
  const buildNumber = DeviceInfo.getBuildNumber();

  const pendingTotal = syncStatus.pendingCount + syncStatus.failedCount;
  const hasPending = pendingTotal > 0;

  const handleHelp = useCallback(() => {
    Alert.alert('Bantuan & FAQ', 'Hubungi admin sistem untuk bantuan lebih lanjut.');
  }, []);

  return (
    <NBBackgroundPattern
      pattern="grid"
      backgroundColor={nbColors.background}
      patternColor={nbColors.primary}
      opacity={0.03}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notifikasi */}
        <SectionTitle>Notifikasi</SectionTitle>
        <View style={styles.card}>
          <ToggleRow
            label="Push notifikasi"
            description="Tugas baru, peringatan, perubahan jadwal"
            value={pushNotifications}
            onToggle={setPushNotifications}
            testID="toggle-push"
          />
          <ToggleRow
            label="Suara & getar"
            value={soundVibrate}
            onToggle={setSoundVibrate}
            isLast
            testID="toggle-sound"
          />
        </View>

        {/* Lokasi & data */}
        <SectionTitle>Lokasi &amp; data</SectionTitle>
        <View style={styles.card}>
          <ToggleRow
            label="Background tracking"
            description="Saat aplikasi tertutup"
            value={backgroundTracking}
            onToggle={setBackgroundTracking}
            testID="toggle-tracking"
          />
          <ToggleRow
            label="Hemat data"
            value={dataSaver}
            onToggle={setDataSaver}
            isLast
            testID="toggle-data-saver"
          />
        </View>

        {/* Offline sync */}
        <SectionTitle>Offline sync</SectionTitle>
        <View style={[styles.card, styles.syncCard, hasPending && styles.syncCardPending]}>
          <View style={styles.syncHeader}>
            <NBText variant="mono-sm" color="gray700" uppercase style={styles.syncHeaderText}>
              Antrian Sync
            </NBText>
            <View style={[styles.syncPill, hasPending ? styles.syncPillPending : styles.syncPillClear]}>
              <NBText variant="mono-sm" color="black" uppercase style={styles.syncPillText}>
                {hasPending ? `${pendingTotal} pending` : 'tersinkron'}
              </NBText>
            </View>
          </View>
          <NBText variant="mono-sm" color="gray700" style={styles.syncDetail}>
            {hasPending
              ? `${syncStatus.pendingCount} tertunda · ${syncStatus.failedCount} gagal`
              : 'Semua data sudah tersinkron.'}
          </NBText>
          {hasPending ? (
            <NBButton
              title="Sync sekarang"
              onPress={handleSyncNow}
              variant="secondary"
              size="sm"
              fullWidth
              loading={isSyncing}
              disabled={isSyncing}
              style={styles.syncButton}
              testID="sync-now-button"
            />
          ) : null}
        </View>

        {/* Tentang */}
        <SectionTitle>Tentang</SectionTitle>
        <View style={styles.card}>
          <View style={[styles.row, styles.rowDivider]}>
            <NBText variant="body-sm" color="black" style={styles.rowLabel}>Versi</NBText>
            <NBText variant="mono-sm" color="gray600">v{appVersion} (build {buildNumber})</NBText>
          </View>
          <TouchableOpacity
            style={styles.row}
            onPress={handleHelp}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Bantuan dan FAQ"
            testID="help-row"
          >
            <NBText variant="body-sm" color="black" style={styles.rowLabel}>Bantuan &amp; FAQ</NBText>
            <MaterialCommunityIcons name="chevron-right" size={18} color={nbColors.gray['400']} />
          </TouchableOpacity>
        </View>

        <View style={styles.appInfo}>
          <NBText variant="caption" color="gray400" align="center">
            SEKAR — Sistem Evaluasi Kerja Satgas RTH
          </NBText>
          <NBText variant="caption" color="gray400" align="center">
            DLH Surabaya 2026
          </NBText>
        </View>
      </ScrollView>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: nbSpacing.md,
    paddingBottom: nbSpacing['2xl'],
  },
  sectionTitle: {
    letterSpacing: 0.5,
    marginBottom: nbSpacing.sm,
    marginLeft: nbSpacing.xs,
  },
  card: {
    backgroundColor: nbColors.white,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    overflow: 'hidden',
    marginBottom: nbSpacing.lg,
    ...nbShadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.md,
    minHeight: 52,
  },
  rowDivider: {
    borderBottomWidth: 1.5,
    borderBottomColor: nbColors.gray['300'],
    borderStyle: 'dashed',
  },
  rowText: {
    flex: 1,
    marginRight: nbSpacing.sm,
  },
  rowLabel: {
    flex: 1,
    fontWeight: '600',
  },
  rowDescription: {
    marginTop: 2,
  },
  // ─── Toggle ───
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    justifyContent: 'center',
  },
  toggleTrackOn: {
    backgroundColor: nbColors.primary,
    ...nbShadows.xs,
  },
  toggleTrackOff: {
    backgroundColor: nbColors.gray['200'],
  },
  toggleKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: nbColors.white,
    borderWidth: 1.5,
    borderColor: nbColors.black,
    position: 'absolute',
  },
  toggleKnobOn: {
    right: 3,
  },
  toggleKnobOff: {
    left: 3,
  },
  // ─── Offline sync card ───
  syncCard: {
    padding: nbSpacing.md,
  },
  syncCardPending: {
    backgroundColor: nbColors.warningLight,
  },
  syncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: nbSpacing.sm,
  },
  syncHeaderText: {
    letterSpacing: 0.5,
  },
  syncPill: {
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: 2,
    borderRadius: nbRadius.sm,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
  },
  syncPillPending: {
    backgroundColor: nbColors.warning,
  },
  syncPillClear: {
    backgroundColor: nbColors.statusActiveBg,
  },
  syncPillText: {
    letterSpacing: 0.3,
  },
  syncDetail: {
    letterSpacing: 0.2,
  },
  syncButton: {
    marginTop: nbSpacing.md,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: nbSpacing.md,
  },
});

export default SettingsScreen;
