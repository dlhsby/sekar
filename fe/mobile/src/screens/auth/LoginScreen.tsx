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
  KeyboardAvoidingView,
  Platform,
  type TextInput as TextInputType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbTypography,
  nbSpacing,
  nbShadows,
  nbBorders,
  nbBorderRadius,
} from '../../constants/nbTokens';
import { NBButton, NBTextInput, NBPasswordInput, NBBackgroundPattern, NBText, NBToast, NBToastProvider } from '../../components/nb';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setLoading, setUser } from '../../store/slices/authSlice';
import { login, getMe } from '../../services/api/authApi';
import { setToken, setRefreshToken, setUser as setUserStorage } from '../../services/storage/secureStorage';
import { loadAndSyncCurrentShift } from '../../services/shift';
import { isValidUsername, isValidPassword } from '../../utils/validators';
import { isClockableRole } from '../../constants/roles';
import type { LoginResponse } from '../../types/api.types';
import type { UserRole } from '../../types/models.types';

function LoginScreen(): React.JSX.Element {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const passwordInputRef = useRef<TextInputType>(null);
  const navigation = useNavigation();

  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);

  const handleLogin = useCallback(async () => {

    // Reset local field errors
    setIdentifierError('');
    setPasswordError('');

    // Validate inputs — identifier accepts username (min 3 chars) or phone number
    if (!isValidUsername(identifier)) {
      setIdentifierError('Username / No. HP harus diisi (minimal 3 karakter)');
      return;
    }

    if (!isValidPassword(password)) {
      setPasswordError('Password harus diisi (minimal 6 karakter)');
      return;
    }

    // Attempt login
    dispatch(setLoading(true));

    try {
      const response = await login(identifier, password);

      if (response.error || !response.data) {
        const errMsg = response.error || 'Login gagal';
        NBToast.show({ level: 'danger', title: 'Login Gagal', body: errMsg, persistent: true });
        return;
      }

      // Type-safe response handling
      const loginData = response.data as LoginResponse;

      // Store access token and refresh token
      if (!loginData.access_token) {
        NBToast.show({ level: 'danger', title: 'Error', body: 'Invalid response from server', persistent: true });
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
              // Transform GeoJSON Polygon → flat [lng, lat][] for mobile gpsUtils
              const rawPolygon = (meResponse.data.assigned_area as any).boundary_polygon;
              assignedArea = {
                ...meResponse.data.assigned_area,
                gps_lat: Number(meResponse.data.assigned_area.gps_lat),
                gps_lng: Number(meResponse.data.assigned_area.gps_lng),
                radius_meters: Number(meResponse.data.assigned_area.radius_meters),
                boundary_polygon: rawPolygon?.coordinates?.[0] ?? undefined,
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

      // FCM token registration is handled by App.tsx after permissions are granted.
      // Do not call fcmService.getToken() here — service isn't initialized yet.

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
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
      NBToast.show({ level: 'danger', title: 'Error', body: message, persistent: true });
    } finally {
      dispatch(setLoading(false));
    }
  }, [identifier, password, dispatch]);

  return (
    <NBBackgroundPattern
      pattern="grid"
      backgroundColor={nbColors.background}
      patternColor={nbColors.primary}
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
            <NBText variant="h1" color="primary" style={styles.title}>SEKAR</NBText>
            <NBText variant="body-sm" color="gray500" align="center" style={styles.subtitle}>
              Sistem Evaluasi Kerja Satgas RTH
            </NBText>
            <NBText variant="caption" color="gray500" align="center" style={styles.organization}>
              DLH Kota Surabaya
            </NBText>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            {/* Identifier Input — accepts username or phone number (Phase 2E) */}
            <NBTextInput
              label="Username / No. HP"
              placeholder="Masukkan username atau nomor HP"
              value={identifier}
              onChangeText={(text) => {
                setIdentifier(text);
                setIdentifierError('');
              }}
              error={identifierError}
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

            {/* Phase 4-7 (M3a, AS-4): contact-admin password recovery (ADR-041). */}
            <NBButton
              title="Lupa sandi?"
              onPress={() => navigation.navigate('ForgotPassword' as never)}
              disabled={isLoading}
              fullWidth
              variant="ghost"
              testID="forgot-password-link"
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>DLH Surabaya © 2026</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
    <NBToastProvider />
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
    backgroundColor: nbColors.primary,
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
