/**
 * AbsensiScreen Tests — tabbed clock in/out + overtime.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('../../field/ClockInOutScreen', () => {
  const { View, Text } = require('react-native');
  return { ClockInOutScreen: () => <View><Text>CLOCK_BODY</Text></View> };
});
jest.mock('../../overtime/OvertimeListScreen', () => {
  const { View, Text } = require('react-native');
  return { OvertimeListScreen: () => <View><Text>LEMBUR_BODY</Text></View> };
});

import { AbsensiScreen } from '../AbsensiScreen';

const renderScreen = (initialTab?: 'absensi' | 'lembur') =>
  render(
    <AbsensiScreen
      navigation={{ navigate: jest.fn(), goBack: jest.fn() } as any}
      route={{ params: initialTab ? { initialTab } : undefined } as any}
    />,
  );

describe('AbsensiScreen', () => {
  it('defaults to the Absensi (clock) tab', () => {
    const { getByText, queryByText } = renderScreen();
    expect(getByText('CLOCK_BODY')).toBeTruthy();
    expect(queryByText('LEMBUR_BODY')).toBeNull();
  });

  it('honors initialTab=lembur', () => {
    const { getByText, queryByText } = renderScreen('lembur');
    expect(getByText('LEMBUR_BODY')).toBeTruthy();
    expect(queryByText('CLOCK_BODY')).toBeNull();
  });

  it('switches to Lembur when the tab is tapped', () => {
    const { getByText, queryByText } = renderScreen();
    fireEvent.press(getByText('Lembur'));
    expect(getByText('LEMBUR_BODY')).toBeTruthy();
    expect(queryByText('CLOCK_BODY')).toBeNull();
  });
});
