/**
 * GPSLocationSection Tests
 * Shared GPS component used in forms that require location capture.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GPSLocationSection } from '../GPSLocationSection';

jest.mock('../../nb', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    NBButton: ({ title, onPress }: any) =>
      React.createElement(TouchableOpacity, { onPress, accessibilityRole: 'button' },
        React.createElement(Text, null, title),
      ),
    NBText: ({ children }: any) => React.createElement(Text, null, children),
  };
});

describe('GPSLocationSection', () => {
  const mockRefresh = jest.fn();

  beforeEach(() => {
    mockRefresh.mockClear();
  });

  it('shows loading state when isCapturing is true', () => {
    const { getByText } = render(
      <GPSLocationSection
        location={null}
        isCapturing
        onRefresh={mockRefresh}
      />,
    );
    expect(getByText('Mendapatkan lokasi...')).toBeTruthy();
  });

  it('shows coordinates when location is captured', () => {
    const location = { latitude: -7.250445, longitude: 112.768845, accuracy: 10 };
    const { getByText } = render(
      <GPSLocationSection
        location={location}
        isCapturing={false}
        onRefresh={mockRefresh}
      />,
    );
    expect(getByText(/-7\.250445, 112\.768845/)).toBeTruthy();
  });

  it('shows accuracy when provided', () => {
    const location = { latitude: -7.0, longitude: 112.0, accuracy: 15 };
    const { getByText } = render(
      <GPSLocationSection
        location={location}
        isCapturing={false}
        onRefresh={mockRefresh}
      />,
    );
    expect(getByText(/Akurasi.*15m/)).toBeTruthy();
  });

  it('does not show accuracy section when accuracy is null', () => {
    const location = { latitude: -7.0, longitude: 112.0, accuracy: null as any };
    const { queryByText } = render(
      <GPSLocationSection
        location={location}
        isCapturing={false}
        onRefresh={mockRefresh}
      />,
    );
    expect(queryByText(/Akurasi/)).toBeNull();
  });

  it('shows unavailable message when no location', () => {
    const { getByText } = render(
      <GPSLocationSection
        location={null}
        isCapturing={false}
        onRefresh={mockRefresh}
      />,
    );
    expect(getByText('Lokasi tidak tersedia')).toBeTruthy();
  });

  it('always shows Perbarui GPS button', () => {
    const { getByText } = render(
      <GPSLocationSection
        location={null}
        isCapturing={false}
        onRefresh={mockRefresh}
      />,
    );
    expect(getByText('Perbarui GPS')).toBeTruthy();
  });

  it('calls onRefresh when Perbarui GPS is pressed', () => {
    const { getByText } = render(
      <GPSLocationSection
        location={null}
        isCapturing={false}
        onRefresh={mockRefresh}
      />,
    );
    fireEvent.press(getByText('Perbarui GPS'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows error message when error prop provided', () => {
    const { getByText } = render(
      <GPSLocationSection
        location={null}
        isCapturing={false}
        onRefresh={mockRefresh}
        error="GPS lokasi diperlukan"
      />,
    );
    expect(getByText('GPS lokasi diperlukan')).toBeTruthy();
  });
});
