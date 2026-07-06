/**
 * BarChart Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { BarChart } from '../BarChart';
import { nbColors } from '../../../constants/nbTokens';

describe('BarChart', () => {
  it('should render with data', () => {
    const { getByText } = render(
      <BarChart
        data={[20, 30, 40, 25, 35, 45, 50]}
        label="Test Chart"
      />,
    );
    expect(getByText('Test Chart')).toBeTruthy();
  });

  it('should render empty state when all data is zero', () => {
    const { getByText } = render(
      <BarChart
        data={[0, 0, 0, 0, 0, 0, 0]}
        label="Empty Chart"
      />,
    );
    expect(getByText('Tidak ada data')).toBeTruthy();
  });

  it('should pad data to 7 days if shorter', () => {
    const { queryByText } = render(
      <BarChart data={[10, 20]} label="Short data" />,
    );
    expect(queryByText('Short data')).toBeTruthy();
  });

  it('should truncate data to 7 days if longer', () => {
    const { queryByText } = render(
      <BarChart
        data={[10, 20, 30, 40, 50, 60, 70, 80, 90]}
        label="Long data"
      />,
    );
    expect(queryByText('Long data')).toBeTruthy();
  });

  it('should use custom max value', () => {
    const { queryByText } = render(
      <BarChart
        data={[10, 20, 30]}
        label="Custom max"
        maxValue={100}
      />,
    );
    expect(queryByText('Custom max')).toBeTruthy();
  });

  it('should use custom bar color', () => {
    const { queryByText } = render(
      <BarChart
        data={[20, 30, 40]}
        label="Color test"
        barColor={nbColors.success}
      />,
    );
    expect(queryByText('Color test')).toBeTruthy();
  });

  it('should render with custom height', () => {
    const { queryByText } = render(
      <BarChart data={[10, 20, 30]} label="Height test" height={250} />,
    );
    expect(queryByText('Height test')).toBeTruthy();
  });

  it('should hide labels when showLabels is false', () => {
    const { queryByText } = render(
      <BarChart
        data={[10, 20, 30]}
        label="No labels test"
        showLabels={false}
      />,
    );
    expect(queryByText('No labels test')).toBeTruthy();
  });
});
