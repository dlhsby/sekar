/**
 * Login Screen
 * Authentication screen for username/password login
 * Uses Neo Brutalism design system
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  type TextInput as TextInputType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { setLoading, setUser, setError, clearError } from '../../store/slices/authSlice';
import { login, getMe } from '../../services/api/authApi';
import { setToken, setRefreshToken, setUser as setUserStorage } from '../../services/storage/secureStorage';
import { loadAndSyncCurrentShift } from '../../services/shift';
import { isValidUsername, isValidPassword } from '../../utils/validators';
import { isClockableRole } from '../../constants/roles';
import type { LoginResponse } from '../../types/api.types';
import type { UserRole } from '../../types/models.types';

function LoginScreen(): React.JSX.Element {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const passwordInputRef = useRef<TextInputType>(null);

  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  // Fix 2: Wrapped in useCallback with correct dependency array
  // Fix 4: Dispatch clearError() at the very start to prevent stale Redux error
  const handleLogin = useCallback(async () => {
    // Fix 4: Clear any stale Redux error before starting a new login attempt
    dispatch(clearError());

    // Reset local field errors
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
      // Fix 5: refresh_token is optional (? in type) so this guard is correct
      if (loginData.refresh_token) {
        await setRefreshToken(loginData.refresh_token);
      }

      await setUserStorage(loginData.user);

      // Fetch assigned area and updated user fields for clockable users
      let assignedArea = null;
      let enrichedUser = loginData.user;
      if (isClockableRole(loginData.user.role as UserRole)) {
        try {
          const meResponse = await getMe();
          if (meResponse.data) {
            // Merge area_id/rayon_id from getMe (schedule-based) into user
            enrichedUser = {
              ...loginData.user,
              area_id: meResponse.data.area_id ?? loginData.user.area_id,
              rayon_id: meResponse.data.rayon_id ?? loginData.user.rayon_id,
            };
            if (meResponse.data.assigned_area) {
              // Ensure GPS coordinates are numbers, not strings
              assignedArea = {
                ...meResponse.data.assigned_area,
                gps_lat: Number(meResponse.data.assigned_area.gps_lat),
                gps_lng: Number(meResponse.data.assigned_area.gps_lng),
                radius_meters: Number(meResponse.data.assigned_area.radius_meters),
              };
            }
          }
        } catch (err) {
          if (__DEV__) {
            console.warn('Failed to fetch assigned area:', err);
          }
          // Continue without assigned area - user can still login
        }
      }

      // Update Redux state with user and assigned area (null -> undefined to match payload type)
      dispatch(setUser({ user: enrichedUser, area: assignedArea ?? undefined }));

      // Register FCM token after successful login
      try {
        const fcmService = (await import('../../services/notifications/fcmService')).default;
        const token = await fcmService.getToken();
        if (token) {
          const success = await fcmService.registerToken(token);
          if (!success) {
            // Fix 1: Gate FCM console calls behind __DEV__
            if (__DEV__) {
              console.error('[Login] FCM token registration returned false');
            }
          }
        } else {
          // Fix 1: Gate FCM console calls behind __DEV__
          if (__DEV__) {
            console.warn('[Login] No FCM token available');
          }
        }
      } catch (err) {
        // Fix 1: Gate FCM console calls behind __DEV__
        if (__DEV__) {
          console.error('[Login] FCM token registration exception:', err);
        }
        // Don't block login if FCM fails
      }

      // Load current shift for clockable roles only
      // This ensures the home screen shows correct shift status immediately after login
      if (isClockableRole(loginData.user.role as UserRole)) {
        loadAndSyncCurrentShift(dispatch).catch((err) => {
          if (__DEV__) {
            console.warn('Shift sync after login failed:', err);
          }
        });
      }
    } catch (err: unknown) {
      // Fix 3: catch (err: unknown) with proper narrowing
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
      dispatch(setError(message));
      Alert.alert('Error', message);
    } finally {
      dispatch(setLoading(false));
    }
  }, [username, password, dispatch]);

  return (
    <NBBackgroundPattern
      pattern="grid"
      backgroundColor={nbColors.background}  // #F0F9F6 very soft mint
      patternColor={nbColors.primary}        // #7FBC8C medium green
      opacity={0.06}                          // Subtle pattern overlay
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
    borderRadius: nbBorderRadius.base, // 6px - NB 2.0 softened style
    backgroundColor: nbColors.primary, // Medium green #7FBC8C
    borderWidth: nbBorders.base, // 3px
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
    color: nbColors.gray['600'],
    textAlign: 'center',
  },
  organization: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.gray['500'],
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
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base, // 3px
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
    color: nbColors.gray['500'],
  },
});

export default LoginScreen;
