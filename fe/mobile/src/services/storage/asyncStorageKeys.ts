/**
 * AsyncStorage keys + helpers for non-sensitive flags (Phase 4 M3).
 *
 * Sensitive data (tokens, user_data) lives in EncryptedStorage via
 * `secureStorage.ts`. These flags are device-local UX hints — losing them
 * just means the carousel/onboarding plays once more, no data risk.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const ASYNC_STORAGE_KEYS = {
  CAROUSEL_SEEN: '@sekar:carousel_seen',
  ONBOARDING_COMPLETED_PREFIX: '@sekar:onboarding_completed:',
} as const;

export async function markCarouselSeen(): Promise<void> {
  await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.CAROUSEL_SEEN, 'true');
}

export async function hasSeenCarousel(): Promise<boolean> {
  const v = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.CAROUSEL_SEEN);
  return v === 'true';
}

/**
 * Onboarding completion is user-scoped so the same device can onboard multiple
 * users (shared field-device scenario).
 */
export async function markOnboardingCompleted(userId: string): Promise<void> {
  await AsyncStorage.setItem(
    `${ASYNC_STORAGE_KEYS.ONBOARDING_COMPLETED_PREFIX}${userId}`,
    'true',
  );
}

export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const v = await AsyncStorage.getItem(
    `${ASYNC_STORAGE_KEYS.ONBOARDING_COMPLETED_PREFIX}${userId}`,
  );
  return v === 'true';
}

/** Test helper — never call from app code. */
export async function clearEntryFlowFlags(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const ours = keys.filter(
    (k) =>
      k === ASYNC_STORAGE_KEYS.CAROUSEL_SEEN ||
      k.startsWith(ASYNC_STORAGE_KEYS.ONBOARDING_COMPLETED_PREFIX),
  );
  if (ours.length > 0) await AsyncStorage.multiRemove(ours);
}
