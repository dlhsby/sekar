/**
 * OnboardingWelcomeScreen — Phase 4 M3 / ADR-042 / Hifi OB-1
 *
 * First onboarding step after login (or a forced password change). Greets the
 * user by name and bridges to the permission primer. Permissions are enforced —
 * there is no skip option.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NBButton, NBText } from '../../components/nb';
import { PaginationDots } from '../../components/auth/PaginationDots';
import { nbColors, nbBorders, nbRadius, nbShadows, nbSpacing } from '../../constants/nbTokens';
import { useAppSelector } from '../../store/hooks';

export function OnboardingWelcomeScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const user = useAppSelector((s) => s.auth.user);
  const firstName = user?.full_name?.trim().split(' ')[0] ?? '';

  return (
    <SafeAreaView style={styles.root} testID="onboarding-welcome-screen">
      <View style={styles.content}>
        <PaginationDots variant="bars" total={3} index={0} style={styles.dots} />

        <View style={styles.illo}>
          <View style={styles.siapPill}>
            <NBText variant="mono-sm" color="successDark">
              SIAP
            </NBText>
          </View>
          <Text style={styles.wave}>👋</Text>
        </View>

        <NBText variant="h1">Hai,</NBText>
        {firstName ? (
          <View style={styles.nameChip}>
            <NBText variant="h1">{firstName}</NBText>
          </View>
        ) : null}

        <NBText variant="body-sm" color="gray700" style={styles.body}>
          SEKAR butuh sedikit setup biar kamu bisa langsung ke lapangan. Cuma sebentar, sekali saja.
        </NBText>

        <View style={styles.spacer} />

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
  root: { flex: 1, backgroundColor: nbColors.bgCanvas },
  content: { flex: 1, padding: nbSpacing.lg },
  dots: { marginBottom: nbSpacing.xl },
  illo: {
    height: 200,
    backgroundColor: nbColors.bgAccentMint,
    borderWidth: nbBorders.widthThick,
    borderColor: nbColors.black,
    borderRadius: nbRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: nbSpacing.lg,
    ...nbShadows.md,
  },
  siapPill: {
    position: 'absolute',
    top: nbSpacing.md,
    right: nbSpacing.md,
    backgroundColor: nbColors.statusActiveBg,
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.black,
    borderRadius: nbRadius.full,
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
  },
  wave: { fontSize: 80, transform: [{ rotate: '-3deg' }] },
  nameChip: {
    alignSelf: 'flex-start',
    backgroundColor: nbColors.primary,
    borderWidth: nbBorders.widthThick,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    marginTop: nbSpacing.xs,
    transform: [{ rotate: '-1deg' }],
  },
  body: { marginTop: nbSpacing.md },
  spacer: { flex: 1 },
});

export default OnboardingWelcomeScreen;
