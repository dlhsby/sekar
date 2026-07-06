import { apiClient } from './client';

// `android_x86` = the x86/x86_64 variant (emulators, WSA, PC). Real phones use
// `android` (ARM). Served at the separate /android_x86 page.
export type AppPlatform = 'android' | 'ios' | 'android_x86';

export interface AppRelease {
  platform: AppPlatform;
  channel: string;
  version: string;
  buildNumber: string;
  versionCode: number | null;
  fileSize: number | null;
  notes: string | null;
  publishedAt: string;
  /** Stable public link that 302-redirects to a fresh presigned S3 URL. */
  downloadUrl: string;
}

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v1';

/**
 * Stable, always-current download link for the latest published build. The
 * backend 302-redirects this to a fresh presigned S3 URL, so it can be used
 * directly as an `<a href>` (and printed/QR'd) without ever going stale.
 */
export function getAppDownloadUrl(platform: AppPlatform): string {
  return `${API_ORIGIN}/api/${API_VERSION}/app-releases/latest/download?platform=${platform}`;
}

export const appReleasesApi = {
  /** Latest published release metadata (public — no auth required). */
  getLatest: async (platform: AppPlatform = 'android'): Promise<AppRelease> => {
    const response = await apiClient.get<AppRelease>('/app-releases/latest', {
      params: { platform },
    });
    return response.data;
  },
};
