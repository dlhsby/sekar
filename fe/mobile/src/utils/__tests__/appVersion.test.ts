/**
 * Tests: appVersion — installed-version read + update comparison (by versionCode).
 */
import { getInstalledVersion, isUpdateAvailable } from '../appVersion';

describe('appVersion', () => {
  describe('getInstalledVersion', () => {
    it('reads versionName + numeric versionCode from device-info', () => {
      // Global mock (jest.setup.js): getVersion '1.0.0', getBuildNumber '1'.
      expect(getInstalledVersion()).toEqual({ version: '1.0.0', versionCode: 1 });
    });
  });

  describe('isUpdateAvailable', () => {
    const installed = { version: '1.0.0', versionCode: 5 };

    it('true when the latest versionCode is greater', () => {
      expect(isUpdateAvailable(installed, { versionCode: 6 })).toBe(true);
    });

    it('false when equal or lower', () => {
      expect(isUpdateAvailable(installed, { versionCode: 5 })).toBe(false);
      expect(isUpdateAvailable(installed, { versionCode: 4 })).toBe(false);
    });

    it('false when latest is missing or has no versionCode', () => {
      expect(isUpdateAvailable(installed, null)).toBe(false);
      expect(isUpdateAvailable(installed, undefined)).toBe(false);
      expect(isUpdateAvailable(installed, { versionCode: null })).toBe(false);
    });
  });
});
