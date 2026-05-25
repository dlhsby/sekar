/**
 * OnboardingWelcomeScreen — Phase 4 M3b / ADR-042 / Hifi OB-1
 *
 * Role-aware first onboarding step shown immediately after login (or after a
 * forced password change). Greets the user by role and bridges to the
 * permission-priming step (OB-2).
 *
 * Resolves design ambiguity #6 (ui-ux.md): three CTA copy variants — clockable
 * worker, staff_kecamatan, admin.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NBBadge, NBButton, NBText } from '../../components/nb';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
import { useAppSelector } from '../../store/hooks';

const ROLE_COPY: Record<
  string,
  { greeting: string; subtitle: string; badge: string }
> = {
  satgas: {
    greeting: 'Selamat datang, Satgas',
    subtitle: 'Anda akan menjaga ruang hijau Surabaya hari ini.',
    badge: 'SATGAS',
  },
  linmas: {
    greeting: 'Selamat datang, Linmas',
    subtitle: 'Anda akan menjaga ruang hijau Surabaya hari ini.',
    badge: 'LINMAS',
  },
  korlap: {
    greeting: 'Selamat datang, Koordinator',
    subtitle: 'Tim Anda menunggu arahan.',
    badge: 'KORLAP',
  },
  kepala_rayon: {
    greeting: 'Selamat datang, Kepala Rayon',
    subtitle: 'Pantau kinerja rayon Anda.',
    badge: 'KEPALA RAYON',
  },
  admin_data: {
    greeting: 'Selamat datang, Admin Data',
    subtitle: 'Tinjau dan disposisi permohonan masuk.',
    badge: 'ADMIN DATA',
  },
  staff_kecamatan: {
    greeting: 'Selamat datang, Staff Kecamatan',
    subtitle: 'Ajukan permohonan perantingan dengan beberapa klik.',
    badge: 'STAFF KECAMATAN',
  },
  top_management: {
    greeting: 'Selamat datang',
    subtitle: 'Akses ringkasan kinerja kota.',
    badge: 'TOP MANAGEMENT',
  },
  admin_system: {
    greeting: 'Selamat datang, Admin Sistem',
    subtitle: 'Anda memiliki akses penuh konfigurasi sistem.',
    badge: 'ADMIN SISTEM',
  },
  superadmin: {
    greeting: 'Selamat datang, Superadmin',
    subtitle: 'Anda memiliki akses penuh sistem.',
    badge: 'SUPERADMIN',
  },
};

const FALLBACK = {
  greeting: 'Selamat datang',
  subtitle: 'Mari mulai.',
  badge: 'USER',
};

export function OnboardingWelcomeScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const user = useAppSelector((s) => s.auth.user);
  const copy = (user?.role ? ROLE_COPY[user.role] : null) ?? FALLBACK;

  return (
    <SafeAreaView
      style={[
        styles.root,
        { backgroundColor: (nbColors as Record<string, string>).paper ?? '#F5F0EB' },
      ]}
      testID="onboarding-welcome-screen"
    >
      <View style={styles.content}>
        <View style={styles.hero}>
          <NBBadge color="primary" text={copy.badge} />
          <NBText variant="display" style={styles.greeting}>
            {copy.greeting}
            {user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}.
          </NBText>
          <NBText variant="body" style={styles.subtitle}>
            {copy.subtitle}
          </NBText>
        </View>

        <NBButton
          title="Lanjut"
          variant="primary"
          fullWidth
          onPress={() => navigation.navigate('OnboardingPermissions' as never)}
          testID="onboarding-welcome-continue"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flex: 1,
    padding: nbSpacing?.lg ?? 24,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
    alignItems: 'flex-start',
  },
  greeting: {},
  subtitle: { opacity: 0.85 },
});

export default OnboardingWelcomeScreen;
