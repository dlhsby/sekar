/**
 * MockLocationBlocker — blocks the app while a mock-location provider is active.
 *
 * Policy: a worker who is faking GPS must not be able to keep using the app.
 * The overlay is deliberately NOT dismissable — there is no "later", because
 * the only way out is to actually turn the mock provider off. While it is up
 * the worker is also untracked server-side and reads as inactive, so dismissing
 * it would only hide that state from them.
 *
 * Deliberately does not stop the location tracker. Pings keep flowing and keep
 * carrying `mocked: true`, which is what lets the server distinguish "faking
 * location" from "phone switched off". Silence would look like the latter.
 *
 * Renders nothing at all in the normal case, so it is safe to mount at the root.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Modal, StyleSheet, View, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';

import { NBButton, NBText } from '../nb';
import { nbColors, nbSpacing, nbRadius, nbBorders } from '../../constants/nbTokens';
import { locationTracker } from '../../services/location/locationTracker';
import { readPosition, MockedLocationError } from '../../services/location/verifiedPosition';

export function MockLocationBlocker(): React.JSX.Element | null {
  const { t } = useTranslation();
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [recheckFailed, setRecheckFailed] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // The tracker raises this on EVERY offending capture, so a late mount still
  // learns about an ongoing violation without polling.
  useEffect(() => {
    const onViolation = () => {
      if (mountedRef.current) setBlocked(true);
    };
    locationTracker.on('integrityViolation', onViolation);
    return () => {
      locationTracker.off('integrityViolation', onViolation);
    };
  }, []);

  /**
   * Take a fresh reading and clear the block only if it is genuinely clean.
   *
   * `readPosition` applies the mock policy itself, so a mocked fix rejects
   * rather than resolving — the check cannot be passed by a stale good value.
   */
  const recheck = useCallback(async () => {
    setChecking(true);
    setRecheckFailed(false);
    try {
      await readPosition();
      if (mountedRef.current) setBlocked(false);
    } catch (error) {
      if (!mountedRef.current) return;
      // Only a confirmed mock keeps the block up. A timeout or a permission
      // problem is a different failure and must not trap the worker here.
      if (error instanceof MockedLocationError) {
        setRecheckFailed(true);
      } else {
        setBlocked(false);
      }
    } finally {
      if (mountedRef.current) setChecking(false);
    }
  }, []);

  // Re-check when the worker comes back from Settings, so the common path
  // (turn it off, switch back) clears itself without another tap.
  useEffect(() => {
    if (!blocked) return undefined;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void recheck();
    });
    return () => sub.remove();
  }, [blocked, recheck]);

  if (!blocked) return null;

  return (
    <Modal
      visible
      animationType="fade"
      transparent={false}
      // Android hardware back must not dismiss this — there is no "later".
      onRequestClose={() => {}}
      accessibilityViewIsModal
    >
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <NBText variant="h1" color="danger" align="center">
            {t('location:mockBlocker.title')}
          </NBText>

          <NBText variant="body" color="gray900" style={styles.paragraph}>
            {t('location:mockBlocker.body')}
          </NBText>

          <View style={styles.steps}>
            <NBText variant="body-sm" color="gray700">
              {t('location:mockBlocker.steps')}
            </NBText>
          </View>

          {recheckFailed && (
            <NBText variant="body-sm" color="danger" style={styles.paragraph}>
              {t('location:mockBlocker.stillDetected')}
            </NBText>
          )}

          <NBButton
            title={t('location:mockBlocker.openSettings')}
            onPress={() => void Linking.openSettings()}
            variant="primary"
            style={styles.button}
          />
          <NBButton
            title={checking ? t('location:mockBlocker.checking') : t('location:mockBlocker.recheck')}
            onPress={() => void recheck()}
            variant="outline"
            loading={checking}
            disabled={checking}
            style={styles.button}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: nbColors.bgCanvas,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: nbSpacing.lg,
    gap: nbSpacing.md,
  },
  paragraph: {
    marginTop: nbSpacing.sm,
  },
  steps: {
    backgroundColor: nbColors.bgSurface,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.md,
    padding: nbSpacing.md,
  },
  button: {
    marginTop: nbSpacing.sm,
  },
});

export default MockLocationBlocker;
