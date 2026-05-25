/**
 * ChangePasswordScreen — Phase 4 M3a / ADR-041 / Hifi AS-5
 *
 * Used in two flows:
 *   1. Forced — when `user.password_must_change === true` (admin reset).
 *      RootNavigator routes here BEFORE onboarding. Back-navigation is
 *      disabled; user cannot reach the app without changing the password.
 *   2. Voluntary — from Settings (later milestones). Same screen, back enabled.
 *
 * Backend rotates both tokens on success. Caller MUST replace local tokens
 * via secureStorage before continuing.
 */

import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NBButton, NBPasswordInput, NBText, NBToast } from '../../components/nb';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
import { useAppDispatch } from '../../store/hooks';
import { setUser } from '../../store/slices/authSlice';
import { changePasswordAndRotate } from '../../services/api/authApi';
import {
  setToken,
  setRefreshToken,
  setUser as setUserStorage,
} from '../../services/storage/secureStorage';

const MIN_LEN = 8;

export function ChangePasswordScreen(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [oldError, setOldError] = useState('');
  const [newError, setNewError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    setOldError('');
    setNewError('');
    setConfirmError('');

    if (!oldPassword) {
      setOldError('Sandi lama wajib diisi.');
      return;
    }
    if (newPassword.length < MIN_LEN) {
      setNewError(`Sandi baru minimal ${MIN_LEN} karakter.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setConfirmError('Konfirmasi sandi tidak cocok.');
      return;
    }
    if (newPassword === oldPassword) {
      setNewError('Sandi baru harus berbeda dari sandi lama.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await changePasswordAndRotate(oldPassword, newPassword);
      if (!res.data) {
        NBToast.show({
          level: 'danger',
          title: 'Gagal',
          body: res.error ?? 'Tidak ada respons dari server.',
        });
        return;
      }

      // Persist the rotated token pair + updated user before flipping the
      // Redux state. Order matters: if storage fails, we don't claim "logged
      // in with new password" in Redux.
      await Promise.all([
        setToken(res.data.access_token),
        setRefreshToken(res.data.refresh_token),
        setUserStorage(res.data.user),
      ]);
      dispatch(setUser({ user: res.data.user }));

      NBToast.show({
        level: 'success',
        title: 'Sandi diperbarui',
        body: 'Selamat datang.',
      });
      // RootNavigator picks up the cleared `password_must_change` and routes
      // to the next gate (onboarding or home).
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan.';
      // Treat 401-ish errors as wrong old password for UX clarity.
      if (/old.password|invalid.credentials|AUTH_INVALID/i.test(message)) {
        setOldError('Sandi lama tidak benar.');
      } else {
        NBToast.show({ level: 'danger', title: 'Gagal', body: message });
      }
    } finally {
      setSubmitting(false);
    }
  }, [oldPassword, newPassword, confirmPassword, dispatch]);

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: (nbColors as Record<string, string>).paper ?? '#F5F0EB' }]}
      testID="change-password-screen"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <NBText variant="h1">Ubah Sandi</NBText>
            <NBText variant="body" style={styles.subtitle}>
              Admin telah mengatur ulang sandi Anda. Silakan tentukan sandi baru sebelum
              melanjutkan.
            </NBText>
          </View>

          <NBPasswordInput
            label="Sandi lama"
            placeholder="Sandi lama"
            value={oldPassword}
            onChangeText={setOldPassword}
            error={oldError}
            editable={!submitting}
            testID="change-password-old"
          />
          <NBPasswordInput
            label="Sandi baru"
            placeholder={`Minimal ${MIN_LEN} karakter`}
            value={newPassword}
            onChangeText={setNewPassword}
            error={newError}
            editable={!submitting}
            testID="change-password-new"
          />
          <NBPasswordInput
            label="Konfirmasi sandi baru"
            placeholder="Ulangi sandi baru"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={confirmError}
            editable={!submitting}
            testID="change-password-confirm"
          />

          <NBButton
            title="Ubah Sandi"
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            fullWidth
            variant="primary"
            testID="change-password-submit"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flex: 1,
    padding: nbSpacing?.lg ?? 24,
    gap: 16,
    justifyContent: 'center',
  },
  header: { gap: 8, paddingBottom: 8 },
  subtitle: { opacity: 0.85 },
});

export default ChangePasswordScreen;
