/**
 * App version helpers for the in-app update checker.
 *
 * Comparison is by **versionCode** (the Android integer build number) — it is
 * monotonic and reliable, whereas versionName strings can drift between the
 * package.json version and the native versionName. Keep `versionCode` bumped on
 * each release for this to detect updates.
 */
import { getBuildNumber, getVersion } from 'react-native-device-info';
import type { AppRelease } from '../services/api/appReleasesApi';

export interface InstalledVersion {
  /** Human-readable versionName, e.g. "1.0.0". */
  version: string;
  /** Numeric Android versionCode (0 if unparseable). */
  versionCode: number;
}

/** The running build's version, read from the native package metadata. */
export function getInstalledVersion(): InstalledVersion {
  const version = getVersion();
  const code = parseInt(getBuildNumber(), 10);
  return { version, versionCode: Number.isFinite(code) ? code : 0 };
}

/**
 * True when the registry's latest build is newer than the installed one.
 * Returns false when the latest is missing/unknown (don't nag on bad data).
 */
export function isUpdateAvailable(
  installed: InstalledVersion,
  latest: Pick<AppRelease, 'versionCode'> | null | undefined,
): boolean {
  if (!latest || latest.versionCode == null) return false;
  return latest.versionCode > installed.versionCode;
}
