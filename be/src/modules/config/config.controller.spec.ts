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

  it('returns the Google Maps key from the environment', () => {
    process.env.GOOGLE_MAPS_API_KEY = 'g-key';

    expect(controller.getMapsConfig()).toEqual({
      googleMapsApiKey: 'g-key',
    });
  });

  it('returns null when the key is unset', () => {
    delete process.env.GOOGLE_MAPS_API_KEY;

    expect(controller.getMapsConfig()).toEqual({
      googleMapsApiKey: null,
    });
  });
});
