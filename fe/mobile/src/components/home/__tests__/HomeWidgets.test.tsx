/**
 * Tests for the reusable Home dashboard widgets (HOME-1/2/3 building blocks).
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StatusPill } from '../StatusPill';
import { HomeSectionDivider } from '../HomeSectionDivider';
import { HomeStatTile } from '../HomeStatTile';
import { HomeListRow } from '../HomeListRow';

describe('StatusPill', () => {
  it('renders the label (uppercased by style, raw text preserved)', () => {
    const { getByText } = render(<StatusPill tone="ok" label="Di area" />);
    expect(getByText('Di area')).toBeTruthy();
  });

  it('renders for every tone without crashing', () => {
    (['ok', 'warn', 'bad', 'info', 'neutral'] as const).forEach((tone) => {
      const { getByText } = render(<StatusPill tone={tone} label={`p-${tone}`} />);
      expect(getByText(`p-${tone}`)).toBeTruthy();
    });
  });
});

describe('HomeSectionDivider', () => {
  it('renders the label', () => {
    const { getByText } = render(<HomeSectionDivider label="Tugas hari ini" />);
    expect(getByText('Tugas hari ini')).toBeTruthy();
  });

  it('renders the trailing slot', () => {
    const { getByText } = render(
      <HomeSectionDivider label="Tugas" trailing={<StatusPill tone="warn" label="3 tersisa" />} />
    );
    expect(getByText('3 tersisa')).toBeTruthy();
  });
});

describe('HomeStatTile', () => {
  it('renders label, value and detail', () => {
    const { getByText } = render(
      <HomeStatTile label="Jam kerja" value="6j 12m" detail="dari 8j" variant="yellow" />
    );
    expect(getByText('Jam kerja')).toBeTruthy();
    expect(getByText('6j 12m')).toBeTruthy();
    expect(getByText('dari 8j')).toBeTruthy();
  });

  it('coerces a numeric value to string', () => {
    const { getByText } = render(<HomeStatTile label="Aktivitas" value={12} />);
    expect(getByText('12')).toBeTruthy();
  });

  it('fires onPress when pressable', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <HomeStatTile label="Aktivitas" value={3} onPress={onPress} testID="tile" />
    );
    fireEvent.press(getByTestId('tile'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('HomeListRow', () => {
  it('renders title, meta and subMeta', () => {
    const { getByText } = render(
      <HomeListRow
        pill={<StatusPill tone="warn" label="Siap mulai" />}
        title="Pangkas pohon — Taman Bungkul"
        meta="08:00"
        subMeta="Zona A"
      />
    );
    expect(getByText('Pangkas pohon — Taman Bungkul')).toBeTruthy();
    expect(getByText('08:00')).toBeTruthy();
    expect(getByText('Zona A')).toBeTruthy();
    expect(getByText('Siap mulai')).toBeTruthy();
  });

  it('fires onPress when pressable', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <HomeListRow title="Tugas X" onPress={onPress} testID="row" />
    );
    fireEvent.press(getByTestId('row'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
