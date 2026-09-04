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

      expect(mockGet).toHaveBeenCalledWith(
        '/app-releases/latest',
        { platform: 'android' },
        { expectedStatuses: [404] },
      );
      expect(result).toEqual(resp);
    });

    it('defaults to android', async () => {
      mockGet.mockResolvedValue({ data: undefined } as never);
      await appReleasesApi.getLatestRelease();
      expect(mockGet).toHaveBeenCalledWith(
        '/app-releases/latest',
        { platform: 'android' },
        { expectedStatuses: [404] },
      );
    });
  });

  describe('expected-error handling', () => {
    it('marks 404 as EXPECTED, so a missing release is not logged as a failure', async () => {
      // No published release is a normal state — a fresh local DB, or a channel
      // with no build yet. The caller already treats it as "no update"; without
      // this flag the dev-only interceptor still logged it at error level and
      // LogBox painted a red screen over a working app.
      mockGet.mockResolvedValue({ error: 'Not Found', code: 'NOT_FOUND' } as never);

      const result = await appReleasesApi.getLatestRelease('android');

      const [, , options] = mockGet.mock.calls[0];
      expect(options).toEqual({ expectedStatuses: [404] });
      // Still surfaced to the caller — quieter logging must not swallow it.
      expect(result.error).toBe('Not Found');
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
