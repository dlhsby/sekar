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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // The temporary password isn't re-entered (the user already authenticated with
  // it); the server gates the forced change on the JWT + password_must_change flag
  // and rejects re-using the temp password.
  const rules = [
    { label: t('profile:changePassword.rules.minLength'), met: newPassword.length >= 6 },
    { label: t('profile:changePassword.rules.match'), met: confirmPassword.length > 0 && newPassword === confirmPassword },
  ];
  const allValid = rules.every((r) => r.met);

  const handleSubmit = useCallback(async () => {
    if (!allValid) return;
    setSubmitting(true);
    try {
      const res = await changePasswordAndRotate(newPassword);
      const data = res.data;
      if (!data || !data.access_token) {
        NBToast.show({ level: 'danger', title: t('profile:edit.toast.error'), body: res.error ?? t('profile:changePassword.errors.noResponse') });
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
      const message = err instanceof Error ? err.message : t('profile:changePassword.errors.generic');
      if (/differ|invalid.credentials|AUTH_INVALID/i.test(message)) {
        NBToast.show({
          level: 'danger',
          title: t('profile:edit.toast.error'),
          body: t('profile:changePassword.errors.newDifferentFromOld'),
        });
      } else {
        NBToast.show({ level: 'danger', title: t('profile:edit.toast.error'), body: message });
      }
    } finally {
      setSubmitting(false);
    }
  }, [t, allValid, newPassword, dispatch]);

  const handleLogout = useCallback(async () => {
    await clearAll();
    dispatch(logout());
  }, [dispatch]);

  if (success) {
    return (
      <SuccessOverlay
        title={t('profile:changePassword.success.title')}
        subtitle={t('profile:changePassword.success.subtitle')}
        testID="change-password-success"
      />
    );
  }

  return (
    <SafeAreaView style={styles.root} testID="change-password-screen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          <NBText variant="h1">{t('profile:changePassword.title')}</NBText>

          <NBAlert
            variant="warning"
            title={t('profile:changePassword.alert.title')}
            message={t('profile:changePassword.alert.message')}
          />

          <NBPasswordInput
            label={t('profile:changePassword.newPassword')}
            placeholder={t('profile:changePassword.newPasswordPlaceholder')}
            value={newPassword}
            onChangeText={setNewPassword}
            editable={!submitting}
            testID="change-password-new"
          />
          <NBPasswordInput
            label={t('profile:changePassword.confirmPassword')}
            placeholder={t('profile:changePassword.confirmPasswordPlaceholder')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!submitting}
            testID="change-password-confirm"
          />

          <RequirementChecklist title={t('profile:changePassword.rules.title')} rules={rules} testID="change-password-rules" />

          <NBButton
            title={t('profile:changePassword.submit')}
            onPress={handleSubmit}
            loading={submitting}
            disabled={!allValid || submitting}
            fullWidth
            variant="primary"
            testID="change-password-submit"
          />
          <NBButton
            title={t('profile:changePassword.logout')}
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
