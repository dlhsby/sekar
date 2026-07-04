/**
 * AppUpdateBanner — proactive "a newer version is available" prompt.
 *
 * Renders nothing unless the backend release registry reports a newer build.
 * Tapping the action downloads the APK (dev/staging) or opens the Play Store
 * (production) via useAppUpdate. Mounted on the field home screen.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { StyleProp, ViewStyle } from 'react-native';
import { NBAlert } from '../nb';
import { useAppUpdate } from '../../hooks/useAppUpdate';

export function AppUpdateBanner({ style }: { style?: StyleProp<ViewStyle> }): React.JSX.Element | null {
  const { t } = useTranslation('components');
  const { status, latest, openUpdate, updateActionLabel } = useAppUpdate();

  if (status !== 'updateAvailable' || !latest) return null;

  return (
    <NBAlert
      variant="info"
      title={t('updateBanner.title')}
      message={t('updateBanner.message', { version: latest.version })}
      actionLabel={updateActionLabel}
      onAction={openUpdate}
      style={style}
    />
  );
}
