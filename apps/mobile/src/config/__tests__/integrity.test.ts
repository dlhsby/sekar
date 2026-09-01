/**
 * Tests for the integrity flag gate.
 *
 * `react-native-dotenv` inlines `@env` values at bundle time via babel, so the
 * flags themselves are compile-time constants and cannot be varied per test.
 * `__DEV__` is the one runtime input, and it is the input that carries the
 * security property: a release bundle folds `false && …` away, so the override
 * branch is absent from shipped code no matter what the env file said.
 *
 * `isOverrideEnabled` is therefore where the behaviour is asserted, with a thin
 * check that the two exported helpers are wired to it.
 */

import {
  isOverrideEnabled,
  mockLocationAllowed,
  galleryUploadAllowed,
} from '../integrity';

const devGlobal = global as unknown as { __DEV__: boolean };
const originalDev = devGlobal.__DEV__;

afterEach(() => {
  devGlobal.__DEV__ = originalDev;
});

describe('isOverrideEnabled', () => {
  it('enables the override in dev for the exact string "true"', () => {
    devGlobal.__DEV__ = true;
    expect(isOverrideEnabled('true')).toBe(true);
  });

  it('refuses outside dev even when the env file says true', () => {
    // The case that matters: a misconfigured .env.production must never ship an
    // APK that trusts fake GPS or gallery evidence.
    devGlobal.__DEV__ = false;
    expect(isOverrideEnabled('true')).toBe(false);
  });

  it.each([undefined, '', 'TRUE', 'True', '1', 'yes', 'true ', ' true'])(
    'fails closed in dev on the non-canonical value %p',
    (value) => {
      devGlobal.__DEV__ = true;
      expect(isOverrideEnabled(value)).toBe(false);
    },
  );

  it.each([undefined, 'true', 'false'])(
    'is always false outside dev, for value %p',
    (value) => {
      devGlobal.__DEV__ = false;
      expect(isOverrideEnabled(value)).toBe(false);
    },
  );
});

describe('exported helpers', () => {
  it.each([
    ['mockLocationAllowed', mockLocationAllowed],
    ['galleryUploadAllowed', galleryUploadAllowed],
  ])('%s is gated on __DEV__', (_name, helper) => {
    devGlobal.__DEV__ = false;
    expect(helper()).toBe(false);
  });

  it('returns a boolean, never a truthy string, so callers cannot be fooled', () => {
    devGlobal.__DEV__ = true;
    expect(typeof mockLocationAllowed()).toBe('boolean');
    expect(typeof galleryUploadAllowed()).toBe('boolean');
  });
});
