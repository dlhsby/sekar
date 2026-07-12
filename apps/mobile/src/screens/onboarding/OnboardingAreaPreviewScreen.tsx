/**
 * OnboardingAreaPreviewScreen — Phase 4 M3 / ADR-042 / Hifi OB-3
 *
 * Final onboarding step. Marks onboarding complete (storage + Redux) so
 * RootNavigator routes on to Home / the role's landing tab.
 *
 * Reconciliation: the hi-fi shows a rich map + korlap contact card, but the app
 * only has the assigned area (name + radius + coords, from `auth.location`) at this
 * point — no korlap contact — so the korlap card is omitted.
 */

import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
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

function getVariantCopy(t: ReturnType<typeof useTranslation>['t']): Record<FlowVariant, { title: string; body: string; cta: string }> {
  return {
    clockable: {
      title: t('onboarding:areaPreview.clockable.title'),
      body: t('onboarding:areaPreview.clockable.body'),
      cta: t('onboarding:areaPreview.clockable.cta'),
    },
    kecamatan: {
      title: t('onboarding:areaPreview.kecamatan.title'),
      body: t('onboarding:areaPreview.kecamatan.body'),
      cta: t('onboarding:areaPreview.kecamatan.cta'),
    },
    admin: {
      title: t('onboarding:areaPreview.admin.title'),
      body: t('onboarding:areaPreview.admin.body'),
      cta: t('onboarding:areaPreview.admin.cta'),
    },
  };
}

export function OnboardingAreaPreviewScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const area = useAppSelector((s) => s.auth.assignedArea);
  const variant = variantFor(user?.role);
  const VARIANT_COPY = getVariantCopy(t);
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
                    {t('onboarding:areaPreview.radiusLabel')} {area.radius_meters}m
                  </NBText>
                </View>
              ) : null}
            </View>
            <NBCard style={styles.card} testID="area-preview-clockable">
              <NBText variant="mono-sm" color="gray600">
                {t('onboarding:areaPreview.areaLabel')}
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
  // NBCard's default vertical padding is a compact 8px (for dense lists); the
  // area card needs room to breathe, so give it comfortable 16px all round.
  card: { gap: nbSpacing.xs, padding: nbSpacing.md },
  spacer: { flex: 1 },
});

export default OnboardingAreaPreviewScreen;
