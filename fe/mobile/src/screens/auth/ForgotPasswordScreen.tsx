/**
 * ForgotPasswordScreen — Phase 4 M3 / ADR-041 / Hifi AS-4
 *
 * SEKAR has no self-serve reset — credentials are admin-controlled. We show a
 * support hotline (WhatsApp + phone) so the user can request a temporary password.
 * Reached from Login → "Lupa Kata Sandi?"; exit via "Kembali ke Login" or the
 * device back button (no in-screen app-bar).
 *
 * NOTE: contacts are static for now. `/rayons` is auth-protected and this is a
 * pre-login screen, and we can't infer the caller's rayon anyway — so a single
 * hotline is shown. TODO: source these from env or a public config/DB endpoint.
 */

import React, { useCallback } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBButton, NBText } from '../../components/nb';
import { ContactChannelCard } from '../../components/auth/ContactChannelCard';
import { nbColors, nbBorders, nbRadius, nbShadows, nbSpacing } from '../../constants/nbTokens';

// Static support hotline — TODO: source from env / public config / DB per region.
const SUPPORT_WHATSAPP = '081200000000';
const SUPPORT_PHONE = '0317788990';

export function ForgotPasswordScreen(): React.JSX.Element {
  const navigation = useNavigation();

  const openTel = useCallback((phone: string) => {
    void Linking.openURL(`tel:${phone}`);
  }, []);

  const openWhatsApp = useCallback((phone: string) => {
    // wa.me wants E.164 without '+'; SEKAR stores `08…` → strip leading 0, prefix 62.
    const e164 = phone.startsWith('0') ? `62${phone.slice(1)}` : phone.replace(/^\+/, '');
    void Linking.openURL(`https://wa.me/${e164}`);
  }, []);

  return (
    <SafeAreaView style={styles.root} testID="forgot-password-screen">
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.lockBox}>
            <MaterialCommunityIcons name="lock-outline" size={36} color={nbColors.black} />
          </View>
          <NBText variant="h2" align="center" style={styles.heroTitle}>
            Sandi tidak bisa di-reset sendiri
          </NBText>
          <NBText variant="body-sm" color="gray600" align="center">
            Akun Anda dikelola admin SEKAR. Hubungi admin untuk meminta sandi baru.
          </NBText>
        </View>

        <ContactChannelCard
          variant="whatsapp"
          title="Chat WhatsApp Admin"
          value={SUPPORT_WHATSAPP}
          onPress={() => openWhatsApp(SUPPORT_WHATSAPP)}
          testID="forgot-wa"
        />
        <ContactChannelCard
          variant="phone"
          title="Telepon Kantor"
          value={SUPPORT_PHONE}
          onPress={() => openTel(SUPPORT_PHONE)}
          testID="forgot-tel"
        />

        <View style={styles.note}>
          <NBText variant="body-sm" color="gray700">
            Setelah sandi di-reset, admin mengirim sandi sementara via WhatsApp. Saat masuk
            pertama kali, Anda wajib membuat sandi baru.
          </NBText>
        </View>

        <View style={styles.spacer} />

        <NBButton
          title="Kembali ke Login"
          variant="secondary"
          fullWidth
          onPress={() => navigation.goBack()}
          testID="forgot-password-back"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: nbColors.bgCanvas },
  content: { flex: 1, padding: nbSpacing.lg, gap: nbSpacing.md },
  hero: { alignItems: 'center', gap: nbSpacing.sm, marginTop: nbSpacing.xl, marginBottom: nbSpacing.sm },
  lockBox: {
    width: 72,
    height: 72,
    backgroundColor: nbColors.bgAccentYellow,
    borderWidth: nbBorders.widthThick,
    borderColor: nbColors.black,
    borderRadius: nbRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: nbSpacing.xs,
    ...nbShadows.sm,
  },
  heroTitle: { marginTop: nbSpacing.xs },
  note: {
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.gray400,
    borderStyle: 'dashed',
    borderRadius: nbRadius.base,
    padding: nbSpacing.md,
    backgroundColor: nbColors.bgSurface,
  },
  spacer: { flex: 1 },
});

export default ForgotPasswordScreen;
