/**
 * MonitoringToggleSheet Component Tests
 * Phase 3 sub-phase 3-5: Layer toggle rows emit correct layer key on press.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MonitoringToggleSheet } from '../MonitoringToggleSheet';
import type { MonitoringV2VisibleLayers } from '../../../store/slices/monitoringV2Slice';

// Mock NBModal to render children inline so we can test the toggle rows directly
jest.mock('../../nb/NBModal', () => {
  const React = require('react');
  const { View, TouchableOpacity, Text } = require('react-native');
  return {
    NBModal: ({ children, visible, onClose, title }: any) => {
      if (!visible) { return null; }
      return React.createElement(
        View,
        { testID: 'modal' },
        title ? React.createElement(
          View,
          { key: 'title-bar' },
          React.createElement(Text, {}, title.toUpperCase()),
          React.createElement(
            TouchableOpacity,
            { onPress: onClose, accessibilityLabel: 'Tutup', key: 'close-btn' },
            React.createElement(Text, {}, '✕'),
          ),
        ) : null,
        children,
      );
    },
  };
});

// Mock vector icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, { testID: 'icon' }, props.name);
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const allLayersOn: MonitoringV2VisibleLayers = {
  workers: true,
  plants: true,
  overdue: true,
  rayons: true,
  areas: true,
};

const allLayersOff: MonitoringV2VisibleLayers = {
  workers: false,
  plants: false,
  overdue: false,
  rayons: false,
  areas: false,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MonitoringToggleSheet', () => {
  const onToggleLayer = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('visibility', () => {
    it('renders nothing when visible is false', () => {
      const { queryByTestId } = render(
        <MonitoringToggleSheet
          visible={false}
          visibleLayers={allLayersOn}
          onToggleLayer={onToggleLayer}
          onClose={onClose}
        />,
      );
      expect(queryByTestId('modal')).toBeNull();
    });

    it('renders when visible is true', () => {
      const { getByTestId } = render(
        <MonitoringToggleSheet
          visible
          visibleLayers={allLayersOn}
          onToggleLayer={onToggleLayer}
          onClose={onClose}
        />,
      );
      expect(getByTestId('modal')).toBeTruthy();
    });
  });

  describe('layer rows', () => {
    it('renders all 5 layer toggle rows', () => {
      const { getByText } = render(
        <MonitoringToggleSheet
          visible
          visibleLayers={allLayersOn}
          onToggleLayer={onToggleLayer}
          onClose={onClose}
        />,
      );
      expect(getByText('Petugas')).toBeTruthy();
      expect(getByText('Tanaman')).toBeTruthy();
      expect(getByText('Jatuh Tempo')).toBeTruthy();
      expect(getByText('Batas Rayon')).toBeTruthy();
      expect(getByText('Batas Area')).toBeTruthy();
    });

    it('calls onToggleLayer with "workers" when workers switch is toggled', () => {
      const { getAllByRole } = render(
        <MonitoringToggleSheet
          visible
          visibleLayers={allLayersOn}
          onToggleLayer={onToggleLayer}
          onClose={onClose}
        />,
      );
      const switches = getAllByRole('switch');
      // workers is first row
      fireEvent(switches[0], 'valueChange', false);
      expect(onToggleLayer).toHaveBeenCalledWith('workers');
    });

    it('calls onToggleLayer with "plants" when plants switch is toggled', () => {
      const { getAllByRole } = render(
        <MonitoringToggleSheet
          visible
          visibleLayers={allLayersOn}
          onToggleLayer={onToggleLayer}
          onClose={onClose}
        />,
      );
      const switches = getAllByRole('switch');
      fireEvent(switches[1], 'valueChange', false);
      expect(onToggleLayer).toHaveBeenCalledWith('plants');
    });

    it('calls onToggleLayer with "overdue" when overdue switch is toggled', () => {
      const { getAllByRole } = render(
        <MonitoringToggleSheet
          visible
          visibleLayers={allLayersOn}
          onToggleLayer={onToggleLayer}
          onClose={onClose}
        />,
      );
      const switches = getAllByRole('switch');
      fireEvent(switches[2], 'valueChange', false);
      expect(onToggleLayer).toHaveBeenCalledWith('overdue');
    });

    it('calls onToggleLayer with "rayons" when rayons switch is toggled', () => {
      const { getAllByRole } = render(
        <MonitoringToggleSheet
          visible
          visibleLayers={allLayersOn}
          onToggleLayer={onToggleLayer}
          onClose={onClose}
        />,
      );
      const switches = getAllByRole('switch');
      fireEvent(switches[3], 'valueChange', false);
      expect(onToggleLayer).toHaveBeenCalledWith('rayons');
    });

    it('calls onToggleLayer with "areas" when areas switch is toggled', () => {
      const { getAllByRole } = render(
        <MonitoringToggleSheet
          visible
          visibleLayers={allLayersOn}
          onToggleLayer={onToggleLayer}
          onClose={onClose}
        />,
      );
      const switches = getAllByRole('switch');
      fireEvent(switches[4], 'valueChange', false);
      expect(onToggleLayer).toHaveBeenCalledWith('areas');
    });

    it('reflects visibleLayers values in switch state', () => {
      const { getAllByRole } = render(
        <MonitoringToggleSheet
          visible
          visibleLayers={allLayersOff}
          onToggleLayer={onToggleLayer}
          onClose={onClose}
        />,
      );
      const switches = getAllByRole('switch');
      switches.forEach(sw => {
        expect(sw.props.value).toBe(false);
      });
    });
  });

  describe('close handler', () => {
    it('calls onClose when modal title close button is pressed', () => {
      const { getByLabelText } = render(
        <MonitoringToggleSheet
          visible
          visibleLayers={allLayersOn}
          onToggleLayer={onToggleLayer}
          onClose={onClose}
        />,
      );
      const closeBtn = getByLabelText('Tutup');
      fireEvent.press(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
