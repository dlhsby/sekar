/**
 * MarkerPreview tests — Phase 4 M3 (CP-S1).
 *
 * The positioned wrapper around MarkerCalloutCard. Covers: it renders the card
 * content, and tapping the whole bubble fires onDetail (opens the detail flow).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MarkerPreview, type MarkerPreviewData } from '../MarkerPreview';
import { nbColors } from '../../../constants/nbTokens';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, { testID: `icon-${props.name}` }, props.name);
});

const data = (overrides?: Partial<MarkerPreviewData>): MarkerPreviewData => ({
  x: 180,
  y: 300,
  anchorOffset: 46,
  card: {
    title: 'Budi Santoso',
    typeText: 'Petugas',
    roleText: 'Satgas',
    accent: nbColors.primary,
    icon: 'account',
  },
  onDetail: jest.fn(),
  ...overrides,
});

describe('MarkerPreview', () => {
  it('renders the callout card content', () => {
    const { getByText, getByTestId } = render(<MarkerPreview data={data()} />);
    expect(getByTestId('marker-preview')).toBeTruthy();
    expect(getByText('Budi Santoso')).toBeTruthy();
    expect(getByText('Petugas · Satgas')).toBeTruthy();
  });

  it('calls onDetail when the bubble is pressed', () => {
    const onDetail = jest.fn();
    const { getByTestId } = render(<MarkerPreview data={data({ onDetail })} />);
    fireEvent.press(getByTestId('marker-preview'));
    expect(onDetail).toHaveBeenCalledTimes(1);
  });
});
