import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
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

/** Backend (auth DTO) requires ≥ 8 chars; we additionally enforce letters + digits. */
const MIN_PASSWORD_LENGTH = 8;

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
      errors.currentPassword = 'Password saat ini wajib diisi';
    }

    if (!newPassword.trim()) {
      errors.newPassword = 'Password baru wajib diisi';
    } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
      errors.newPassword = `Password baru minimal ${MIN_PASSWORD_LENGTH} karakter`;
    } else if (!(/[A-Za-z]/.test(newPassword) && /\d/.test(newPassword))) {
      errors.newPassword = 'Password baru harus berisi huruf dan angka';
    } else if (newPassword === currentPassword) {
      errors.newPassword = 'Password baru harus berbeda dari password lama';
    }

    if (!confirmPassword.trim()) {
      errors.confirmPassword = 'Konfirmasi password wajib diisi';
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = 'Konfirmasi password tidak cocok';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [currentPassword, newPassword, confirmPassword]);

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
        NBToast.show({ level: 'success', title: 'Berhasil', body: 'Password berhasil diubah.' });
        setTimeout(() => {
          handleClose();
        }, 1500);
        return;
      }

      // Map known backend failures: field-specific ones inline, generic to a toast.
      const code = response.code ?? '';
      const message = response.error ?? 'Gagal mengubah password';
      if (code === 'AUTH_INVALID_CREDENTIALS' || /old password|password lama|incorrect/i.test(message)) {
        setValidationErrors((prev) => ({ ...prev, currentPassword: 'Password saat ini salah' }));
      } else if (/differ|different|berbeda|sama/i.test(message)) {
        setValidationErrors((prev) => ({ ...prev, newPassword: 'Password baru harus berbeda dari password lama' }));
      } else {
        NBToast.show({ level: 'danger', title: 'Gagal', body: message });
      }
      setIsLoading(false);
    } catch (err: any) {
      NBToast.show({ level: 'danger', title: 'Gagal', body: err?.message || 'Gagal mengubah password' });
      setIsLoading(false);
    }
  }, [currentPassword, newPassword, validateForm, handleClose, dispatch]);

  return (
    <NBModal
      visible={visible}
      onClose={handleClose}
      title="Ubah Password"
      avoidKeyboard
      footer={
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleClose}
            disabled={isLoading || success}
            accessibilityRole="button"
            accessibilityLabel="Batal"
          >
            <NBText variant="body-sm" color="black" uppercase style={styles.actionButtonText}>
              Batal
            </NBText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.submitButton, (isLoading || success) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading || success}
            accessibilityRole="button"
            accessibilityLabel={success ? 'Berhasil' : 'Ubah Password'}
            testID="change-password-submit"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={nbColors.white} testID="change-password-submit-spinner" />
            ) : (
              <NBText variant="body-sm" color="white" uppercase style={styles.actionButtonText}>
                {success ? 'Berhasil!' : 'Ubah Password'}
              </NBText>
            )}
          </TouchableOpacity>
        </View>
      }
    >
      <View style={styles.form}>
        <NBPasswordInput
          label="Password Saat Ini"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Password saat ini"
          error={validationErrors.currentPassword}
          editable={!isLoading && !success}
          autoCapitalize="none"
          accessibilityHint="Masukkan password Anda saat ini"
          testID="change-password-current"
        />

        <NBPasswordInput
          label="Password Baru"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Min. 8 karakter"
          error={validationErrors.newPassword}
          editable={!isLoading && !success}
          autoCapitalize="none"
          accessibilityHint="Masukkan password baru minimal 6 karakter"
          testID="change-password-new"
        />

        <NBPasswordInput
          label="Konfirmasi Password Baru"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Ketik ulang password baru"
          error={validationErrors.confirmPassword}
          editable={!isLoading && !success}
          autoCapitalize="none"
          accessibilityHint="Ketik ulang password baru untuk konfirmasi"
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
