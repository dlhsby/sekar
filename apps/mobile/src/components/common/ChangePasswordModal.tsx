import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NBPasswordInput, NBModal, NBText, NBToast } from '../nb';
import { changePasswordAndRotate } from '../../services/api/authApi';
import {
  setToken,
  setRefreshToken,
  setUser as setUserStorage,
} from '../../services/storage/secureStorage';
import { useAppDispatch } from '../../store/hooks';
import { setUser } from '../../store/slices/authSlice';
import { nbColors, nbSpacing, nbBorders } from '../../constants/nbTokens';

/** Backend (auth DTO) requires ≥ 6 chars; no complexity requirement. */
const MIN_PASSWORD_LENGTH = 6;

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

interface ValidationErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export function ChangePasswordModal({
  visible,
  onClose,
}: ChangePasswordModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const resetForm = useCallback(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsLoading(false);
    setSuccess(false);
    setValidationErrors({});
  }, []);

  const handleClose = useCallback(() => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  }, [isLoading, resetForm, onClose]);

  const validateForm = useCallback((): boolean => {
    const errors: ValidationErrors = {};

    if (!currentPassword.trim()) {
      errors.currentPassword = t('profile:changePassword.validation.currentPasswordRequired');
    }

    if (!newPassword.trim()) {
      errors.newPassword = t('profile:changePassword.validation.newPasswordRequired');
    } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
      errors.newPassword = t('profile:changePassword.validation.newPasswordMinLength');
    } else if (newPassword === currentPassword) {
      errors.newPassword = t('profile:changePassword.validation.newPasswordDifferent');
    }

    if (!confirmPassword.trim()) {
      errors.confirmPassword = t('profile:changePassword.validation.confirmPasswordRequired');
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = t('profile:changePassword.validation.confirmPasswordMatch');
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [t, currentPassword, newPassword, confirmPassword]);

  const handleSubmit = useCallback(async () => {
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // POST /auth/change-password (canonical, ADR-041): proves the current
      // password and returns a rotated token pair the client MUST persist.
      const response = await changePasswordAndRotate(newPassword, currentPassword);
      const data = response.data;

      if (data?.access_token) {
        // Persist the rotated pair + user before flipping Redux so a storage
        // failure can't leave the session valid in state only.
        await Promise.all([
          setToken(data.access_token),
          data.refresh_token ? setRefreshToken(data.refresh_token) : Promise.resolve(),
          setUserStorage(data.user),
        ]);
        dispatch(setUser({ user: data.user }));
        setSuccess(true);
        NBToast.show({ level: 'success', title: t('profile:edit.toast.success'), body: t('profile:changePassword.errors.noResponse') });
        setTimeout(() => {
          handleClose();
        }, 1500);
        return;
      }

      // Map known backend failures: field-specific ones inline, generic to a toast.
      const code = response.code ?? '';
      const message = response.error ?? t('profile:edit.uploadError');
      if (code === 'AUTH_INVALID_CREDENTIALS' || /old password|password lama|incorrect/i.test(message)) {
        setValidationErrors((prev) => ({ ...prev, currentPassword: t('profile:changePassword.validation.currentPasswordWrong') }));
      } else if (/differ|different|berbeda|sama/i.test(message)) {
        setValidationErrors((prev) => ({ ...prev, newPassword: t('profile:changePassword.validation.newPasswordDifferent') }));
      } else {
        NBToast.show({ level: 'danger', title: t('profile:edit.toast.error'), body: message });
      }
      setIsLoading(false);
    } catch (err: any) {
      NBToast.show({ level: 'danger', title: t('profile:edit.toast.error'), body: err?.message || t('profile:edit.uploadError') });
      setIsLoading(false);
    }
  }, [t, currentPassword, newPassword, validateForm, handleClose, dispatch]);

  return (
    <NBModal
      visible={visible}
      onClose={handleClose}
      title={t('profile:changePassword.submitAction')}
      avoidKeyboard
      footer={
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleClose}
            disabled={isLoading || success}
            accessibilityRole="button"
            accessibilityLabel={t('profile:edit.cancel')}
          >
            <NBText variant="body-sm" color="black" uppercase style={styles.actionButtonText}>
              {t('profile:edit.cancel')}
            </NBText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.submitButton, (isLoading || success) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading || success}
            accessibilityRole="button"
            accessibilityLabel={success ? t('profile:edit.toast.success') : t('profile:changePassword.submitAction')}
            testID="change-password-submit"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={nbColors.white} testID="change-password-submit-spinner" />
            ) : (
              <NBText variant="body-sm" color="white" uppercase style={styles.actionButtonText}>
                {success ? `${t('profile:edit.toast.success')}!` : t('profile:changePassword.submitAction')}
              </NBText>
            )}
          </TouchableOpacity>
        </View>
      }
    >
      <View style={styles.form}>
        <NBPasswordInput
          label={t('profile:changePassword.currentPassword')}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder={t('profile:changePassword.currentPasswordPlaceholder')}
          error={validationErrors.currentPassword}
          editable={!isLoading && !success}
          autoCapitalize="none"
          accessibilityHint={t('profile:changePassword.currentPasswordPlaceholder')}
          testID="change-password-current"
        />

        <NBPasswordInput
          label={t('profile:changePassword.newPassword')}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder={t('profile:changePassword.newPasswordPlaceholder')}
          error={validationErrors.newPassword}
          editable={!isLoading && !success}
          autoCapitalize="none"
          accessibilityHint={t('profile:changePassword.newPasswordPlaceholder')}
          testID="change-password-new"
        />

        <NBPasswordInput
          label={t('profile:changePassword.confirmPassword')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder={t('profile:changePassword.confirmPasswordPlaceholder')}
          error={validationErrors.confirmPassword}
          editable={!isLoading && !success}
          autoCapitalize="none"
          accessibilityHint={t('profile:changePassword.confirmPasswordPlaceholder')}
          testID="change-password-confirm"
        />
      </View>
    </NBModal>
  );
}

const styles = StyleSheet.create({
  form: {
    marginBottom: nbSpacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: nbSpacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    minHeight: 46,
  },
  cancelButton: {
    backgroundColor: nbColors.white,
  },
  submitButton: {
    backgroundColor: nbColors.primary,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default ChangePasswordModal;
