/**
 * ForgotPasswordScreen — Phase 4 M3a / ADR-041 / Hifi AS-4
 *
 * Informational screen: SEKAR does NOT support self-serve password reset
 * (per ADR-041 — credentials are sensitive and admins control rotation).
 * Instead we show the user every rayon admin contact so they can call or
 * WhatsApp the right person.
 *
 * Reached from LoginScreen "Lupa sandi?" link. Anonymous fetch — no auth.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NBButton, NBCard, NBText } from '../../components/nb';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
import { getRayons } from '../../services/api/rayonsApi';
import type { Rayon } from '../../types/models.types';

interface RayonContact extends Rayon {
  // Contact fields are optional in case backend rayon rows haven't been
  // populated yet. Screen falls back to a friendly empty state per contact.
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
        if (cancelled) return;
        setRayons((res.data ?? []) as RayonContact[]);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Gagal memuat daftar rayon.');
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
    // wa.me requires E.164 without leading +; Indonesia numbers in SEKAR
    // are stored as `08xxxxxxxx` → strip leading 0, prefix 62.
    const e164 = phone.startsWith('0') ? `62${phone.slice(1)}` : phone.replace(/^\+/, '');
    void Linking.openURL(`https://wa.me/${e164}`);
  }, []);

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: (nbColors as Record<string, string>).paper ?? '#F5F0EB' }]}
      testID="forgot-password-screen"
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <NBText variant="h1">Lupa sandi?</NBText>
          <NBText variant="body" style={styles.subtitle}>
            SEKAR tidak menyediakan reset mandiri. Hubungi admin rayon Anda di bawah ini
            untuk meminta sandi baru.
          </NBText>
        </View>

        {error ? (
          <NBCard style={styles.errorCard} testID="forgot-password-error">
            <NBText variant="body">{error}</NBText>
          </NBCard>
        ) : null}

        {rayons == null && !error ? (
          <NBText variant="body" style={styles.loading}>
            Memuat daftar rayon…
          </NBText>
        ) : null}

        {rayons?.length === 0 ? (
          <NBCard testID="forgot-password-empty">
            <NBText variant="body">Belum ada kontak rayon yang tersedia.</NBText>
          </NBCard>
        ) : null}

        {rayons?.map((r) => (
          <NBCard key={r.id} style={styles.card} testID={`rayon-card-${r.id}`}>
            <NBText variant="h3">{r.name}</NBText>
            {r.contact_phone ? (
              <NBButton
                title={`Telepon ${r.contact_phone}`}
                variant="ghost"
                onPress={() => openTel(r.contact_phone!)}
                testID={`rayon-tel-${r.id}`}
              />
            ) : null}
            {r.contact_whatsapp ? (
              <NBButton
                title={`WhatsApp ${r.contact_whatsapp}`}
                variant="ghost"
                onPress={() => openWhatsApp(r.contact_whatsapp!)}
                testID={`rayon-wa-${r.id}`}
              />
            ) : null}
            {!r.contact_phone && !r.contact_whatsapp ? (
              <NBText variant="caption">Kontak belum dilengkapi.</NBText>
            ) : null}
          </NBCard>
        ))}

        <NBButton
          title="Kembali ke Masuk"
          variant="ghost"
          fullWidth
          onPress={() => navigation.goBack()}
          testID="forgot-password-back"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    padding: nbSpacing?.lg ?? 24,
    gap: 16,
  },
  header: { gap: 8 },
  subtitle: { opacity: 0.85 },
  card: { gap: 8 },
  errorCard: { borderColor: '#DC2626' },
  loading: { opacity: 0.6 },
});

export default ForgotPasswordScreen;
