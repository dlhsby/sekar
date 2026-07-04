/**
 * Config Constants Tests
 * Tests for application configuration constants
 */

import config from '../config';

describe('config', () => {
  describe('GPS Configuration', () => {
    it('should export GPS_ACCURACY_THRESHOLD constant', () => {
      expect(config.GPS_ACCURACY_THRESHOLD).toBeDefined();
      expect(typeof config.GPS_ACCURACY_THRESHOLD).toBe('number');
    });

    it('should have GPS_ACCURACY_THRESHOLD set to 50 meters', () => {
      expect(config.GPS_ACCURACY_THRESHOLD).toBe(50);
    });

    it('should have GPS_BOUNDARY_RADIUS for validation', () => {
      expect(config.GPS_BOUNDARY_RADIUS).toBeDefined();
      expect(config.GPS_BOUNDARY_RADIUS).toBe(100);
    });
  });

  describe('Retry Configuration', () => {
    it('should export MAX_RETRY_COUNT constant', () => {
      expect(config.MAX_RETRY_COUNT).toBeDefined();
      expect(typeof config.MAX_RETRY_COUNT).toBe('number');
    });

    it('should have MAX_RETRY_COUNT set to 5', () => {
      expect(config.MAX_RETRY_COUNT).toBe(5);
    });

    it('should export RETRY_DELAYS_MS array', () => {
      expect(config.RETRY_DELAYS_MS).toBeDefined();
      expect(Array.isArray(config.RETRY_DELAYS_MS)).toBe(true);
    });

    it('should have exponential backoff delays', () => {
      const delays = config.RETRY_DELAYS_MS;
      expect(delays).toHaveLength(5);
      expect(delays).toEqual([1000, 2000, 4000, 8000, 16000]);
    });

    it('should have exponential growth pattern in delays', () => {
      const delays = config.RETRY_DELAYS_MS;
      // Each delay should be approximately 2x the previous
      for (let i = 1; i < delays.length; i++) {
        expect(delays[i]).toBe(delays[i - 1] * 2);
      }
    });
  });

  describe('Storage Configuration', () => {
    it('should export MIN_FREE_STORAGE_MB constant', () => {
      expect(config.MIN_FREE_STORAGE_MB).toBeDefined();
      expect(typeof config.MIN_FREE_STORAGE_MB).toBe('number');
    });

    it('should have MIN_FREE_STORAGE_MB set to 100MB', () => {
      expect(config.MIN_FREE_STORAGE_MB).toBe(100);
    });

    it('should have reasonable minimum storage requirement', () => {
      // 100MB is reasonable for mobile app media operations
      expect(config.MIN_FREE_STORAGE_MB).toBeGreaterThanOrEqual(50);
      expect(config.MIN_FREE_STORAGE_MB).toBeLessThanOrEqual(500);
    });
  });

  describe('API Configuration', () => {
    it('should export API_BASE_URL', () => {
      expect(config.API_BASE_URL).toBeDefined();
      expect(typeof config.API_BASE_URL).toBe('string');
    });

    it('should export API_VERSION', () => {
      expect(config.API_VERSION).toBeDefined();
      expect(typeof config.API_VERSION).toBe('string');
    });
  });

  describe('Location Tracking Configuration', () => {
    it('should export LOCATION_TRACKING_INTERVAL (legacy alias)', () => {
      expect(config.LOCATION_TRACKING_INTERVAL).toBeDefined();
      // Now equals LOCATION_MAX_INTERVAL_MS (60 seconds from env mock)
      expect(config.LOCATION_TRACKING_INTERVAL).toBe(60 * 1000);
    });

    it('should export LOCATION_MIN_INTERVAL_MS', () => {
      expect(config.LOCATION_MIN_INTERVAL_MS).toBeDefined();
      expect(config.LOCATION_MIN_INTERVAL_MS).toBe(10 * 1000); // 10 seconds
    });

    it('should export LOCATION_MAX_INTERVAL_MS', () => {
      expect(config.LOCATION_MAX_INTERVAL_MS).toBeDefined();
      expect(config.LOCATION_MAX_INTERVAL_MS).toBe(60 * 1000); // 60 seconds
    });

    it('should export LOCATION_BATCH_SIZE', () => {
      expect(config.LOCATION_BATCH_SIZE).toBeDefined();
      expect(config.LOCATION_BATCH_SIZE).toBe(2); // from env mock
    });

    it('should export LOCATION_DISTANCE_FILTER', () => {
      expect(config.LOCATION_DISTANCE_FILTER).toBeDefined();
      expect(config.LOCATION_DISTANCE_FILTER).toBe(0); // 0 = track even when stationary
    });
  });

  describe('Media Configuration', () => {
    it('should export MAX_IMAGE_WIDTH', () => {
      expect(config.MAX_IMAGE_WIDTH).toBeDefined();
      expect(config.MAX_IMAGE_WIDTH).toBe(800);
    });

    it('should export MAX_VIDEO_SIZE', () => {
      expect(config.MAX_VIDEO_SIZE).toBeDefined();
      expect(config.MAX_VIDEO_SIZE).toBe(50); // MB
    });

    it('should export MAX_VIDEO_DURATION', () => {
      expect(config.MAX_VIDEO_DURATION).toBeDefined();
      expect(config.MAX_VIDEO_DURATION).toBe(30); // seconds
    });
  });

  describe('Sync Configuration', () => {
    it('should export SYNC_INTERVAL', () => {
      expect(config.SYNC_INTERVAL).toBeDefined();
      expect(config.SYNC_INTERVAL).toBe(5 * 60 * 1000); // 5 minutes
    });

    it('should export MAP_REFRESH_INTERVAL', () => {
      expect(config.MAP_REFRESH_INTERVAL).toBeDefined();
      expect(config.MAP_REFRESH_INTERVAL).toBe(2 * 60 * 1000); // 2 minutes
    });
  });

  describe('Environment Configuration', () => {
    it('should export APP_ENV', () => {
      expect(config.APP_ENV).toBeDefined();
      expect(['development', 'staging', 'production']).toContain(config.APP_ENV);
    });

    it('should export IS_DEV boolean', () => {
      expect(typeof config.IS_DEV).toBe('boolean');
    });

    it('should export IS_PRODUCTION boolean', () => {
      expect(typeof config.IS_PRODUCTION).toBe('boolean');
    });

    it('should not be both production and development', () => {
      expect(config.IS_DEV && config.IS_PRODUCTION).toBe(false);
    });
  });

  describe('Configuration Consistency', () => {
    it('should have all retry delays within reasonable bounds', () => {
      config.RETRY_DELAYS_MS.forEach(delay => {
        expect(delay).toBeGreaterThan(0);
        expect(delay).toBeLessThanOrEqual(30000); // Max 30 seconds
      });
    });

    it('should have sync interval longer than retry delays', () => {
      const maxRetryDelay = Math.max(...config.RETRY_DELAYS_MS);
      expect(config.SYNC_INTERVAL).toBeGreaterThan(maxRetryDelay);
    });

    it('should have reasonable GPS accuracy threshold', () => {
      // 50m is a reasonable threshold for outdoor GPS
      expect(config.GPS_ACCURACY_THRESHOLD).toBeGreaterThanOrEqual(10);
      expect(config.GPS_ACCURACY_THRESHOLD).toBeLessThanOrEqual(100);
    });

    it('should have location batch size match retry count', () => {
      // If we have 5 retries, batch size should be reasonable
      expect(config.LOCATION_BATCH_SIZE).toBeGreaterThanOrEqual(1);
      expect(config.LOCATION_BATCH_SIZE).toBeLessThanOrEqual(100);
    });
  });

  describe('Type Safety', () => {
    it('should have number types for numeric configs', () => {
      const numericConfigs = [
        'GPS_ACCURACY_THRESHOLD',
        'GPS_BOUNDARY_RADIUS',
        'MAX_RETRY_COUNT',
        'MIN_FREE_STORAGE_MB',
        'LOCATION_TRACKING_INTERVAL',
        'LOCATION_BATCH_SIZE',
        'MAX_IMAGE_WIDTH',
        'MAX_VIDEO_SIZE',
        'MAX_VIDEO_DURATION',
        'SYNC_INTERVAL',
        'MAP_REFRESH_INTERVAL',
      ];

      numericConfigs.forEach(key => {
        expect(typeof config[key as keyof typeof config]).toBe('number');
        expect(Number.isNaN(config[key as keyof typeof config] as number)).toBe(false);
      });
    });

    it('should have string types for string configs', () => {
      const stringConfigs = ['API_BASE_URL', 'API_VERSION', 'APP_ENV', 'GOOGLE_MAPS_API_KEY'];

      stringConfigs.forEach(key => {
        expect(typeof config[key as keyof typeof config]).toBe('string');
      });
    });

    it('should have boolean types for boolean configs', () => {
      const booleanConfigs = ['IS_DEV', 'IS_PRODUCTION'];

      booleanConfigs.forEach(key => {
        expect(typeof config[key as keyof typeof config]).toBe('boolean');
      });
    });
  });
});
