/**
 * Integrity / anti-spoofing configuration
 *
 * The ONLY place the anti-spoofing env flags are read. Nothing else in the app
 * should import these names from `@env` — a check that reads its own flag is a
 * check that can be forgotten at one call site and silently stop enforcing.
 *
 * Every override here is double-gated on `__DEV__`. That is deliberate and load
 * bearing: `react-native-dotenv` inlines env values at bundle time, so a
 * misconfigured `.env.production` would otherwise ship an APK that trusts fake
 * GPS. With the `__DEV__ &&` prefix the release bundle constant-folds the whole
 * expression to `false` and the bypass branch is not present in shipped code at
 * all — it cannot be flipped on by editing a file on a device.
 *
 * The device is never the security boundary regardless. These flags only relax
 * *client-side* checks so an emulator remains usable; the backend applies its
 * own policy independently and does not trust the client's verdict.
 */

import { ALLOW_MOCK_LOCATION, ALLOW_GALLERY_UPLOAD } from '@env';

/**
 * Decide whether a dev override is active.
 *
 * Split out from the exported helpers because `react-native-dotenv` is a *babel*
 * plugin: `import { X } from '@env'` is replaced with a literal at bundle time,
 * so the flag is a compile-time constant that no test (and no attacker editing
 * a file on a device) can vary at runtime. Only `__DEV__` is a runtime input,
 * so this is the seam where the logic can actually be exercised.
 *
 * Fails closed: anything other than the exact string "true" — unset, "TRUE",
 * "1", whitespace — disables the override.
 */
export const isOverrideEnabled = (rawFlag: string | undefined): boolean =>
  __DEV__ && rawFlag === 'true';

/**
 * Whether a mocked GPS fix may be accepted by the client.
 *
 * Needed for emulator work: the Android emulator supplies location through a
 * mock provider, so every fix on it is flagged `mocked` and development would
 * be impossible without this escape hatch.
 */
export const mockLocationAllowed = (): boolean => isOverrideEnabled(ALLOW_MOCK_LOCATION);

/**
 * Whether photos may be chosen from the gallery in *evidence* flows
 * (activities, task completion, work reports).
 *
 * Profile pictures are not evidence and are not governed by this flag — see
 * `mediaService`.
 */
export const galleryUploadAllowed = (): boolean => isOverrideEnabled(ALLOW_GALLERY_UPLOAD);
