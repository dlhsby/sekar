import { ConfigController } from './config.controller';

describe('ConfigController', () => {
  let controller: ConfigController;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    controller = new ConfigController();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns the maps keys from the environment', () => {
    process.env.GOOGLE_MAPS_API_KEY = 'g-key';
    process.env.MAPBOX_TOKEN = 'm-token';

    expect(controller.getMapsConfig()).toEqual({
      googleMapsApiKey: 'g-key',
      mapboxToken: 'm-token',
    });
  });

  it('returns null for each key when unset', () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.MAPBOX_TOKEN;
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    expect(controller.getMapsConfig()).toEqual({
      googleMapsApiKey: null,
      mapboxToken: null,
    });
  });

  it('falls back to NEXT_PUBLIC_MAPBOX_TOKEN when MAPBOX_TOKEN is unset', () => {
    delete process.env.MAPBOX_TOKEN;
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'public-token';

    expect(controller.getMapsConfig().mapboxToken).toBe('public-token');
  });
});
