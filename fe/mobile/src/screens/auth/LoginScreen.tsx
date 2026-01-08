/**
 * Login Screen
 * Authentication screen for username/password login
 */

import React, { useState } from 'react';
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
} from 'react-native';
import { colors, typography, spacing } from '../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setLoading, setUser, setError } from '../../store/slices/authSlice';
import { login } from '../../services/api/authApi';
import { setToken, setUser as setUserStorage } from '../../services/storage/secureStorage';
import { isValidUsername, isValidPassword } from '../../utils/validators';

function LoginScreen(): React.JSX.Element {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');

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

      // Store token and user data
      await setToken(response.data.token);
      await setUserStorage(response.data.user);

      // Update Redux state
      dispatch(setUser({ user: response.data.user }));
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
            <Text style={styles.title}>SEKAR</Text>
            <Text style={styles.subtitle}>
              Sistem Evaluasi Kerja Satgas RTH
            </Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            {/* Username Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={[styles.input, usernameError && styles.inputError]}
                placeholder="Masukkan username"
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  setUsernameError('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              {usernameError ? (
                <Text style={styles.errorText}>{usernameError}</Text>
              ) : null}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[styles.input, passwordError && styles.inputError]}
                placeholder="Masukkan password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setPasswordError('');
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
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
            <Text style={styles.footerText}>DKRTH Surabaya © 2026</Text>
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
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
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

