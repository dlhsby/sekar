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

/** Latest published release for a platform (404 → `{ error }`, never throws). */
export async function getLatestRelease(
  platform: AppPlatform = 'android',
): Promise<ApiResponse<AppRelease>> {
  return get<AppRelease>('/app-releases/latest', { platform });
}

/**
 * Direct APK download link (the backend 302-redirects to a fresh presigned S3
 * URL). `config.API_BASE_URL` already includes the `/api/v1` prefix.
 */
export function getApkDownloadUrl(platform: AppPlatform = 'android'): string {
  const base = config.API_BASE_URL.replace(/\/$/, '');
  return `${base}/app-releases/latest/download?platform=${platform}`;
}
