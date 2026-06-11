/**
 * DetailRow.test.tsx
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { DetailRow } from '../DetailRow';
import { View } from 'react-native';

describe('DetailRow', () => {
  describe('default variant', () => {
    it('should render label and string value', () => {
      const { getByText } = render(
        <DetailRow label="Kecamatan" value="Surabaya" />
      );

      expect(getByText('Kecamatan')).toBeTruthy();
      expect(getByText('Surabaya')).toBeTruthy();
    });

    it('should render ReactNode values', () => {
      const { getByTestId } = render(
        <DetailRow
          label="Custom Value"
          value={<View testID="custom-node">Custom JSX</View>}
        />
      );

      expect(getByTestId('custom-node')).toBeTruthy();
    });
  });

  describe('mono variant', () => {
    it('should render monospace text for mono variant', () => {
      const { getByText } = render(
        <DetailRow
          label="Koordinat GPS"
          value="-7.123456, 112.654321"
          variant="mono"
        />
      );

      expect(getByText('-7.123456, 112.654321')).toBeTruthy();
    });
  });

  describe('description variant', () => {
    it('should render multi-line text for description variant', () => {
      const longText = 'Ini adalah deskripsi yang panjang dan detail tentang sesuatu yang perlu dijelaskan dengan detail.';

      const { getByText } = render(
        <DetailRow
          label="Deskripsi"
          value={longText}
          variant="description"
        />
      );

      expect(getByText(longText)).toBeTruthy();
    });
  });

  describe('color variants', () => {
    it('should support custom label color', () => {
      const { getByText } = render(
        <DetailRow
          label="Status"
          value="Active"
          labelColor="danger"
        />
      );

      expect(getByText('Status')).toBeTruthy();
    });

    it('should support custom value color', () => {
      const { getByText } = render(
        <DetailRow
          label="Status"
          value="Pending"
          valueColor="warning"
        />
      );

      expect(getByText('Pending')).toBeTruthy();
    });
  });

  describe('spacing variants', () => {
    it('should apply compact spacing when requested', () => {
      const { getByTestId } = render(
        <DetailRow
          label="Test"
          value="Value"
          compact
          testID="compact-spacing"
        />
      );

      expect(getByTestId('compact-spacing')).toBeTruthy();
    });

    it('should remove margin bottom for last row', () => {
      const { getByTestId } = render(
        <DetailRow
          label="Last Row"
          value="Value"
          isLast
          testID="last-row"
        />
      );

      expect(getByTestId('last-row')).toBeTruthy();
    });
  });

  describe('real-world scenarios', () => {
    it('should render pruning request details', () => {
      const { getByText } = render(
        <>
          <DetailRow label="Kecamatan" value="Surabaya" />
          <DetailRow label="Rayon" value="Rayon 1" />
          <DetailRow label="Alamat" value="Jl. Test 123" />
          <DetailRow
            label="Koordinat GPS"
            value="-7.123456, 112.654321"
            variant="mono"
          />
        </>
      );

      expect(getByText('Kecamatan')).toBeTruthy();
      expect(getByText('Rayon')).toBeTruthy();
    });
  });
});
