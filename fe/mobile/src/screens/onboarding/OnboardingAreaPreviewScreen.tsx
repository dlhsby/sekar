/**
 * OnboardingAreaPreviewScreen — Phase 4 M3 / ADR-042 / Hifi OB-3
 *
 * Final onboarding step. Marks onboarding complete (storage + Redux) so
 * RootNavigator routes on to Home / the role's landing tab.
 *
 * Reconciliation: the hi-fi shows a rich map + korlap contact card, but the app
 * only has the assigned area (name + radius + coords, from `auth.area`) at this
 * point — no korlap contact — so the korlap card is omitted.
 */

import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBButton, NBCard, NBText } from '../../components/nb';
import { PaginationDots } from '../../components/auth/PaginationDots';
import { nbColors, nbBorders, nbRadius, nbShadows, nbSpacing } from '../../constants/nbTokens';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { completeOnboarding } from '../../store/slices/authSlice';
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
    title: 'Area tugas kamu',
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
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const area = useAppSelector((s) => s.auth.assignedArea);
  const variant = variantFor(user?.role);
  const copy = VARIANT_COPY[variant];

  const finish = useCallback(async () => {
    if (user?.id) await markOnboardingCompleted(user.id);
    dispatch(completeOnboarding());
  }, [user, dispatch]);

  return (
    <SafeAreaView style={styles.root} testID="onboarding-area-preview-screen">
      <View style={styles.content}>
        <PaginationDots variant="bars" total={3} index={2} style={styles.dots} />
        <NBText variant="h2">{copy.title}</NBText>

        {variant === 'clockable' && area ? (
          <>
            <View style={styles.map}>
              <View style={styles.geofence} />
              <MaterialCommunityIcons name="map-marker" size={36} color={nbColors.statusActive} />
              {area.radius_meters ? (
                <View style={styles.radiusChip}>
                  <NBText variant="mono-sm" color="black">
                    RADIUS {area.radius_meters}m
                  </NBText>
                </View>
              ) : null}
            </View>
            <NBCard style={styles.card} testID="area-preview-clockable">
              <NBText variant="mono-sm" color="gray600">
                AREA
              </NBText>
              <NBText variant="h3">{area.name}</NBText>
            </NBCard>
          </>
        ) : (
          <NBCard style={styles.card} testID={`area-preview-${variant}`}>
            <NBText variant="body-sm" color="gray700">
              {copy.body}
            </NBText>
          </NBCard>
        )}

        <View style={styles.spacer} />

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
  root: { flex: 1, backgroundColor: nbColors.bgCanvas },
  content: { flex: 1, padding: nbSpacing.lg },
  dots: { marginBottom: nbSpacing.xl },
  map: {
    height: 170,
    backgroundColor: nbColors.bgAccentMint,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: nbSpacing.md,
    marginBottom: nbSpacing.md,
    overflow: 'hidden',
    ...nbShadows.sm,
  },
  geofence: {
    position: 'absolute',
    top: nbSpacing.md,
    left: nbSpacing.md,
    right: nbSpacing.md,
    bottom: nbSpacing.md,
    borderWidth: nbBorders.widthThick,
    borderColor: nbColors.black,
    borderStyle: 'dashed',
    borderRadius: nbRadius.base,
    opacity: 0.35,
  },
  radiusChip: {
    position: 'absolute',
    bottom: nbSpacing.sm,
    right: nbSpacing.sm,
    backgroundColor: nbColors.primary,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.sm,
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
  },
  card: { gap: nbSpacing.xs },
  spacer: { flex: 1 },
});

export default OnboardingAreaPreviewScreen;
