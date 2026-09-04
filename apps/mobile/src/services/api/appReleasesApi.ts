/**
 * App Releases API
 * Reads the backend mobile-release registry to power the in-app version checker.
 * GET /app-releases/latest is public (no auth needed).
 */

import { get } from './apiClient';
import config from '../../constants/config';
import type { ApiResponse } from '../../types/api.types';

export type AppPlatform = 'android' | 'ios';

export interface AppRelease {
  platform: AppPlatform;
  channel: string;
  version: string;
  buildNumber: string;
  versionCode: number | null;
  fileSize: number | null;
  notes: string | null;
  publishedAt: string;
  /** Stable backend link that 302-redirects to a fresh presigned APK URL. */
  downloadUrl: string;
}

/**
 * Latest published release for a platform (404 → `{ error }`, never throws).
 *
 * A 404 is declared EXPECTED: "no release published for this platform yet" is a
 * normal state, not a fault. It is what any fresh database returns, and the
 * version checker already reads it as "no update". Without the declaration the
 * dev interceptor logged it at error level and LogBox covered the home screen
 * with a red error on every launch.
 */
export async function getLatestRelease(
  platform: AppPlatform = 'android',
): Promise<ApiResponse<AppRelease>> {
  return get<AppRelease>('/app-releases/latest', { platform }, { expectedStatuses: [404] });
}

/**
 * Direct APK download link (the backend 302-redirects to a fresh presigned S3
 * URL). `config.API_BASE_URL` already includes the `/api/v1` prefix.
 */
export function getApkDownloadUrl(platform: AppPlatform = 'android'): string {
  const base = config.API_BASE_URL.replace(/\/$/, '');
  return `${base}/app-releases/latest/download?platform=${platform}`;
}
