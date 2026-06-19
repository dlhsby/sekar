/**
 * Unit Tests: App Releases API
 * Public mobile-release registry used by the login page + /android · /ios pages.
 */

import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import { appReleasesApi, getAppDownloadUrl, type AppRelease } from '../app-releases';

describe('App Releases API', () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  const release: AppRelease = {
    platform: 'android',
    channel: 'staging',
    version: '0.0.1',
    buildNumber: '202606191609',
    versionCode: 1,
    fileSize: 54000000,
    notes: 'First UAT build',
    publishedAt: '2026-06-19T16:09:00.000Z',
    downloadUrl: 'http://api.sekar.wahyutrip.com/api/v1/app-releases/latest/download?platform=android',
  };

  describe('getLatest', () => {
    it('fetches the latest release for the given platform', async () => {
      mockAxios.onGet('/app-releases/latest', { params: { platform: 'android' } }).reply(200, release);

      const result = await appReleasesApi.getLatest('android');

      expect(result).toEqual(release);
    });

    it('defaults to android when no platform is passed', async () => {
      mockAxios.onGet('/app-releases/latest').reply((config) => {
        expect(config.params).toEqual({ platform: 'android' });
        return [200, release];
      });

      await appReleasesApi.getLatest();
    });

    it('propagates a 404 when nothing is published', async () => {
      mockAxios.onGet('/app-releases/latest').reply(404, { message: 'No published ios release available' });

      await expect(appReleasesApi.getLatest('ios')).rejects.toMatchObject({
        response: { status: 404 },
      });
    });
  });

  describe('getAppDownloadUrl', () => {
    it('builds the stable backend download link per platform', () => {
      expect(getAppDownloadUrl('android')).toMatch(
        /\/api\/v1\/app-releases\/latest\/download\?platform=android$/,
      );
      expect(getAppDownloadUrl('ios')).toMatch(/platform=ios$/);
    });
  });
});
