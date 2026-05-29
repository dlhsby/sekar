/**
 * ListItemCard tests — the shared list-row card (status pill, created date,
 * title, description, meta chips, creator, extra tag, press).
 */

import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ListItemCard, type ListItemMeta } from '../ListItemCard';

const META: ListItemMeta[] = [
  { icon: 'map-marker', label: 'Taman Bungkul' },
  { icon: 'camera', label: '2 foto' },
];

function renderCard(overrides = {}) {
  const onPress = jest.fn();
  const utils = render(
    <ListItemCard
      statusTone="ok"
      statusLabel="Berjalan"
      rightText="21 Mei · 08:00"
      title="Penyiraman Trembesi"
      description="Penyiraman pohon area utara"
      meta={META}
      creatorText="korlap · Budi S."
      onPress={onPress}
      accessibilityLabel="Detail item"
      testID="li-card"
      {...overrides}
    />,
  );
  return { onPress, ...utils };
}

describe('ListItemCard', () => {
  it('renders the status pill label', () => {
    const { getByText } = renderCard();
    expect(getByText('Berjalan')).toBeTruthy();
  });

  it('renders the right-side text (created date)', () => {
    const { getByText } = renderCard();
    expect(getByText('21 Mei · 08:00')).toBeTruthy();
  });

  it('renders the title', () => {
    const { getByText } = renderCard();
    expect(getByText('Penyiraman Trembesi')).toBeTruthy();
  });

  describe('description', () => {
    it('renders when present', () => {
      const { getByText } = renderCard();
      expect(getByText('Penyiraman pohon area utara')).toBeTruthy();
    });

    it('is omitted when absent', () => {
      const { queryByText } = renderCard({ description: undefined });
      expect(queryByText('Penyiraman pohon area utara')).toBeNull();
    });
  });

  describe('meta chips', () => {
    it('renders each meta label', () => {
      const { getByText } = renderCard();
      expect(getByText('Taman Bungkul')).toBeTruthy();
      expect(getByText('2 foto')).toBeTruthy();
    });

    it('renders nothing when meta is empty', () => {
      const { queryByText } = renderCard({ meta: [] });
      expect(queryByText('Taman Bungkul')).toBeNull();
    });

    it('renders nothing when meta is undefined', () => {
      const { queryByText } = renderCard({ meta: undefined });
      expect(queryByText('2 foto')).toBeNull();
    });
  });

  describe('creator', () => {
    it('renders when present', () => {
      const { getByText } = renderCard();
      expect(getByText('korlap · Budi S.')).toBeTruthy();
    });

    it('is omitted when absent', () => {
      const { queryByText } = renderCard({ creatorText: undefined });
      expect(queryByText('korlap · Budi S.')).toBeNull();
    });
  });

  describe('rightText', () => {
    it('is omitted when absent', () => {
      const { queryByText } = renderCard({ rightText: undefined });
      expect(queryByText('21 Mei · 08:00')).toBeNull();
    });
  });

  describe('extraTag', () => {
    it('renders a provided extra tag node', () => {
      const { getByText } = renderCard({
        extraTag: <Text>Diikutsertakan</Text>,
      });
      expect(getByText('Diikutsertakan')).toBeTruthy();
    });
  });

  describe('interaction', () => {
    it('calls onPress when tapped', () => {
      const { getByText, onPress } = renderCard();
      fireEvent.press(getByText('Penyiraman Trembesi'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('exposes the accessibility label on the card', () => {
      const { getByLabelText } = renderCard();
      expect(getByLabelText('Detail item')).toBeTruthy();
    });
  });
});
