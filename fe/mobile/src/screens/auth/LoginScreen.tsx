/**
 * Login Screen
 * Authentication screen for username/password login
 * Uses Neo Brutalism design system
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  type TextInput as TextInputType,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbTypography,
  nbSpacing,
  nbShadows,
  nbBorders,
  nbBorderRadius,
} from '../../constants/nbTokens';
import { NBButton, NBTextInput, NBPasswordInput, NBBackgroundPattern } from '../../components/nb';
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

      // Register FCM token after successful login
      try {
        const fcmService = (await import('../../services/notifications/fcmService')).default;
        const token = await fcmService.getToken();
        if (token) {
          const success = await fcmService.registerToken(token);
          if (success) {
            console.log('[Login] ✅ FCM token registered successfully');
          } else {
            console.error('[Login] ❌ FCM token registration returned false');
          }
        } else {
          console.warn('[Login] ⚠️ No FCM token available');
        }
      } catch (err) {
        console.error('[Login] ❌ FCM token registration exception:', err);
        // Don't block login if FCM fails
      }

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
    <NBBackgroundPattern
      pattern="grid"
      backgroundColor={nbColors.background}  // #FDFD96 pastel yellow
      patternColor={nbColors.primary}        // #7FBC8C medium green
      opacity={0.06}                          // Slightly less visible on yellow
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}>
          <View style={styles.content}>
          {/* Logo/Title */}
          <View style={styles.header}>
            {/* Logo icon container - Neo Brutalism style */}
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons
                name="leaf"
                size={56}
                color={nbColors.white}
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
            <NBTextInput
              label="Username"
              placeholder="Masukkan username"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                setUsernameError('');
              }}
              error={usernameError}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              blurOnSubmit={false}
              testID="username-input"
            />

            {/* Password Input - Using NBPasswordInput */}
            <NBPasswordInput
              ref={passwordInputRef}
              label="Password"
              placeholder="Masukkan password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setPasswordError('');
              }}
              error={passwordError}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              returnKeyType="go"
              onSubmitEditing={handleLogin}
              testID="password-input"
            />

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={20}
                  color={nbColors.danger}
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Login Button */}
            <NBButton
              title="Masuk"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              fullWidth
              variant="primary"
              testID="login-button"
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>DLH Surabaya © 2026</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent', // Let NBBackgroundPattern handle background
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: nbSpacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: nbSpacing['2xl'],
  },
  // Neo Brutalism logo container: minimal rounded corners, thick border, hard-edge shadow
  // Nature theme: green from Neo Brutalism palette
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: nbBorderRadius.minimal, // 2px - softened NB style
    backgroundColor: nbColors.primary, // Medium green #7FBC8C
    borderWidth: nbBorders.default, // 3px
    borderColor: nbColors.black,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: nbSpacing.lg,
    // Hard-edge shadow - NB style
    ...nbShadows.md,
  },
  title: {
    fontSize: nbTypography.fontSize['3xl'],
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.primary, // Forest green title
    marginBottom: nbSpacing.xs,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray[600],
    textAlign: 'center',
  },
  organization: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.gray[500],
    textAlign: 'center',
    marginTop: nbSpacing.xs,
  },
  form: {
    marginBottom: nbSpacing.xl,
  },
  // Neo Brutalism error container: sharp corners, thick border
  errorContainer: {
    marginBottom: nbSpacing.md,
    padding: nbSpacing.md,
    backgroundColor: nbColors.white,
    borderRadius: 0, // Sharp corners
    borderWidth: nbBorders.default, // 3px
    borderColor: nbColors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.sm,
    ...nbShadows.sm,
  },
  errorText: {
    color: nbColors.danger,
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: nbSpacing.lg,
  },
  footerText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.gray[500],
  },
});

export default LoginScreen;
