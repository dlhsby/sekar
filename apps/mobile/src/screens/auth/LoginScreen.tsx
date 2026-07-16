/**
 * LoginScreen — Phase 4 M3 / Hifi AS-1…AS-3
 *
 * Identifier (phone OR username) + password. Validation is split: per-field
 * inline errors (AS-2, shown after a field is touched, submit gated until valid)
 * and a top toast for server-side auth failures (AS-3, generic copy so the failing
 * field can't be enumerated).
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  type TextInput as TextInputType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { getVersion } from 'react-native-device-info';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
import {
  NBButton,
  NBTextInput,
  NBPasswordInput,
  NBBackgroundPattern,
  NBText,
  NBToast,
  NBToastProvider,
} from '../../components/nb';
import { SekarLogoBox } from '../../components/brand/SekarLogoBox';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setLoading, setUser, setAssignedAreas } from '../../store/slices/authSlice';
import { login, getMe } from '../../services/api/authApi';
import { getMyAreas } from '../../services/api/usersApi';
import { setToken, setRefreshToken, setUser as setUserStorage } from '../../services/storage/secureStorage';
import { loadAndSyncCurrentShift } from '../../services/shift';
import { isValidUsername, isValidPassword } from '../../utils/validators';
import { isClockableRole } from '../../constants/roles';
import type { LoginResponse } from '../../types/api.types';
import type { UserRole } from '../../types/models.types';

const APP_VERSION = getVersion();

function LoginScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [touchedId, setTouchedId] = useState(false);
  const [touchedPw, setTouchedPw] = useState(false);

  const passwordInputRef = useRef<TextInputType>(null);
  const navigation = useNavigation();

  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);

  const idValid = isValidUsername(identifier);
  const pwValid = isValidPassword(password);
  const formValid = idValid && pwValid;

  // Inline errors surface only once a field has been touched (blur or submit).
  const idError = touchedId
    ? identifier.trim()
      ? idValid
        ? ''
        : t('auth:validation.identifierMin')
      : t('auth:validation.identifierRequired')
    : '';
  const pwError = touchedPw
    ? password
      ? pwValid
        ? ''
        : t('auth:validation.passwordMin')
      : t('auth:validation.passwordRequired')
    : '';

  const handleLogin = useCallback(async () => {
    setTouchedId(true);
    setTouchedPw(true);
    if (!isValidUsername(identifier) || !isValidPassword(password)) return;

    dispatch(setLoading(true));
    try {
      const response = await login(identifier, password);

      if (response.error || !response.data) {
        // Generic copy (AS-3) — never reveal which field was wrong.
        NBToast.show({
          level: 'danger',
          title: t('auth:login.failedTitle'),
          body: t('auth:login.invalidCredentials'),
          durationMs: 4000,
        });
        return;
      }

      const loginData = response.data as LoginResponse;

      if (!loginData.access_token) {
        NBToast.show({
          level: 'danger',
          title: t('auth:login.failedTitle'),
          body: t('auth:login.serverError'),
          durationMs: 4000,
        });
        return;
      }

      await setToken(loginData.access_token);
      if (loginData.refresh_token) {
        await setRefreshToken(loginData.refresh_token);
      }
      await setUserStorage(loginData.user);

      // Fetch assigned area + updated fields for clockable users.
      let assignedArea = null;
      let enrichedUser = loginData.user;
      if (isClockableRole(loginData.user.role as UserRole)) {
        try {
          const meResponse = await getMe();
          if (meResponse.data) {
            enrichedUser = {
              ...loginData.user,
              area_id: meResponse.data.area_id ?? loginData.user.area_id,
              rayon_id: meResponse.data.rayon_id ?? loginData.user.rayon_id,
            };
            if (meResponse.data.assigned_area) {
              // Transform GeoJSON Polygon → flat [lng, lat][] for mobile gpsUtils.
              const rawPolygon = (meResponse.data.assigned_area as any).boundary_polygon;
              assignedArea = {
                ...meResponse.data.assigned_area,
                gps_lat: Number(meResponse.data.assigned_area.gps_lat),
                gps_lng: Number(meResponse.data.assigned_area.gps_lng),
                boundary_polygon: rawPolygon?.coordinates?.[0] ?? undefined,
              };
            }
          }
        } catch (err) {
          if (__DEV__) {
            console.warn('Failed to fetch assigned area:', err);
          }
        }
      }

      dispatch(setUser({ user: enrichedUser, area: assignedArea ?? undefined }));

      // Load current shift for clockable roles so Home reflects status immediately.
      if (isClockableRole(loginData.user.role as UserRole)) {
        loadAndSyncCurrentShift(dispatch).catch((err) => {
          if (__DEV__) {
            console.warn('Shift sync after login failed:', err);
          }
        });
        // Load all assigned areas (multi-area geofence + Jadwal Saya).
        getMyAreas()
          .then((res) => {
            if (res.data) {
              const areas = res.data.map((a) => {
                const poly = (a as any)?.boundary_polygon;
                return { ...a, boundary_polygon: poly?.coordinates?.[0] ?? poly ?? undefined };
              });
              dispatch(setAssignedAreas(areas));
            }
          })
          .catch((err) => {
            if (__DEV__) {
              console.warn('Failed to load assigned areas after login:', err);
            }
          });
      }
    } catch {
      NBToast.show({
        level: 'danger',
        title: t('auth:login.failedTitle'),
        body: t('auth:login.connectionError'),
        durationMs: 4000,
      });
    } finally {
      dispatch(setLoading(false));
    }
  }, [identifier, password, dispatch, t]);

  return (
    <NBBackgroundPattern
      pattern="grid"
      backgroundColor={nbColors.bgCanvas}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.logoRow}>
                <SekarLogoBox size={56} testID="login-logo" />
                <NBText variant="display" style={styles.wordmark}>
                  SEKAR
                </NBText>
              </View>
              <NBText variant="h1" style={styles.heading}>
                {t('auth:login.heading')}
              </NBText>
              <NBText variant="body-sm" color="gray600" style={styles.subtitle}>
                {t('auth:login.subtitle')}
              </NBText>
            </View>

            <View style={styles.form}>
              <NBTextInput
                label={t('auth:login.identifier')}
                placeholder={t('auth:login.identifierPlaceholder')}
                value={identifier}
                onChangeText={setIdentifier}
                onBlur={() => setTouchedId(true)}
                error={idError}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="default"
                editable={!isLoading}
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                blurOnSubmit={false}
                testID="username-input"
              />

              <NBPasswordInput
                ref={passwordInputRef}
                label={t('auth:login.password')}
                placeholder={t('auth:login.passwordPlaceholder')}
                value={password}
                onChangeText={setPassword}
                onBlur={() => setTouchedPw(true)}
                error={pwError}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                testID="password-input"
              />

              <Pressable
                style={styles.forgotWrap}
                onPress={() => navigation.navigate('ForgotPassword' as never)}
                disabled={isLoading}
                hitSlop={8}
                testID="forgot-password-link"
              >
                <NBText variant="body-sm" color="secondary" style={styles.forgotText}>
                  {t('auth:login.forgotPassword')}
                </NBText>
              </Pressable>
            </View>

            <View style={styles.spacer} />

            <NBButton
              title={t('auth:login.submit')}
              onPress={handleLogin}
              loading={isLoading}
              disabled={!formValid || isLoading}
              fullWidth
              variant="primary"
              testID="login-button"
            />
            <NBText variant="mono-sm" color="gray500" align="center" style={styles.version}>
              {t('auth:login.version', { version: APP_VERSION })}
            </NBText>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <NBToastProvider />
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: nbSpacing.lg,
    paddingTop: nbSpacing['2xl'],
    paddingBottom: nbSpacing.xl,
  },
  // Hi-fi AS-1: pinwheel logo + wordmark on top-left, then a left-aligned greeting.
  header: { alignItems: 'flex-start' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: nbSpacing.md },
  wordmark: { letterSpacing: -1 },
  heading: { marginTop: nbSpacing.lg, marginBottom: nbSpacing.xs, lineHeight: 30 },
  subtitle: { lineHeight: 21 },
  form: { marginTop: nbSpacing['2xl'] },
  forgotWrap: { alignSelf: 'flex-end', marginTop: nbSpacing.sm },
  forgotText: { textDecorationLine: 'underline' },
  spacer: { flex: 1 },
  version: { marginTop: nbSpacing.lg },
});

export default LoginScreen;
