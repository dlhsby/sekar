/**
 * ChangePasswordScreen — Phase 4 M3 / ADR-041 / Hifi AS-5 + AS-5b
 *
 * Forced after an admin reset (`password_must_change`): RootNavigator routes here
 * before onboarding with back-navigation disabled; the only escape is "Keluar &
 * login lain". Live requirement checklist gates the submit; on success a brief
 * confirmation (AS-5b) shows before RootNavigator routes onward.
 */

import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NBAlert, NBButton, NBPasswordInput, NBText, NBToast } from '../../components/nb';
import { RequirementChecklist } from '../../components/common/RequirementChecklist';
import { SuccessOverlay } from '../../components/common/SuccessOverlay';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
import { useAppDispatch } from '../../store/hooks';
import { setUser, logout } from '../../store/slices/authSlice';
import { changePasswordAndRotate } from '../../services/api/authApi';
import {
  setToken,
  setRefreshToken,
  setUser as setUserStorage,
  clearAll,
} from '../../services/storage/secureStorage';

const REDIRECT_MS = 1500;

export function ChangePasswordScreen(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const rules = [
    { label: 'Minimal 8 karakter', met: newPassword.length >= 8 },
    { label: 'Berisi huruf dan angka', met: /[A-Za-z]/.test(newPassword) && /\d/.test(newPassword) },
    { label: 'Berbeda dari sandi sementara', met: newPassword.length > 0 && newPassword !== oldPassword },
    { label: 'Konfirmasi cocok', met: confirmPassword.length > 0 && newPassword === confirmPassword },
  ];
  const allValid = oldPassword.length > 0 && rules.every((r) => r.met);

  const handleSubmit = useCallback(async () => {
    if (!allValid) return;
    setSubmitting(true);
    try {
      const res = await changePasswordAndRotate(oldPassword, newPassword);
      const data = res.data;
      if (!data || !data.access_token) {
        NBToast.show({ level: 'danger', title: 'Gagal', body: res.error ?? 'Tidak ada respons dari server.' });
        return;
      }
      // Persist the rotated pair + user before flipping Redux, so a storage failure
      // can't leave us "logged in with the new password" in state only.
      await Promise.all([
        setToken(data.access_token),
        data.refresh_token ? setRefreshToken(data.refresh_token) : Promise.resolve(),
        setUserStorage(data.user),
      ]);
      // Show the AS-5b confirmation, then let RootNavigator route on the cleared flag.
      setSuccess(true);
      setTimeout(() => dispatch(setUser({ user: data.user })), REDIRECT_MS);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan.';
      if (/old.password|invalid.credentials|AUTH_INVALID/i.test(message)) {
        NBToast.show({ level: 'danger', title: 'Gagal', body: 'Sandi sementara salah.' });
      } else {
        NBToast.show({ level: 'danger', title: 'Gagal', body: message });
      }
    } finally {
      setSubmitting(false);
    }
  }, [allValid, oldPassword, newPassword, dispatch]);

  const handleLogout = useCallback(async () => {
    await clearAll();
    dispatch(logout());
  }, [dispatch]);

  if (success) {
    return (
      <SuccessOverlay
        title="Sandi tersimpan"
        subtitle="Mengarahkan ke beranda…"
        testID="change-password-success"
      />
    );
  }

  return (
    <SafeAreaView style={styles.root} testID="change-password-screen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          <NBText variant="h1">Buat Sandi Baru</NBText>

          <NBAlert
            variant="warning"
            title="Sandi sementara harus diganti"
            message="Demi keamanan, buat sandi baru sebelum melanjutkan."
          />

          <NBPasswordInput
            label="Sandi Sementara"
            placeholder="Dari WhatsApp admin"
            value={oldPassword}
            onChangeText={setOldPassword}
            editable={!submitting}
            testID="change-password-old"
          />
          <NBPasswordInput
            label="Sandi Baru"
            placeholder="Masukkan sandi baru"
            value={newPassword}
            onChangeText={setNewPassword}
            editable={!submitting}
            testID="change-password-new"
          />
          <NBPasswordInput
            label="Konfirmasi Sandi Baru"
            placeholder="Ulangi sandi baru"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!submitting}
            testID="change-password-confirm"
          />

          <RequirementChecklist title="Syarat Sandi" rules={rules} testID="change-password-rules" />

          <NBButton
            title="Simpan & Masuk"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!allValid || submitting}
            fullWidth
            variant="primary"
            testID="change-password-submit"
          />
          <NBButton
            title="Keluar & login lain"
            onPress={handleLogout}
            disabled={submitting}
            fullWidth
            variant="ghost"
            testID="change-password-logout"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: nbColors.bgCanvas },
  flex: { flex: 1 },
  content: { padding: nbSpacing.lg, gap: nbSpacing.md },
});

export default ChangePasswordScreen;
