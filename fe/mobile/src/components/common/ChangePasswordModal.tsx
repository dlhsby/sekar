import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBTextInput, NBAlert, NBModal } from '../nb';
import { changePassword } from '../../services/api/usersApi';
import { nbColors, nbSpacing, nbTypography, nbBorders } from '../../constants/nbTokens';

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
}: ChangePasswordModalProps): JSX.Element {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const resetForm = useCallback(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setIsLoading(false);
    setError('');
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
    } else if (newPassword.length < 6) {
      errors.newPassword = 'Password baru minimal 6 karakter';
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
    setError('');
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await changePassword(currentPassword, newPassword);

      if (response.error) {
        setError(response.error);
        setIsLoading(false);
      } else {
        setSuccess(true);
        setTimeout(() => {
          handleClose();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mengubah password');
      setIsLoading(false);
    }
  }, [currentPassword, newPassword, validateForm, handleClose]);

  const togglePasswordVisibility = useCallback(
    (field: 'current' | 'new' | 'confirm') => {
      switch (field) {
        case 'current':
          setShowCurrentPassword((prev) => !prev);
          break;
        case 'new':
          setShowNewPassword((prev) => !prev);
          break;
        case 'confirm':
          setShowConfirmPassword((prev) => !prev);
          break;
      }
    },
    [],
  );

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
            <Text style={styles.cancelButtonText}>Batal</Text>
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
              <Text style={styles.submitButtonText}>{success ? 'Berhasil!' : 'Ubah Password'}</Text>
            )}
          </TouchableOpacity>
        </View>
      }
    >
      {success && (
        <View style={styles.successBanner}>
          <MaterialCommunityIcons name="check-circle" size={20} color={nbColors.success} />
          <Text style={styles.successText}>Password berhasil diubah!</Text>
        </View>
      )}

      {error ? (
        <NBAlert
          variant="danger"
          message={error}
          dismissible
          onDismiss={() => setError('')}
          testID="change-password-error"
        />
      ) : null}

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <NBTextInput
            label="Password Saat Ini"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showCurrentPassword}
            placeholder="Masukkan password saat ini"
            error={validationErrors.currentPassword}
            editable={!isLoading && !success}
            autoCapitalize="none"
            accessibilityHint="Masukkan password Anda saat ini"
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => togglePasswordVisibility('current')}
            disabled={isLoading || success}
            accessibilityRole="button"
            accessibilityLabel={
              showCurrentPassword ? 'Sembunyikan password saat ini' : 'Tampilkan password saat ini'
            }
          >
            <MaterialCommunityIcons
              name={showCurrentPassword ? 'eye-off' : 'eye'}
              size={24}
              color={nbColors.gray['600']}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <NBTextInput
            label="Password Baru"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNewPassword}
            placeholder="Masukkan password baru (min. 6 karakter)"
            error={validationErrors.newPassword}
            editable={!isLoading && !success}
            autoCapitalize="none"
            accessibilityHint="Masukkan password baru minimal 6 karakter"
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => togglePasswordVisibility('new')}
            disabled={isLoading || success}
            accessibilityRole="button"
            accessibilityLabel={
              showNewPassword ? 'Sembunyikan password baru' : 'Tampilkan password baru'
            }
          >
            <MaterialCommunityIcons
              name={showNewPassword ? 'eye-off' : 'eye'}
              size={24}
              color={nbColors.gray['600']}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <NBTextInput
            label="Konfirmasi Password Baru"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            placeholder="Ketik ulang password baru"
            error={validationErrors.confirmPassword}
            editable={!isLoading && !success}
            autoCapitalize="none"
            accessibilityHint="Ketik ulang password baru untuk konfirmasi"
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => togglePasswordVisibility('confirm')}
            disabled={isLoading || success}
            accessibilityRole="button"
            accessibilityLabel={
              showConfirmPassword ? 'Sembunyikan konfirmasi password' : 'Tampilkan konfirmasi password'
            }
          >
            <MaterialCommunityIcons
              name={showConfirmPassword ? 'eye-off' : 'eye'}
              size={24}
              color={nbColors.gray['600']}
            />
          </TouchableOpacity>
        </View>
      </View>
    </NBModal>
  );
}

const styles = StyleSheet.create({
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: nbColors.successLight,
    padding: nbSpacing.md,
    borderWidth: nbBorders.base,
    borderColor: nbColors.success,
    marginBottom: nbSpacing.md,
  },
  successText: {
    marginLeft: nbSpacing.sm,
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.success,
    flex: 1,
  },
  form: {
    marginBottom: nbSpacing.sm,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: nbSpacing.md,
  },
  eyeButton: {
    position: 'absolute',
    right: nbSpacing.md,
    top: 38,
    padding: nbSpacing.xs,
    zIndex: 10,
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
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    minHeight: 46,
  },
  cancelButton: {
    backgroundColor: nbColors.white,
  },
  cancelButtonText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    letterSpacing: 0.3,
  },
  submitButton: {
    backgroundColor: nbColors.primary,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.white,
    letterSpacing: 0.3,
  },
});

export default ChangePasswordModal;
