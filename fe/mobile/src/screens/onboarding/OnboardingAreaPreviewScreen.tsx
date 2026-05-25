/**
 * OnboardingAreaPreviewScreen — Phase 4 M3b / ADR-042 / Hifi OB-3
 *
 * Final onboarding step. Sets `onboarding_completed:{userId}=true` then exits
 * the onboarding gate.
 *
 * Resolves design ambiguity #6 (ui-ux.md): 3 role-aware variants —
 *   - clockable (satgas/linmas/korlap/kepala_rayon): area preview + "Mulai Bekerja"
 *   - staff_kecamatan: permohonan list teaser + "Kelola Permohonan"
 *   - admin (admin_data/admin_system/superadmin/top_management): dashboard CTA
 */

import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NBButton, NBCard, NBText } from '../../components/nb';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
import { useAppSelector } from '../../store/hooks';
import { markOnboardingCompleted } from '../../services/storage/asyncStorageKeys';

type FlowVariant = 'clockable' | 'kecamatan' | 'admin';

function variantFor(role: string | undefined): FlowVariant {
  if (!role) return 'admin';
  if (['satgas', 'linmas', 'korlap', 'kepala_rayon'].includes(role)) return 'clockable';
  if (role === 'staff_kecamatan') return 'kecamatan';
  return 'admin';
}

const VARIANT_COPY: Record<FlowVariant, { title: string; body: string; cta: string }> = {
  clockable: {
    title: 'Siap bekerja?',
    body: 'Area kerja Anda telah ditetapkan. Tekan Mulai Bekerja untuk membuka dashboard.',
    cta: 'Mulai Bekerja',
  },
  kecamatan: {
    title: 'Siap mengajukan permohonan?',
    body: 'Buka daftar permohonan rayon Anda dan ajukan baru kapan pun diperlukan.',
    cta: 'Kelola Permohonan',
  },
  admin: {
    title: 'Siap memulai?',
    body: 'Dashboard menampilkan ringkasan tim dan permohonan yang menunggu.',
    cta: 'Buka Dashboard',
  },
};

export function OnboardingAreaPreviewScreen(): React.JSX.Element {
  const user = useAppSelector((s) => s.auth.user);
  const variant = variantFor(user?.role);
  const copy = VARIANT_COPY[variant];

  const finish = useCallback(async () => {
    if (user?.id) {
      await markOnboardingCompleted(user.id);
    }
    // RootNavigator re-reads the flag on next render via the gate query; we
    // don't navigate manually — the gate observer drops us at MainTabs.
  }, [user]);

  return (
    <SafeAreaView
      style={[
        styles.root,
        { backgroundColor: (nbColors as Record<string, string>).paper ?? '#F5F0EB' },
      ]}
      testID="onboarding-area-preview-screen"
    >
      <View style={styles.content}>
        <View style={styles.hero}>
          <NBText variant="h1">{copy.title}</NBText>
          <NBText variant="body" style={styles.body}>
            {copy.body}
          </NBText>
        </View>

        <NBCard style={styles.previewCard} testID={`area-preview-${variant}`}>
          {variant === 'clockable' && user?.area_id ? (
            <>
              <NBText variant="caption">AREA</NBText>
              <NBText variant="h3">{user.area_id}</NBText>
            </>
          ) : null}
          {variant === 'kecamatan' ? (
            <NBText variant="body">
              Anda dapat mengajukan permohonan kapan saja melalui tab Perantingan.
            </NBText>
          ) : null}
          {variant === 'admin' ? (
            <NBText variant="body">
              Dashboard utama akan menampilkan permohonan masuk dan ringkasan kinerja.
            </NBText>
          ) : null}
        </NBCard>

        <NBButton
          title={copy.cta}
          variant="primary"
          fullWidth
          onPress={finish}
          testID="onboarding-area-preview-finish"
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
    gap: 16,
    justifyContent: 'space-between',
  },
  hero: { gap: 8 },
  body: { opacity: 0.85 },
  previewCard: { gap: 8 },
});

export default OnboardingAreaPreviewScreen;
