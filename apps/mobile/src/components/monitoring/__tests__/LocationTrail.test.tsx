/**
 * LocationTrailOverlay tests — Phase 4 M3 (CP4).
 *
 * The overlay sits on top of the trail MapView and renders exactly one of:
 *   - the bottom info bar (when history has points),
 *   - a loading pill,
 *   - an NBEmptyState error card with a "Coba Lagi" retry CTA,
 *   - an NBEmptyState "no data" card (history present but zero points).
 *
 * The header (back + worker name + date stepper) now lives in NBModal's frame,
 * so it's not part of this component anymore. react-native-maps is mocked
 * because LocationTrail.tsx imports it at module scope (Marker/Polyline/Callout).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LocationTrailOverlay } from '../LocationTrail';
import type { LocationHistory, LocationHistoryPoint } from '../../../types/models.types';

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Marker: ({ children, ...rest }: any) => React.createElement(View, rest, children),
    Polyline: (props: any) => React.createElement(View, props),
    Callout: ({ children, ...rest }: any) => React.createElement(View, rest, children),
  };
});

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, { testID: `icon-${props.name}` }, props.name);
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function buildPoint(overrides?: Partial<LocationHistoryPoint>): LocationHistoryPoint {
  return {
    latitude: -7.250445,
    longitude: 112.768845,
    accuracy: 5,
    battery_level: 80,
    logged_at: '2026-03-05T08:00:00Z',
    is_within_area: true,
    ...overrides,
  };
}

function buildHistory(points: LocationHistoryPoint[]): LocationHistory {
  return {
    user_id: 'user-123',
    user_name: 'Ahmad Satgas',
    role: 'satgas',
    date: '2026-03-05',
    shift_id: 'shift-123',
    shift_name: 'Shift Pagi',
    location_id: 'area-1',
    location_name: 'Taman A',
    clock_in_time: '2026-03-05T07:00:00Z',
    clock_out_time: null,
    points,
    total_points: points.length,
    total_distance_meters: 500,
    time_inside_area_minutes: 90,
    time_outside_area_minutes: 30,
    generated_at: '2026-03-05T09:30:00Z',
  };
}

describe('LocationTrailOverlay', () => {
  it('renders the info bar when history has points', () => {
    const history = buildHistory([buildPoint(), buildPoint()]);
    const { getByText, queryByTestId } = render(
      <LocationTrailOverlay history={history} isLoading={false} error={null} />,
    );
    // Info bar stats present…
    expect(getByText('Total Jarak')).toBeTruthy();
    expect(getByText('500 m')).toBeTruthy();
    // …and neither empty nor error state.
    expect(queryByTestId('trail-empty-title')).toBeNull();
    expect(queryByTestId('trail-error-title')).toBeNull();
  });

  it('shows the no-data state (and no info bar) when history has zero points', () => {
    const history = buildHistory([]);
    const { getByTestId, queryByText } = render(
      <LocationTrailOverlay history={history} isLoading={false} error={null} />,
    );
    expect(getByTestId('trail-empty-title')).toBeTruthy();
    // The misleading all-zero info bar must NOT render.
    expect(queryByText('Total Jarak')).toBeNull();
  });

  it('shows the error state with a retry CTA that calls onRetry', () => {
    const onRetry = jest.fn();
    const { getByTestId, queryByText } = render(
      <LocationTrailOverlay
        history={null}
        isLoading={false}
        error="Gagal memuat riwayat lokasi"
        onRetry={onRetry}
      />,
    );
    expect(getByTestId('trail-error-title')).toBeTruthy();
    expect(queryByText('Total Jarak')).toBeNull();

    fireEvent.press(getByTestId('trail-error-cta'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('omits the retry CTA when no onRetry is provided', () => {
    const { getByTestId, queryByTestId } = render(
      <LocationTrailOverlay history={null} isLoading={false} error="boom" />,
    );
    expect(getByTestId('trail-error-title')).toBeTruthy();
    expect(queryByTestId('trail-error-cta')).toBeNull();
  });

  it('shows the loading pill while loading', () => {
    const { getByText, queryByTestId } = render(
      <LocationTrailOverlay history={null} isLoading error={null} />,
    );
    expect(getByText('Memuat riwayat lokasi…')).toBeTruthy();
    expect(queryByTestId('trail-error-title')).toBeNull();
    expect(queryByTestId('trail-empty-title')).toBeNull();
  });
});
