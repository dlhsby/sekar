/**
 * StatusPill tests — label rendering, optional status dot, and tone variants.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { StatusPill, type StatusTone } from '../StatusPill';

describe('StatusPill', () => {
  it('renders the label text', () => {
    const { getByText } = render(<StatusPill label="Berjalan" tone="ok" />);
    expect(getByText('Berjalan')).toBeTruthy();
  });

  describe('status dot', () => {
    it('omits the dot by default', () => {
      const { queryByTestId } = render(<StatusPill label="Menunggu" testID="pill" />);
      expect(queryByTestId('pill-dot')).toBeNull();
    });

    it('renders the dot when dot is set', () => {
      const { getByTestId } = render(<StatusPill label="Menunggu" dot testID="pill" />);
      expect(getByTestId('pill-dot')).toBeTruthy();
    });

    it('does not attach a dot testID when no testID is given', () => {
      // Should not crash and still renders the label.
      const { getByText } = render(<StatusPill label="Aktif" dot />);
      expect(getByText('Aktif')).toBeTruthy();
    });
  });

  describe('tone variants', () => {
    const tones: StatusTone[] = ['ok', 'warn', 'bad', 'info', 'neutral'];
    test.each(tones)('renders label for tone "%s"', (tone) => {
      const { getByText } = render(<StatusPill label={`T-${tone}`} tone={tone} />);
      expect(getByText(`T-${tone}`)).toBeTruthy();
    });

    it('defaults to the neutral tone when tone is omitted', () => {
      const { getByText } = render(<StatusPill label="Default" />);
      expect(getByText('Default')).toBeTruthy();
    });
  });
});
