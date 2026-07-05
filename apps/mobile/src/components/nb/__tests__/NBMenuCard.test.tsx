/**
 * NBMenuCard Component Tests
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NBMenuCard } from '../NBMenuCard';

// Haptic feedback + AccessibilityInfo mocked in jest.setup.js

describe('NBMenuCard', () => {
  const onPress = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders the label', () => {
    const { getByText } = render(
      <NBMenuCard icon="clipboard-list-outline" label="Tugas" onPress={onPress} />,
    );
    expect(getByText('Tugas')).toBeTruthy();
  });

  it('fires onPress when tapped', () => {
    const { getByTestId } = render(
      <NBMenuCard icon="map" label="Monitoring" onPress={onPress} testID="tile" />,
    );
    fireEvent.press(getByTestId('tile'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders with an illustration variant without crashing', () => {
    const { getByText } = render(
      <NBMenuCard
        icon="clock-outline"
        label="Absensi"
        illustration="illo-shifts"
        onPress={onPress}
      />,
    );
    expect(getByText('Absensi')).toBeTruthy();
  });
});
