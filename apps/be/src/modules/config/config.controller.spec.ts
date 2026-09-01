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

  it('returns the Google Maps key + Map ID from the environment', () => {
    process.env.GOOGLE_MAPS_API_KEY = 'g-key';
    process.env.GOOGLE_MAPS_MAP_ID = 'map-123';

    expect(controller.getMapsConfig()).toEqual({
      googleMapsApiKey: 'g-key',
      googleMapsMapId: 'map-123',
    });
  });

  it('returns null for each when unset', () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.GOOGLE_MAPS_MAP_ID;

    expect(controller.getMapsConfig()).toEqual({
      googleMapsApiKey: null,
      googleMapsMapId: null,
    });
  });
});
