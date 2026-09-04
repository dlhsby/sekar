/**
 * NodeMarkerLayer — the unified glyph pin for drill nodes (ADR-051), and the
 * progressive-reveal dot that replaces it when a node loses its screen cell.
 *
 * Mirrors web's NodeMarkerLayer test: one marker per placed node, pin-vs-dot
 * chosen ONLY by the promoted set, and a demoted node that still drills.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NodeMarkerLayer, type NodeMarker } from '../NodeMarkerLayer';

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Marker: ({ children, testID, onPress }: any) =>
      React.createElement(View, { testID, onPress }, children),
  };
});

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SvgXml: ({ xml, testID }: any) => React.createElement(View, { testID, accessibilityLabel: xml }),
  };
});

function node(over: Partial<NodeMarker>): NodeMarker {
  return {
    id: 'r1',
    name: 'Rayon Selatan',
    variant: 'district',
    lat: -7.3,
    lng: 112.7,
    scheduled: 6,
    clocked_in: 4,
    not_clocked_in: 2,
    belum_hadir: 1,
    tidak_hadir: 1,
    active: 3,
    ...over,
  };
}

describe('NodeMarkerLayer', () => {
  it('renders one marker per node with a center', () => {
    const { getByTestId } = render(
      <NodeMarkerLayer
        nodes={[node({ id: 'r1' }), node({ id: 'r2', name: 'Rayon Utara', lat: -7.4 })]}
        onDrill={jest.fn()}
      />,
    );
    expect(getByTestId('node-marker-r1')).toBeTruthy();
    expect(getByTestId('node-marker-r2')).toBeTruthy();
  });

  it('skips nodes without a center point', () => {
    const { queryByTestId } = render(
      <NodeMarkerLayer
        nodes={[node({ id: 'r1', lat: null as unknown as number, lng: null as unknown as number })]}
        onDrill={jest.fn()}
      />,
    );
    expect(queryByTestId('node-marker-r1')).toBeNull();
  });

  it('forwards the tapped node to onDrill', () => {
    const onDrill = jest.fn();
    const n = node({ id: 'r1' });
    const { getByTestId } = render(<NodeMarkerLayer nodes={[n]} onDrill={onDrill} />);
    fireEvent(getByTestId('node-marker-r1'), 'press');
    expect(onDrill).toHaveBeenCalledWith(n);
  });

  it('draws a glyph pin carrying the ACTIVE count, not an attendance ratio', () => {
    const { getByTestId } = render(
      <NodeMarkerLayer nodes={[node({ id: 'r1', active: 3, clocked_in: 4, scheduled: 6 })]} onDrill={jest.fn()} />,
    );
    const pin = getByTestId('node-pin-r1');
    const svg = pin.props.accessibilityLabel as string;
    expect(svg).toContain('>3<'); // the active-count badge
    expect(svg).not.toContain('4/6'); // the retired ratio bubble
  });

  it('draws an empty lokasi as a badge-less glyph pin — never a dot', () => {
    // The ring is NEUTRAL ink on every node (identity is the glyph, colour is
    // status), so an empty node shows its grey health on the count badge and the
    // name label. With nothing scheduled there is no badge, so the label carries
    // it alone — and the pin still draws, because a lokasi must read as a lokasi.
    const { getByTestId, getByText, queryByTestId } = render(
      <NodeMarkerLayer
        nodes={[node({ id: 'l1', name: 'Taman Bungkul', variant: 'location', scheduled: 0, clocked_in: 0, active: 0 })]}
        onDrill={jest.fn()}
      />,
    );
    expect(queryByTestId('node-dot-l1')).toBeNull();
    const svg = getByTestId('node-pin-l1').props.accessibilityLabel as string;
    expect(svg).not.toContain('<text'); // no count badge
    expect(svg).toContain('stroke="#1C1917"'); // neutral ink ring, as on web
    expect(getByText('Taman Bungkul').props.style.flat(2)).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: '#78716C' })]),
    );
  });

  it('never clusters coincident nodes — both keep their own marker', () => {
    const { getByTestId } = render(
      <NodeMarkerLayer
        nodes={[node({ id: 'a', lat: -7.25, lng: 112.75 }), node({ id: 'b', lat: -7.2501, lng: 112.7501 })]}
        onDrill={jest.fn()}
      />,
    );
    expect(getByTestId('node-marker-a')).toBeTruthy();
    expect(getByTestId('node-marker-b')).toBeTruthy();
  });

  describe('progressive reveal', () => {
    it('draws every node in full when promoted is null (drill and zoom modes)', () => {
      const { getByTestId, queryByTestId } = render(
        <NodeMarkerLayer nodes={[node({ id: 'r1' })]} onDrill={jest.fn()} promoted={null} />,
      );
      expect(getByTestId('node-pin-r1')).toBeTruthy();
      expect(queryByTestId('node-dot-r1')).toBeNull();
    });

    it('demotes a node outside the promoted set to a dot that still drills', () => {
      const onDrill = jest.fn();
      const { getByTestId, queryByTestId } = render(
        <NodeMarkerLayer
          nodes={[node({ id: 'r1' }), node({ id: 'r2', lat: -7.4 })]}
          onDrill={onDrill}
          promoted={new Set(['r1'])}
        />,
      );
      expect(getByTestId('node-pin-r1')).toBeTruthy();
      expect(getByTestId('node-dot-r2')).toBeTruthy();
      expect(queryByTestId('node-pin-r2')).toBeNull();

      fireEvent(getByTestId('node-marker-r2'), 'press');
      expect(onDrill).toHaveBeenCalledTimes(1);
    });
  });

  describe('labels', () => {
    it('hides a tier\'s names via the layer facet while keeping its pins', () => {
      const { getByTestId, queryByText } = render(
        <NodeMarkerLayer
          nodes={[node({ id: 'r1', name: 'Rayon Selatan' })]}
          onDrill={jest.fn()}
          showLabels={{ district: false }}
        />,
      );
      expect(getByTestId('node-pin-r1')).toBeTruthy();
      expect(queryByText('Rayon Selatan')).toBeNull();
    });

    it('gates the name on the label declutter pass, independently of the pin', () => {
      const { getByTestId, queryByText } = render(
        <NodeMarkerLayer
          nodes={[node({ id: 'r1', name: 'Rayon Selatan' })]}
          onDrill={jest.fn()}
          promoted={new Set(['r1'])}
          labelled={new Set()}
        />,
      );
      // Pin survives; only its name was decluttered away.
      expect(getByTestId('node-pin-r1')).toBeTruthy();
      expect(queryByText('Rayon Selatan')).toBeNull();
    });

    it('prints the name when both gates pass', () => {
      const { getByText } = render(
        <NodeMarkerLayer
          nodes={[node({ id: 'r1', name: 'Rayon Selatan' })]}
          onDrill={jest.fn()}
          promoted={new Set(['r1'])}
          labelled={new Set(['r1'])}
        />,
      );
      expect(getByText('Rayon Selatan')).toBeTruthy();
    });
  });
});
