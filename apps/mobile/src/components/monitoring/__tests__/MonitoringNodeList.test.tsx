/**
 * The Wilayah list.
 *
 * The rules worth defending: hiding changes what is LISTED and never what is
 * COUNTED, it is always visible that something is hidden, and a long name must
 * not push the row's actions out of reach.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MonitoringNodeList } from '../MonitoringNodeList';
import type { NodeMarker } from '../AggregateBubbleLayer';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text testID="icon">{name}</Text>;
});

const node = (over: Partial<NodeMarker> = {}): NodeMarker => ({
  id: 'k1',
  name: 'Kawasan Darmo',
  variant: 'region',
  lat: -7.25,
  lng: 112.75,
  scheduled: 6,
  clocked_in: 4,
  not_clocked_in: 2,
  belum_hadir: 1,
  tidak_hadir: 1,
  ...over,
});

describe('MonitoringNodeList', () => {
  it('lists the level and drills from a row', () => {
    const onDrill = jest.fn();
    const { getByTestId } = render(
      <MonitoringNodeList nodes={[node()]} onDrill={onDrill} />,
    );
    fireEvent.press(getByTestId('node-row-k1'));
    expect(onDrill).toHaveBeenCalledWith(expect.objectContaining({ id: 'k1' }));
  });

  it('drops a hidden row from the list but keeps the others', () => {
    const { queryByTestId, getByTestId } = render(
      <MonitoringNodeList
        nodes={[node(), node({ id: 'k2', name: 'Kawasan Lain' })]}
        onDrill={jest.fn()}
        isHidden={id => id === 'k1'}
        onToggleHidden={jest.fn()}
        onShowAllHidden={jest.fn()}
      />,
    );
    expect(queryByTestId('node-row-k1')).toBeNull();
    expect(getByTestId('node-row-k2')).toBeTruthy();
  });

  it('says how many are hidden, and offers the way back', () => {
    // Rule 2. A silent filter is how an operator ends up staring at an
    // incomplete list believing it is complete.
    const onShowAll = jest.fn();
    const { getByTestId } = render(
      <MonitoringNodeList
        nodes={[node(), node({ id: 'k2' })]}
        onDrill={jest.fn()}
        isHidden={id => id === 'k1'}
        onShowAllHidden={onShowAll}
      />,
    );
    fireEvent.press(getByTestId('restore-hidden-nodes'));
    expect(onShowAll).toHaveBeenCalled();
  });

  it('shows no banner when nothing is hidden', () => {
    const { queryByTestId } = render(
      <MonitoringNodeList nodes={[node()]} onDrill={jest.fn()} onShowAllHidden={jest.fn()} />,
    );
    expect(queryByTestId('restore-hidden-nodes')).toBeNull();
  });

  it('offers hide and detail per row', () => {
    const onToggle = jest.fn();
    const onDetail = jest.fn();
    const { getByTestId } = render(
      <MonitoringNodeList
        nodes={[node()]}
        onDrill={jest.fn()}
        onDetail={onDetail}
        onToggleHidden={onToggle}
      />,
    );
    fireEvent.press(getByTestId('node-hide-k1'));
    fireEvent.press(getByTestId('node-detail-k1'));
    expect(onToggle).toHaveBeenCalledWith('k1');
    expect(onDetail).toHaveBeenCalledWith(expect.objectContaining({ id: 'k1' }));
  });

  it('badges tiers only when the level actually mixes them', () => {
    // At rayon scope kawasan and rayon-less lokasi are siblings; anywhere else
    // every row is the same tier and the chip is noise.
    const mixed = render(
      <MonitoringNodeList
        nodes={[node(), node({ id: 'a1', variant: 'location', name: 'Taman' })]}
        onDrill={jest.fn()}
      />,
    );
    expect(mixed.queryAllByText('Kawasan').length).toBeGreaterThan(0);

    const uniform = render(
      <MonitoringNodeList nodes={[node(), node({ id: 'k2' })]} onDrill={jest.fn()} />,
    );
    expect(uniform.queryAllByText('Kawasan')).toHaveLength(0);
  });

  it('tells the operator when a level has no children', () => {
    const { getByText } = render(<MonitoringNodeList nodes={[]} onDrill={jest.fn()} />);
    expect(getByText('Tidak ada wilayah di tingkat ini.')).toBeTruthy();
  });
});
