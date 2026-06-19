/**
 * Tests: appReleasesApi — release registry reads + download URL builder.
 */
import * as appReleasesApi from '../appReleasesApi';
import * as apiClient from '../apiClient';

jest.mock('../apiClient', () => ({
  get: jest.fn(),
}));

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

describe('appReleasesApi', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getLatestRelease', () => {
    it('GETs /app-releases/latest with the platform param', async () => {
      const resp = { data: { platform: 'android', version: '0.0.1' } } as never;
      mockGet.mockResolvedValue(resp);

      const result = await appReleasesApi.getLatestRelease('android');

      expect(mockGet).toHaveBeenCalledWith('/app-releases/latest', { platform: 'android' });
      expect(result).toEqual(resp);
    });

    it('defaults to android', async () => {
      mockGet.mockResolvedValue({ data: undefined } as never);
      await appReleasesApi.getLatestRelease();
      expect(mockGet).toHaveBeenCalledWith('/app-releases/latest', { platform: 'android' });
    });
  });

  describe('getApkDownloadUrl', () => {
    it('builds the stable backend download link', () => {
      expect(appReleasesApi.getApkDownloadUrl('android')).toMatch(
        /\/app-releases\/latest\/download\?platform=android$/,
      );
    });
  });
});
