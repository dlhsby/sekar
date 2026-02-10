/**
 * Unit Tests: Static Map Utilities
 * Tests Mapbox Static Images API URL generation
 */

import { getStaticMapUrl, getStaticMapWithMarker } from '../static-map';

describe('Static Map Utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'test-mapbox-token';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getStaticMapUrl', () => {
    it('should generate static map URL without polygon', () => {
      const center: [number, number] = [112.739208, -7.289659];
      const url = getStaticMapUrl(center);

      expect(url).toContain('api.mapbox.com/styles/v1/mapbox/streets-v12/static/');
      expect(url).toContain('112.739208,-7.289659');
      expect(url).toContain('access_token=test-mapbox-token');
      expect(url).toContain('300x200@2x');
    });

    it('should generate static map URL with custom dimensions', () => {
      const center: [number, number] = [112.739208, -7.289659];
      const url = getStaticMapUrl(center, undefined, 600, 400);

      expect(url).toContain('600x400@2x');
    });

    it('should generate static map URL with polygon overlay', () => {
      const center: [number, number] = [112.739208, -7.289659];
      const polygon: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [112.739, -7.29],
            [112.741, -7.29],
            [112.741, -7.288],
            [112.739, -7.288],
            [112.739, -7.29],
          ],
        ],
      };

      const url = getStaticMapUrl(center, polygon);

      expect(url).toContain('geojson(');
      expect(url).toContain('access_token=test-mapbox-token');
    });

    it('should return placeholder when no Mapbox token', () => {
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN = '';
      const center: [number, number] = [112.739208, -7.289659];
      const url = getStaticMapUrl(center);

      expect(url).toBe('https://via.placeholder.com/300x200/e5e7eb/6b7280?text=Map+Preview');
    });

    it('should return placeholder with invalid token', () => {
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'your-mapbox-token-here';
      const center: [number, number] = [112.739208, -7.289659];
      const url = getStaticMapUrl(center);

      expect(url).toBe('https://via.placeholder.com/300x200/e5e7eb/6b7280?text=Map+Preview');
    });

    it('should handle polygon with no coordinates', () => {
      const center: [number, number] = [112.739208, -7.289659];
      const polygon: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [],
      };

      const url = getStaticMapUrl(center, polygon);

      expect(url).toContain('112.739208,-7.289659');
      expect(url).not.toContain('geojson(');
    });

    it('should adjust zoom level for polygon', () => {
      const center: [number, number] = [112.739208, -7.289659];
      const polygon: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [112.739, -7.29],
            [112.741, -7.29],
            [112.741, -7.288],
            [112.739, -7.288],
            [112.739, -7.29],
          ],
        ],
      };

      const urlWithPolygon = getStaticMapUrl(center, polygon);
      const urlWithoutPolygon = getStaticMapUrl(center);

      // With polygon uses zoom 14, without uses zoom 15
      expect(urlWithPolygon).toContain(',14,0,0/');
      expect(urlWithoutPolygon).toContain(',15,0,0/');
    });
  });

  describe('getStaticMapWithMarker', () => {
    it('should generate static map URL with marker', () => {
      const center: [number, number] = [112.739208, -7.289659];
      const url = getStaticMapWithMarker(center);

      expect(url).toContain('api.mapbox.com/styles/v1/mapbox/streets-v12/static/');
      expect(url).toContain('pin-s+fbbf24');
      expect(url).toContain('112.739208,-7.289659');
      expect(url).toContain('access_token=test-mapbox-token');
      expect(url).toContain('300x200@2x');
    });

    it('should generate marker map with custom dimensions', () => {
      const center: [number, number] = [112.739208, -7.289659];
      const url = getStaticMapWithMarker(center, 500, 300);

      expect(url).toContain('500x300@2x');
    });

    it('should return placeholder when no Mapbox token', () => {
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN = '';
      const center: [number, number] = [112.739208, -7.289659];
      const url = getStaticMapWithMarker(center);

      expect(url).toBe('https://via.placeholder.com/300x200/e5e7eb/6b7280?text=Map+Preview');
    });

    it('should return placeholder with invalid token', () => {
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'your-mapbox-token-here';
      const center: [number, number] = [112.739208, -7.289659];
      const url = getStaticMapWithMarker(center);

      expect(url).toBe('https://via.placeholder.com/300x200/e5e7eb/6b7280?text=Map+Preview');
    });

    it('should use zoom level 14', () => {
      const center: [number, number] = [112.739208, -7.289659];
      const url = getStaticMapWithMarker(center);

      expect(url).toContain(',14,0,0/');
    });

    it('should use yellow marker color', () => {
      const center: [number, number] = [112.739208, -7.289659];
      const url = getStaticMapWithMarker(center);

      expect(url).toContain('pin-s+fbbf24'); // fbbf24 is yellow
    });
  });
});
