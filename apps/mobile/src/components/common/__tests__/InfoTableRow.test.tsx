/**
 * InfoTableRow Tests
 */
import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { InfoTableRow } from '../InfoTableRow';

describe('InfoTableRow', () => {
  it('renders a string label and value', () => {
    const { getByText } = render(<InfoTableRow label="Tipe Area" value="Taman" />);
    expect(getByText('Tipe Area')).toBeTruthy();
    expect(getByText('Taman')).toBeTruthy();
  });

  it('renders a custom value node', () => {
    const { getByText } = render(
      <InfoTableRow label="Lokasi" value={<Text>CUSTOM_NODE</Text>} />,
    );
    expect(getByText('Lokasi')).toBeTruthy();
    expect(getByText('CUSTOM_NODE')).toBeTruthy();
  });

  it('applies the testID', () => {
    const { getByTestId } = render(
      <InfoTableRow label="X" value="Y" testID="row-x" />,
    );
    expect(getByTestId('row-x')).toBeTruthy();
  });
});
