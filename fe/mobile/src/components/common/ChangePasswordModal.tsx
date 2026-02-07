/**
 * Change Password Modal
 * Allows users to change their password with validation
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBButton, NBTextInput, NBAlert } from '../nb';
import { changePassword } from '../../services/api/usersApi';
import { nbColors, nbSpacing, nbTypography, nbBorders, nbShadows, nbBorderRadius } from '../../constants/nbTokens';

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Form validation errors
 */
interface ValidationErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

/**
 * Change Password Modal Component
 */
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

  /**
   * Reset form state
   */
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

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  }, [isLoading, resetForm, onClose]);

  /**
   * Validate form inputs
   */
  const validateForm = useCallback((): boolean => {
    const errors: ValidationErrors = {};

    // Validate current password
    if (!currentPassword.trim()) {
      errors.currentPassword = 'Password saat ini wajib diisi';
    }

    // Validate new password
    if (!newPassword.trim()) {
      errors.newPassword = 'Password baru wajib diisi';
    } else if (newPassword.length < 6) {
      errors.newPassword = 'Password baru minimal 6 karakter';
    } else if (newPassword === currentPassword) {
      errors.newPassword = 'Password baru harus berbeda dari password lama';
    }

    // Validate confirm password
    if (!confirmPassword.trim()) {
      errors.confirmPassword = 'Konfirmasi password wajib diisi';
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = 'Konfirmasi password tidak cocok';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [currentPassword, newPassword, confirmPassword]);

  /**
   * Handle form submit
   */
  const handleSubmit = useCallback(async () => {
    // Clear previous errors
    setError('');
    setSuccess(false);

    // Validate form
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
        // Show success message
        setSuccess(true);

        // Auto-close modal after 1.5 seconds
        setTimeout(() => {
          handleClose();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mengubah password');
      setIsLoading(false);
    }
  }, [currentPassword, newPassword, validateForm, handleClose]);

  /**
   * Toggle password visibility
   */
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
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
      statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}>
          <Pressable style={styles.modalContent} onPress={(e) => e?.stopPropagation?.()}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled">
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Ubah Password</Text>
                <TouchableOpacity
                  onPress={handleClose}
                  disabled={isLoading}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Tutup modal">
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={nbColors.gray[600]}
                  />
                </TouchableOpacity>
              </View>

              {/* Success Message */}
              {success && (
                <View style={styles.successBanner}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={20}
                    color={nbColors.success}
                  />
                  <Text style={styles.successText}>Password berhasil diubah!</Text>
                </View>
              )}

              {/* Error Banner */}
              {error && (
                <NBAlert
                  variant="danger"
                  message={error}
                  dismissible
                  onDismiss={() => setError('')}
                  testID="change-password-error"
                />
              )}

              {/* Form */}
              <View style={styles.form}>
                {/* Current Password */}
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
                      showCurrentPassword
                        ? 'Sembunyikan password saat ini'
                        : 'Tampilkan password saat ini'
                    }>
                    <MaterialCommunityIcons
                      name={showCurrentPassword ? 'eye-off' : 'eye'}
                      size={24}
                      color={nbColors.gray[600]}
                    />
                  </TouchableOpacity>
                </View>

                {/* New Password */}
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
                      showNewPassword
                        ? 'Sembunyikan password baru'
                        : 'Tampilkan password baru'
                    }>
                    <MaterialCommunityIcons
                      name={showNewPassword ? 'eye-off' : 'eye'}
                      size={24}
                      color={nbColors.gray[600]}
                    />
                  </TouchableOpacity>
                </View>

                {/* Confirm Password */}
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
                      showConfirmPassword
                        ? 'Sembunyikan konfirmasi password'
                        : 'Tampilkan konfirmasi password'
                    }>
                    <MaterialCommunityIcons
                      name={showConfirmPassword ? 'eye-off' : 'eye'}
                      size={24}
                      color={nbColors.gray[600]}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actions}>
                <NBButton
                  title={success ? 'Berhasil!' : 'Ubah Password'}
                  onPress={handleSubmit}
                  disabled={isLoading || success}
                  loading={isLoading}
                  variant="primary"
                  fullWidth
                  testID="change-password-submit"
                />
                <NBButton
                  title="Batal"
                  onPress={handleClose}
                  disabled={isLoading || success}
                  variant="secondary"
                  fullWidth
                />
              </View>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: nbColors.overlay,
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: nbColors.white,
    borderTopLeftRadius: 0, // Sharp corners - NB style
    borderTopRightRadius: 0, // Sharp corners - NB style
    borderTopWidth: nbBorders.base,
    borderLeftWidth: nbBorders.base,
    borderRightWidth: nbBorders.base,
    borderColor: nbColors.black,
    maxHeight: '90%',
    ...nbShadows.lg,
  },
  scrollContent: {
    padding: nbSpacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: nbSpacing.lg,
    paddingBottom: nbSpacing.md,
    borderBottomWidth: nbBorders.base,
    borderBottomColor: nbColors.black,
  },
  title: {
    fontSize: nbTypography.fontSize['2xl'],
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
  closeButton: {
    padding: nbSpacing.xs,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: nbColors.successLight,
    padding: nbSpacing.md,
    borderRadius: 0, // Sharp corners - NB style
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
    marginBottom: nbSpacing.lg,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: nbSpacing.md,
  },
  eyeButton: {
    position: 'absolute',
    right: nbSpacing.md,
    top: 38, // Label height + spacing + padding to center vertically
    padding: nbSpacing.xs,
    zIndex: 10,
  },
  actions: {
    gap: nbSpacing.md,
  },
});

export default ChangePasswordModal;
