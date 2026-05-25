/**
 * ForgotPasswordScreen — Phase 4 M3 / ADR-041 / Hifi AS-4
 *
 * SEKAR has no self-serve reset — credentials are admin-controlled. We show the
 * rayon admin contacts so the user can WhatsApp / call for a temporary password.
 *
 * Reconciliation: the hi-fi shows two fixed channels; the real feature lists every
 * rayon's contacts (anonymous fetch), styled with the hi-fi contact-card treatment.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBButton, NBCard, NBText } from '../../components/nb';
import { ContactChannelCard } from '../../components/auth/ContactChannelCard';
import { nbColors, nbBorders, nbRadius, nbShadows, nbSpacing } from '../../constants/nbTokens';
import { getRayons } from '../../services/api/rayonsApi';
import type { Rayon } from '../../types/models.types';

interface RayonContact extends Rayon {
  contact_phone?: string | null;
  contact_whatsapp?: string | null;
}

export function ForgotPasswordScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const [rayons, setRayons] = useState<RayonContact[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getRayons();
        if (!cancelled) setRayons((res.data ?? []) as RayonContact[]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Gagal memuat daftar rayon.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      <View style={styles.appbar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          testID="forgot-back"
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color={nbColors.black} />
        </Pressable>
        <NBText variant="h3">Lupa Kata Sandi</NBText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.lockBox}>
            <MaterialCommunityIcons name="lock-outline" size={36} color={nbColors.black} />
          </View>
          <NBText variant="h2" align="center" style={styles.heroTitle}>
            Sandi tidak bisa di-reset sendiri
          </NBText>
          <NBText variant="body-sm" color="gray600" align="center">
            Akun Anda dikelola admin SEKAR. Hubungi admin rayon Anda untuk meminta sandi baru.
          </NBText>
        </View>

        {error ? (
          <NBCard style={styles.stateCard} testID="forgot-password-error">
            <NBText variant="body-sm" color="dangerDark">
              {error}
            </NBText>
          </NBCard>
        ) : null}

        {rayons == null && !error ? (
          <NBText variant="body-sm" color="gray500" style={styles.stateText}>
            Memuat daftar rayon…
          </NBText>
        ) : null}

        {rayons?.length === 0 ? (
          <NBCard testID="forgot-password-empty">
            <NBText variant="body-sm" color="gray600">
              Belum ada kontak rayon yang tersedia.
            </NBText>
          </NBCard>
        ) : null}

        {rayons?.map((r) => (
          <View key={r.id} style={styles.rayonGroup} testID={`rayon-${r.id}`}>
            <NBText variant="mono-sm" color="gray600" uppercase style={styles.rayonName}>
              {r.name}
            </NBText>
            {r.contact_whatsapp ? (
              <ContactChannelCard
                variant="whatsapp"
                title="Chat WhatsApp Admin"
                value={r.contact_whatsapp}
                onPress={() => openWhatsApp(r.contact_whatsapp!)}
                testID={`rayon-wa-${r.id}`}
              />
            ) : null}
            {r.contact_phone ? (
              <ContactChannelCard
                variant="phone"
                title="Telepon Kantor"
                value={r.contact_phone}
                onPress={() => openTel(r.contact_phone!)}
                testID={`rayon-tel-${r.id}`}
              />
            ) : null}
            {!r.contact_whatsapp && !r.contact_phone ? (
              <NBText variant="caption" color="gray500">
                Kontak belum dilengkapi.
              </NBText>
            ) : null}
          </View>
        ))}

        <View style={styles.note}>
          <NBText variant="body-sm" color="gray700">
            Setelah sandi di-reset, admin mengirim sandi sementara via WhatsApp. Saat masuk
            pertama kali, Anda wajib membuat sandi baru.
          </NBText>
        </View>

        <NBButton
          title="Kembali ke Login"
          variant="secondary"
          fullWidth
          onPress={() => navigation.goBack()}
          testID="forgot-password-back"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: nbColors.bgCanvas },
  appbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.sm,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    borderBottomWidth: nbBorders.widthBase,
    borderBottomColor: nbColors.black,
    backgroundColor: nbColors.bgSurface,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nbColors.bgSurface,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    ...nbShadows.xs,
  },
  content: { padding: nbSpacing.lg, gap: nbSpacing.md },
  hero: { alignItems: 'center', gap: nbSpacing.sm, marginBottom: nbSpacing.sm },
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
  stateCard: { borderColor: nbColors.dangerDark },
  stateText: { opacity: 0.8 },
  rayonGroup: { gap: nbSpacing.sm },
  rayonName: { letterSpacing: 0.6 },
  note: {
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.gray400,
    borderStyle: 'dashed',
    borderRadius: nbRadius.base,
    padding: nbSpacing.md,
    backgroundColor: nbColors.bgSurface,
  },
});

export default ForgotPasswordScreen;
