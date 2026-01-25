/**
 * Login Screen
 * Authentication screen for username/password login
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  type TextInput as TextInputType,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, typography, spacing } from '../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setLoading, setUser, setError } from '../../store/slices/authSlice';
import { login, getMe } from '../../services/api/authApi';
import { setToken, setRefreshToken, setUser as setUserStorage } from '../../services/storage/secureStorage';
import { loadAndSyncCurrentShift } from '../../services/shift';
import { isValidUsername, isValidPassword } from '../../utils/validators';
import type { LoginResponse } from '../../types/api.types';

function LoginScreen(): React.JSX.Element {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const passwordInputRef = useRef<TextInputType>(null);

  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const handleLogin = async () => {
    // Reset errors
    setUsernameError('');
    setPasswordError('');

    // Validate inputs
    if (!isValidUsername(username)) {
      setUsernameError('Username harus diisi (minimal 3 karakter)');
      return;
    }

    if (!isValidPassword(password)) {
      setPasswordError('Password harus diisi (minimal 6 karakter)');
      return;
    }

    // Attempt login
    dispatch(setLoading(true));

    try {
      const response = await login(username, password);

      if (response.error || !response.data) {
        dispatch(setError(response.error || 'Login gagal'));
        Alert.alert('Error', response.error || 'Login gagal');
        return;
      }

      // Type-safe response handling
      const loginData = response.data as LoginResponse;

      // Store access token and refresh token
      if (!loginData.access_token) {
        dispatch(setError('Invalid response from server'));
        Alert.alert('Error', 'Invalid response from server');
        return;
      }

      await setToken(loginData.access_token);

      // Store refresh token if provided (two-token system)
      if (loginData.refresh_token) {
        await setRefreshToken(loginData.refresh_token);
      }

      await setUserStorage(loginData.user);

      // Fetch assigned area for worker users
      let assignedArea = null;
      if (loginData.user.role === 'worker') {
        try {
          const meResponse = await getMe();
          if (meResponse.data && meResponse.data.assigned_area) {
            // Ensure GPS coordinates are numbers, not strings
            assignedArea = {
              ...meResponse.data.assigned_area,
              gps_lat: Number(meResponse.data.assigned_area.gps_lat),
              gps_lng: Number(meResponse.data.assigned_area.gps_lng),
              radius_meters: Number(meResponse.data.assigned_area.radius_meters),
            };
          }
        } catch (err) {
          console.warn('Failed to fetch assigned area:', err);
          // Continue without assigned area - user can still login
        }
      }

      // Update Redux state with user and assigned area
      dispatch(setUser({ user: loginData.user, area: assignedArea }));

      // Load current shift for workers only (supervisors/admins don't have shifts)
      // This ensures the home screen shows correct shift status immediately after login
      if (loginData.user.role === 'worker') {
        loadAndSyncCurrentShift(dispatch).catch((err) =>
          console.warn('Shift sync after login failed:', err),
        );
      }
    } catch (err: any) {
      dispatch(setError(err.message || 'Terjadi kesalahan'));
      Alert.alert('Error', err.message || 'Terjadi kesalahan');
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}>
        <View style={styles.content}>
          {/* Logo/Title */}
          <View style={styles.header}>
            {/* Logo icon container */}
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons
                name="leaf"
                size={56}
                color={colors.white}
              />
            </View>
            <Text style={styles.title}>SEKAR</Text>
            <Text style={styles.subtitle}>
              Sistem Evaluasi Kerja Satgas RTH
            </Text>
            <Text style={styles.organization}>DLH Kota Surabaya</Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            {/* Username Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={[styles.input, usernameError && styles.inputError]}
                placeholder="Masukkan username"
                placeholderTextColor={colors.textHint}
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  setUsernameError('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                blurOnSubmit={false}
              />
              {usernameError ? (
                <Text style={styles.errorText}>{usernameError}</Text>
              ) : null}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.passwordInputWrapper, passwordError && styles.inputError]}>
                <TextInput
                  ref={passwordInputRef}
                  style={styles.passwordInput}
                  placeholder="Masukkan password"
                  placeholderTextColor={colors.textHint}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setPasswordError('');
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                  accessibilityLabel={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons
                    name={showPassword ? 'eye' : 'eye-off'}
                    size={24}
                    color={showPassword ? colors.primary : colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {passwordError ? (
                <Text style={styles.errorText}>{passwordError}</Text>
              ) : null}
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Masuk</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>DLH Surabaya © 2026</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    // Shadow for elevation
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  organization: {
    fontSize: typography.fontSize.xs,
    color: colors.textHint,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  form: {
    marginBottom: spacing.xl,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    backgroundColor: colors.white,
    color: colors.textPrimary,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  passwordToggle: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputError: {
    borderColor: colors.error,
  },
  errorContainer: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.error + '10',
    borderRadius: 8,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  footerText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
});

export default LoginScreen;

