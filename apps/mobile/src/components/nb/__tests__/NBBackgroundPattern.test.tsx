/**
 * NBBackgroundPattern Component Tests
 *
 * Note: react-native-svg has complex testing requirements in Jest.
 * These tests verify the component API without deep SVG testing.
 * The component is integration-tested via LoginScreen.
 */

import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { NBBackgroundPattern } from '../NBBackgroundPattern';

// For testing purposes, we only verify that the component renders children
// SVG pattern visual testing is done in the actual app

describe('NBBackgroundPattern', () => {
  it('renders children without crashing', () => {
    const { getByText } = render(
      <NBBackgroundPattern pattern="none">
        <Text>Test Content</Text>
      </NBBackgroundPattern>,
    );
    expect(getByText('Test Content')).toBeTruthy();
  });

  it('renders multiple children', () => {
    const { getByText } = render(
      <NBBackgroundPattern pattern="none">
        <Text>First</Text>
        <Text>Second</Text>
      </NBBackgroundPattern>,
    );
    expect(getByText('First')).toBeTruthy();
    expect(getByText('Second')).toBeTruthy();
  });
});
