/**
 * BoundaryOverlay Component Tests
 * Phase 2D: Rayon + area boundary polygon/circle overlays with center markers.
 * Covers polygon rendering, circle fallback, marker styling, understaffed states,
 * press callbacks, and edge cases (empty rayons, insufficient coordinates).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BoundaryOverlay } from '../BoundaryOverlay';
import type { RayonBoundary, AreaBoundary } from '../../../types/models.types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Marker: ({ children, onPress, testID, ...rest }: any) =>
      React.createElement(
        View,
        { testID: testID ?? 'marker', onTouchEnd: onPress, ...rest },
        children,
      ),
    Polygon: ({ strokeColor, fillColor, lineDashPattern, ...rest }: any) =>
      React.createElement(View, {
        testID: 'polygon',
        strokeColor,
        fillColor,
        lineDashPattern,
        ...rest,
      }),
    Circle: ({ strokeColor, fillColor, radius, center, ...rest }: any) =>
      React.createElement(View, {
        testID: 'circle',
        strokeColor,
        fillColor,
        radius,
        ...rest,
      }),
    Callout: ({ children, ...rest }: any) =>
      React.createElement(View, { testID: 'callout', ...rest }, children),
  };
});

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) =>
    React.createElement(Text, { testID: `icon-${props.name}`, ...props }, props.name);
});

jest.mock('../../../constants/nbTokens', () => ({
  nbColors: {
    white: '#FFFFFF',
    black: '#1C1917',
    dangerDark: '#B91C1C',
    requestUnderReview: '#2563EB',
    warning: '#F59E0B',
    warningLight: '#FCD34D',
    // Rayon palette (consumed by rayonColors.ts for the no-DB-color fallback).
    roleSatgas: '#7FBC8C',
    roleLinmas: '#2563EB',
    roleKorlap: '#E3A018',
    roleAdminData: '#9333EA',
    roleKepala: '#F48572',
    roleTop: '#1A4D2E',
    roleKecamatan: '#FDFD96',
  },
  nbType: {
    'display-xl': { fontFamily: "'Space Grotesk'", fontSize: 56, fontWeight: '800', lineHeight: 56 },
    display: { fontFamily: "'Space Grotesk'", fontSize: 40, fontWeight: '700', lineHeight: 42 },
    h1: { fontFamily: "'Space Grotesk'", fontSize: 28, fontWeight: '700', lineHeight: 34 },
    h2: { fontFamily: "'Space Grotesk'", fontSize: 22, fontWeight: '600', lineHeight: 29 },
    h3: { fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: '600', lineHeight: 24 },
    bodyLg: { fontFamily: "'Inter'", fontSize: 18, fontWeight: '500', lineHeight: 28 },
    body: { fontFamily: "'Inter'", fontSize: 16, fontWeight: '400', lineHeight: 24 },
    bodySm: { fontFamily: "'Inter'", fontSize: 14, fontWeight: '400', lineHeight: 20 },
    caption: { fontFamily: "'Inter'", fontSize: 12, fontWeight: '500', lineHeight: 17 },
    monoSm: { fontFamily: "'JetBrains Mono'", fontSize: 12, fontWeight: '500', lineHeight: 17 },
  },
  nbTypography: {
    fontWeight: { bold: '700' },
  },
  nbBorders: { base: 1, widthThin: 1, widthBase: 2, widthThick: 3 },
  nbRadius: { sm: 4, base: 6, md: 8, lg: 12 },
  nbShadows: { sm: {}, md: {} },
  withAlpha: (hex: string, alpha: number) => `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** GeoJSON Polygon with a three-coordinate outer ring near Surabaya. */
const TRIANGLE_GEOJSON: { type: 'Polygon'; coordinates: [number, number][][] } = {
  type: 'Polygon',
  coordinates: [
    [
      [112.768, -7.250],
      [112.770, -7.252],
      [112.766, -7.252],
    ],
  ],
};

function buildArea(overrides?: Partial<AreaBoundary>): AreaBoundary {
  return {
    id: 'area-1',
    name: 'Taman Bungkul',
    center_lat: -7.2888,
    center_lng: 112.7378,
    boundary_polygon: TRIANGLE_GEOJSON,
    radius_meters: 150,
    rayon_id: 'rayon-1',
    rayon_name: 'Rayon Selatan',
    assigned_count: 3,
    staffing: [],
    is_understaffed: false,
    total_active: 3,
    total_required: 3,
    ...overrides,
  };
}

function buildRayon(
  areas: AreaBoundary[] = [buildArea()],
  overrides?: Partial<RayonBoundary>,
): RayonBoundary {
  return {
    id: 'rayon-1',
    name: 'Rayon Selatan',
    center_lat: -7.290,
    center_lng: 112.740,
    boundary_polygon: TRIANGLE_GEOJSON,
    areas,
    area_count: areas.length,
    is_understaffed: false,
    understaffed_area_count: 0,
    // DB-driven boundary color (Phase 4 M3). The overlay prefers this over the
    // deterministic palette; '#2563EB' keeps the legacy stroke assertions valid.
    color: '#2563EB',
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BoundaryOverlay', () => {
  const onRayonMarkerPress = jest.fn();
  const onAreaMarkerPress = jest.fn();
  const onRayonBubblePress = jest.fn();
  const onAreaBubblePress = jest.fn();

  const defaultProps = {
    onRayonMarkerPress,
    onAreaMarkerPress,
    onRayonBubblePress,
    onAreaBubblePress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Empty rayons ─────────────────────────────────────────────────────────────

  describe('empty rayons array', () => {
    it('renders nothing when rayons is empty', () => {
      const { queryAllByTestId } = render(
        <BoundaryOverlay rayons={[]} {...defaultProps} showRayonMarker showAreaMarker />,
      );

      expect(queryAllByTestId('polygon')).toHaveLength(0);
      expect(queryAllByTestId('circle')).toHaveLength(0);
      expect(queryAllByTestId('marker')).toHaveLength(0);
    });
  });

  // ── Rayon polygons ───────────────────────────────────────────────────────────

  describe('rayon polygon rendering', () => {
    it('renders a polygon for a rayon with 3+ coordinates', () => {
      const { getAllByTestId } = render(
        <BoundaryOverlay rayons={[buildRayon()]} {...defaultProps} />,
      );

      const polygons = getAllByTestId('polygon');
      // at least the rayon polygon
      expect(polygons.length).toBeGreaterThanOrEqual(1);
    });

    it('applies the rayon DB color as the polygon stroke', () => {
      const { getAllByTestId } = render(
        <BoundaryOverlay rayons={[buildRayon()]} {...defaultProps} />,
      );

      const polygons = getAllByTestId('polygon');
      const rayonPoly = polygons[0];
      // Default fixture sets color: '#2563EB' → preferred over the palette.
      expect(rayonPoly.props.strokeColor).toBe('#2563EB');
    });

    it('falls back to a deterministic palette color when no DB color is set', () => {
      const rayon = buildRayon([buildArea()], { color: undefined });
      const { getAllByTestId } = render(
        <BoundaryOverlay rayons={[rayon]} {...defaultProps} />,
      );

      const polygons = getAllByTestId('polygon');
      // Single sorted rayon → first palette slot (roleSatgas '#7FBC8C').
      expect(polygons[0].props.strokeColor).toBe('#7FBC8C');
    });

    it('applies dashed line pattern to the rayon polygon', () => {
      const { getAllByTestId } = render(
        <BoundaryOverlay rayons={[buildRayon()]} {...defaultProps} />,
      );

      const polygons = getAllByTestId('polygon');
      expect(polygons[0].props.lineDashPattern).toEqual([8, 4]);
    });

    it('skips rayon polygon when boundary_polygon is null', () => {
      const rayon = buildRayon([], { boundary_polygon: null });
      const { queryAllByTestId } = render(
        <BoundaryOverlay rayons={[rayon]} {...defaultProps} />,
      );

      // No polygon should be rendered for the rayon itself
      expect(queryAllByTestId('polygon')).toHaveLength(0);
    });

    it('skips rayon polygon when boundary_polygon has fewer than 3 coordinates', () => {
      const twoCoords = {
        type: 'Polygon' as const,
        coordinates: [
          [
            [112.768, -7.250] as [number, number],
            [112.770, -7.252] as [number, number],
          ],
        ],
      };
      const rayon = buildRayon([], { boundary_polygon: twoCoords });
      const { queryAllByTestId } = render(
        <BoundaryOverlay rayons={[rayon]} {...defaultProps} />,
      );

      expect(queryAllByTestId('polygon')).toHaveLength(0);
    });

    it('renders polygons for multiple rayons', () => {
      const rayon1 = buildRayon([], { id: 'rayon-1' });
      const rayon2 = buildRayon([], { id: 'rayon-2' });

      const { getAllByTestId } = render(
        <BoundaryOverlay rayons={[rayon1, rayon2]} {...defaultProps} />,
      );

      const polygons = getAllByTestId('polygon');
      expect(polygons.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── Area polygons and circle fallback ────────────────────────────────────────

  describe('area polygon and circle rendering', () => {
    it('renders an area polygon when boundary_polygon has 3+ coordinates', () => {
      const area = buildArea({ boundary_polygon: TRIANGLE_GEOJSON });
      const { getAllByTestId } = render(
        <BoundaryOverlay rayons={[buildRayon([area])]} {...defaultProps} />,
      );

      const polygons = getAllByTestId('polygon');
      // rayon polygon + area polygon = 2
      expect(polygons.length).toBeGreaterThanOrEqual(2);
    });

    it('renders a circle fallback when area has no boundary_polygon', () => {
      const area = buildArea({ boundary_polygon: null });
      const { getByTestId } = render(
        <BoundaryOverlay rayons={[buildRayon([area])]} {...defaultProps} />,
      );

      expect(getByTestId('circle')).toBeTruthy();
    });

    it('renders a circle fallback when boundary_polygon has fewer than 3 coordinates', () => {
      const oneCoord = {
        type: 'Polygon' as const,
        coordinates: [[[112.768, -7.250] as [number, number]]],
      };
      const area = buildArea({ boundary_polygon: oneCoord });
      const { getByTestId } = render(
        <BoundaryOverlay rayons={[buildRayon([area])]} {...defaultProps} />,
      );

      expect(getByTestId('circle')).toBeTruthy();
    });

    it('does not render a circle when a valid area polygon exists', () => {
      const area = buildArea({ boundary_polygon: TRIANGLE_GEOJSON });
      const { queryAllByTestId } = render(
        <BoundaryOverlay rayons={[buildRayon([area])]} {...defaultProps} />,
      );

      expect(queryAllByTestId('circle')).toHaveLength(0);
    });
  });

  // ── Area marker (current node → detail, area scope) ───────────────────────────

  describe('area marker', () => {
    it('renders the map-marker icon when showAreaMarker is set', () => {
      const { getByTestId } = render(
        <BoundaryOverlay rayons={[buildRayon([buildArea()])]} {...defaultProps} showAreaMarker />,
      );

      expect(getByTestId('icon-map-marker')).toBeTruthy();
    });

    it('does not render the area marker when showAreaMarker is unset', () => {
      const { queryByTestId } = render(
        <BoundaryOverlay rayons={[buildRayon([buildArea()])]} {...defaultProps} />,
      );

      expect(queryByTestId('icon-map-marker')).toBeNull();
    });

    it('applies dashed border style when area is understaffed', () => {
      const area = buildArea({ is_understaffed: true });
      const { toJSON } = render(
        <BoundaryOverlay rayons={[buildRayon([area])]} {...defaultProps} showAreaMarker />,
      );

      // StyleSheet.create returns numeric IDs; inspect the JSON tree for the
      // flattened borderStyle value that React Native resolves at render time.
      const json = JSON.stringify(toJSON());
      expect(json).toContain('dashed');
    });

    it('does not apply dashed border when area is not understaffed', () => {
      const area = buildArea({ is_understaffed: false });
      const { toJSON } = render(
        <BoundaryOverlay rayons={[buildRayon([area])]} {...defaultProps} showAreaMarker />,
      );

      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('dashed');
    });
  });

  // ── Rayon marker (current node → detail, rayon scope) ─────────────────────────

  describe('rayon marker', () => {
    it('renders the office-building icon when showRayonMarker is set', () => {
      const { getByTestId } = render(
        <BoundaryOverlay rayons={[buildRayon()]} {...defaultProps} showRayonMarker />,
      );

      expect(getByTestId('icon-office-building')).toBeTruthy();
    });

    it('renders understaffed badge when understaffed_area_count > 0', () => {
      const rayon = buildRayon([], { understaffed_area_count: 2 });
      const { getByText } = render(
        <BoundaryOverlay rayons={[rayon]} {...defaultProps} showRayonMarker />,
      );

      expect(getByText('2')).toBeTruthy();
    });

    it('does not render understaffed badge when understaffed_area_count is 0', () => {
      const rayon = buildRayon([], { understaffed_area_count: 0 });
      const { queryByText } = render(
        <BoundaryOverlay rayons={[rayon]} {...defaultProps} showRayonMarker />,
      );

      // Badge text should not appear
      expect(queryByText('0')).toBeNull();
    });
  });

  // ── Node bubbles (child aggregate → drill) ────────────────────────────────────

  describe('node bubbles', () => {
    it('renders a rayon bubble with the name and ratio when showRayonBubbles is set', () => {
      const rayon = buildRayon([], { id: 'rayon-1', name: 'Rayon Selatan' });
      const { getByText } = render(
        <BoundaryOverlay
          rayons={[rayon]}
          {...defaultProps}
          showRayonBubbles
          rosterById={{ 'rayon-1': { clockedIn: 4, scheduled: 6 } }}
        />,
      );

      expect(getByText('Rayon Selatan')).toBeTruthy();
      expect(getByText('4/6')).toBeTruthy();
    });

    it('renders an area bubble with the name and ratio when showAreaBubbles is set', () => {
      const area = buildArea({ id: 'area-1', name: 'Taman Bungkul' });
      const { getByText } = render(
        <BoundaryOverlay
          rayons={[buildRayon([area])]}
          {...defaultProps}
          showAreaBubbles
          rosterById={{ 'area-1': { clockedIn: 2, scheduled: 3 } }}
        />,
      );

      expect(getByText('Taman Bungkul')).toBeTruthy();
      expect(getByText('2/3')).toBeTruthy();
    });

    it('shows an em-dash ratio when the node has no roster entry', () => {
      const rayon = buildRayon([], { id: 'rayon-1', name: 'Rayon Selatan' });
      const { getByText } = render(
        <BoundaryOverlay rayons={[rayon]} {...defaultProps} showRayonBubbles />,
      );

      expect(getByText('—')).toBeTruthy();
    });

    it('does not render a rayon office icon at bubble (city) scope', () => {
      const { queryByTestId } = render(
        <BoundaryOverlay rayons={[buildRayon()]} {...defaultProps} showRayonBubbles />,
      );

      expect(queryByTestId('icon-office-building')).toBeNull();
    });
  });

  // ── Press callbacks ───────────────────────────────────────────────────────────

  describe('press callbacks', () => {
    it('calls onRayonMarkerPress with the rayon when its marker is pressed', () => {
      const rayon = buildRayon([], { id: 'rayon-42', name: 'Rayon Utara' });
      const { getAllByTestId } = render(
        <BoundaryOverlay rayons={[rayon]} {...defaultProps} showRayonMarker />,
      );

      const markers = getAllByTestId('marker');
      fireEvent(markers[markers.length - 1], 'onTouchEnd');

      expect(onRayonMarkerPress).toHaveBeenCalledTimes(1);
      expect(onRayonMarkerPress).toHaveBeenCalledWith(rayon);
    });

    it('calls onAreaMarkerPress with the area when its marker is pressed', () => {
      const area = buildArea({ id: 'area-99', name: 'Taman Ria' });
      const { getAllByTestId } = render(
        <BoundaryOverlay rayons={[buildRayon([area])]} {...defaultProps} showAreaMarker />,
      );

      fireEvent(getAllByTestId('marker')[0], 'onTouchEnd');

      expect(onAreaMarkerPress).toHaveBeenCalledTimes(1);
      expect(onAreaMarkerPress).toHaveBeenCalledWith(area);
    });

    it('calls onRayonBubblePress when a rayon bubble is pressed', () => {
      const rayon1 = buildRayon([], { id: 'rayon-1', name: 'Rayon A' });
      const rayon2 = buildRayon([], { id: 'rayon-2', name: 'Rayon B' });
      const { getAllByTestId } = render(
        <BoundaryOverlay rayons={[rayon1, rayon2]} {...defaultProps} showRayonBubbles />,
      );

      const markers = getAllByTestId('marker');
      fireEvent(markers[1], 'onTouchEnd');

      expect(onRayonBubblePress).toHaveBeenCalledWith(rayon2);
      expect(onRayonMarkerPress).not.toHaveBeenCalled();
    });

    it('calls onAreaBubblePress for the correct area when multiple areas exist', () => {
      const area1 = buildArea({ id: 'area-1', name: 'Taman A' });
      const area2 = buildArea({ id: 'area-2', name: 'Taman B', center_lat: -7.300 });
      const { getAllByTestId } = render(
        <BoundaryOverlay rayons={[buildRayon([area1, area2])]} {...defaultProps} showAreaBubbles />,
      );

      const markers = getAllByTestId('marker');
      fireEvent(markers[1], 'onTouchEnd');

      expect(onAreaBubblePress).toHaveBeenCalledWith(area2);
      expect(onAreaMarkerPress).not.toHaveBeenCalled();
    });

    it('does not fire any callback when nothing is pressed', () => {
      render(<BoundaryOverlay rayons={[buildRayon()]} {...defaultProps} showRayonMarker showAreaMarker />);
      expect(onRayonMarkerPress).not.toHaveBeenCalled();
      expect(onAreaMarkerPress).not.toHaveBeenCalled();
      expect(onRayonBubblePress).not.toHaveBeenCalled();
      expect(onAreaBubblePress).not.toHaveBeenCalled();
    });
  });

  // ── Layer ordering ────────────────────────────────────────────────────────────

  describe('layer ordering', () => {
    it('renders rayon polygon before area polygon in the DOM', () => {
      const area = buildArea({ boundary_polygon: TRIANGLE_GEOJSON });
      const { getAllByTestId } = render(
        <BoundaryOverlay rayons={[buildRayon([area])]} {...defaultProps} />,
      );

      // Both rayon and area produce polygons; rayon polygon (strokeColor=#2563EB) is first
      const polygons = getAllByTestId('polygon');
      expect(polygons[0].props.strokeColor).toBe('#2563EB');
    });
  });
});
