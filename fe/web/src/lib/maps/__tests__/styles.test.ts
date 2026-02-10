/**
 * Unit Tests: Map Styles
 * Tests Mapbox map style configurations
 */

import { mapStyles, surabayaCenter, defaultZoom, surabayaBounds, polygonColors } from '../styles';

describe('Map Styles', () => {
  it('should export mapStyles object', () => {
    expect(mapStyles).toBeDefined();
    expect(typeof mapStyles).toBe('object');
  });

  it('should have streets style', () => {
    expect(mapStyles.streets).toBeDefined();
    expect(mapStyles.streets).toContain('mapbox');
  });

  it('should have satellite style', () => {
    expect(mapStyles.satellite).toBeDefined();
    expect(mapStyles.satellite).toContain('mapbox');
  });

  it('should have light style', () => {
    expect(mapStyles.light).toBeDefined();
    expect(mapStyles.light).toContain('mapbox');
  });

  it('should have dark style', () => {
    expect(mapStyles.dark).toBeDefined();
    expect(mapStyles.dark).toContain('mapbox');
  });

  it('should export Surabaya center coordinates', () => {
    expect(surabayaCenter).toBeDefined();
    expect(Array.isArray(surabayaCenter)).toBe(true);
    expect(surabayaCenter).toHaveLength(2);
    expect(surabayaCenter[0]).toBeCloseTo(112.7521);
    expect(surabayaCenter[1]).toBeCloseTo(-7.2575);
  });

  it('should export default zoom level', () => {
    expect(defaultZoom).toBeDefined();
    expect(typeof defaultZoom).toBe('number');
    expect(defaultZoom).toBe(12);
  });

  it('should export Surabaya bounds', () => {
    expect(surabayaBounds).toBeDefined();
    expect(Array.isArray(surabayaBounds)).toBe(true);
    expect(surabayaBounds).toHaveLength(2);
    expect(surabayaBounds[0]).toHaveLength(2); // Southwest
    expect(surabayaBounds[1]).toHaveLength(2); // Northeast
  });

  it('should export polygon colors with Neo Brutalism style', () => {
    expect(polygonColors).toBeDefined();
    expect(polygonColors.fill).toBe('#fbbf24');
    expect(polygonColors.stroke).toBe('#000000');
    expect(polygonColors.strokeWidth).toBe(3);
  });
});
