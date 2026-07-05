/**
 * GPSLocationSection Tests
 * Shared GPS component used in forms that require location capture.
 * Props: latitude, longitude, accuracy, isCapturing, onRefresh, error,
 *        isWithinBoundary (opt), areaName (opt)
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GPSLocationSection } from '../GPSLocationSection';

jest.mock('../../nb', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    NBButton: ({ title, onPress, disabled }: any) =>
      React.createElement(
        TouchableOpacity,
        { onPress, accessibilityRole: 'button', disabled },
        React.createElement(Text, null, title),
      ),
    NBText: ({ children }: any) => React.createElement(Text, null, children),
    NBAlert: ({ message }: any) => React.createElement(View, null, React.createElement(Text, null, message)),
  };
});

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MockIcon');

describe('GPSLocationSection', () => {
  const mockRefresh = jest.fn();

  beforeEach(() => {
    mockRefresh.mockClear();
  });

  // ─── Loading state ──────────────────────────────────────────────────────────

  it('shows loading text when isCapturing is true', () => {
    const { getByText } = render(
      <GPSLocationSection
        latitude={null}
        longitude={null}
        isCapturing
        onRefresh={mockRefresh}
      />,
    );
    expect(getByText('Mendapatkan lokasi...')).toBeTruthy();
  });

  // ─── No location ────────────────────────────────────────────────────────────

  it('shows unavailable message when latitude and longitude are null', () => {
    const { getByText } = render(
      <GPSLocationSection
        latitude={null}
        longitude={null}
        isCapturing={false}
        onRefresh={mockRefresh}
      />,
    );
    expect(getByText('Lokasi tidak tersedia')).toBeTruthy();
  });

  // ─── Location captured ──────────────────────────────────────────────────────

  it('shows full coordinates in detail row when location is captured', () => {
    const { getByText } = render(
      <GPSLocationSection
        latitude={-7.250445}
        longitude={112.768845}
        accuracy={10}
        isCapturing={false}
        onRefresh={mockRefresh}
      />,
    );
    expect(getByText(/-7\.250445, 112\.768845/)).toBeTruthy();
  });

  it('shows accuracy badge when accuracy is provided', () => {
    const { getByText } = render(
      <GPSLocationSection
        latitude={-7.0}
        longitude={112.0}
        accuracy={15}
        isCapturing={false}
        onRefresh={mockRefresh}
      />,
    );
    expect(getByText(/±15m akurasi/)).toBeTruthy();
  });

  it('does not show accuracy badge when accuracy is null', () => {
    const { queryByText } = render(
      <GPSLocationSection
        latitude={-7.0}
        longitude={112.0}
        accuracy={null}
        isCapturing={false}
        onRefresh={mockRefresh}
      />,
    );
    expect(queryByText(/akurasi/)).toBeNull();
  });

  // ─── areaName ───────────────────────────────────────────────────────────────

  it('shows area name in status row when areaName is provided', () => {
    const { getByText } = render(
      <GPSLocationSection
        latitude={-7.250445}
        longitude={112.768845}
        isCapturing={false}
        onRefresh={mockRefresh}
        areaName="Taman Bungkul"
      />,
    );
    expect(getByText('Taman Bungkul')).toBeTruthy();
  });

  it('shows coordinate string in status row when no areaName', () => {
    const { getByText } = render(
      <GPSLocationSection
        latitude={-7.2504}
        longitude={112.7688}
        isCapturing={false}
        onRefresh={mockRefresh}
      />,
    );
    // Short 4-decimal format used in status row
    expect(getByText(/-7\.2504, 112\.7688/)).toBeTruthy();
  });

  // ─── Boundary check ─────────────────────────────────────────────────────────

  it('shows within-area success alert when isWithinBoundary is true', () => {
    const { getByText } = render(
      <GPSLocationSection
        latitude={-7.250445}
        longitude={112.768845}
        isCapturing={false}
        onRefresh={mockRefresh}
        isWithinBoundary={true}
      />,
    );
    expect(getByText('Anda berada di dalam area kerja')).toBeTruthy();
  });

  it('shows outside-area warning alert when isWithinBoundary is false', () => {
    const { getByText } = render(
      <GPSLocationSection
        latitude={-7.250445}
        longitude={112.768845}
        isCapturing={false}
        onRefresh={mockRefresh}
        isWithinBoundary={false}
      />,
    );
    expect(getByText(/Anda berada di luar area kerja/)).toBeTruthy();
  });

  it('does not show boundary alert when isWithinBoundary is undefined', () => {
    const { queryByText } = render(
      <GPSLocationSection
        latitude={-7.250445}
        longitude={112.768845}
        isCapturing={false}
        onRefresh={mockRefresh}
      />,
    );
    expect(queryByText('Anda berada di dalam area kerja')).toBeNull();
    expect(queryByText(/Anda berada di luar area kerja/)).toBeNull();
  });

  it('does not show boundary alert when no location even if isWithinBoundary is set', () => {
    const { queryByText } = render(
      <GPSLocationSection
        latitude={null}
        longitude={null}
        isCapturing={false}
        onRefresh={mockRefresh}
        isWithinBoundary={true}
      />,
    );
    expect(queryByText('Anda berada di dalam area kerja')).toBeNull();
  });

  // ─── Error ──────────────────────────────────────────────────────────────────

  it('shows error message when error prop is provided', () => {
    const { getByText } = render(
      <GPSLocationSection
        latitude={null}
        longitude={null}
        isCapturing={false}
        onRefresh={mockRefresh}
        error="GPS lokasi diperlukan"
      />,
    );
    expect(getByText('GPS lokasi diperlukan')).toBeTruthy();
  });

  // ─── Refresh button ─────────────────────────────────────────────────────────

  it('always renders Perbarui GPS button', () => {
    const { getByText } = render(
      <GPSLocationSection
        latitude={null}
        longitude={null}
        isCapturing={false}
        onRefresh={mockRefresh}
      />,
    );
    expect(getByText('Perbarui GPS')).toBeTruthy();
  });

  it('calls onRefresh when Perbarui GPS is pressed', () => {
    const { getByText } = render(
      <GPSLocationSection
        latitude={null}
        longitude={null}
        isCapturing={false}
        onRefresh={mockRefresh}
      />,
    );
    fireEvent.press(getByText('Perbarui GPS'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
