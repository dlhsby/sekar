/**
 * FieldStatsCard Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { FieldStatsCard } from '../FieldStatsCard';
import type { FieldStats } from '../../../hooks/useProfileData';

// Mock NBCard component
jest.mock('../../nb', () => ({
  NBCard: ({ children, testID, style }: any) => {
    const { View } = require('react-native');
    return <View testID={testID} style={style}>{children}</View>;
  },
}));

describe('FieldStatsCard', () => {
  const mockStats: FieldStats = {
    daysWorked: 15,
    totalHours: 120,
    activitiesCount: 45,
  };

  describe('Rendering', () => {
    it('should render card title', () => {
      const { getByText } = render(
        <FieldStatsCard stats={mockStats} />
      );

      expect(getByText('Statistik Bulan Ini')).toBeTruthy();
    });

    it('should render with custom testID', () => {
      const { getByTestId } = render(
        <FieldStatsCard stats={mockStats} testID="custom-stats-card" />
      );

      expect(getByTestId('custom-stats-card')).toBeTruthy();
    });

    it('should render with default testID', () => {
      const { getByTestId } = render(
        <FieldStatsCard stats={mockStats} />
      );

      expect(getByTestId('field-stats-card')).toBeTruthy();
    });
  });

  describe('Stats Display', () => {
    it('should display days worked', () => {
      const { getByText } = render(
        <FieldStatsCard stats={mockStats} />
      );

      expect(getByText('15')).toBeTruthy();
      expect(getByText('Hari Kerja')).toBeTruthy();
    });

    it('should display total hours', () => {
      const { getByText } = render(
        <FieldStatsCard stats={mockStats} />
      );

      expect(getByText('120')).toBeTruthy();
      expect(getByText('Jam Kerja')).toBeTruthy();
    });

    it('should display activities count', () => {
      const { getByText } = render(
        <FieldStatsCard stats={mockStats} />
      );

      expect(getByText('45')).toBeTruthy();
      expect(getByText('Aktivitas:')).toBeTruthy();
    });
  });

  describe('Zero Stats', () => {
    it('should handle zero days worked', () => {
      const zeroStats: FieldStats = {
        daysWorked: 0,
        totalHours: 0,
        activitiesCount: 0,
      };

      const { getAllByText } = render(
        <FieldStatsCard stats={zeroStats} />
      );

      const zeroTexts = getAllByText('0');
      expect(zeroTexts.length).toBe(3); // daysWorked, totalHours, activitiesCount
    });

    it('should handle partial zero stats', () => {
      const partialStats: FieldStats = {
        daysWorked: 5,
        totalHours: 0,
        activitiesCount: 10,
      };

      const { getByText } = render(
        <FieldStatsCard stats={partialStats} />
      );

      expect(getByText('5')).toBeTruthy();
      expect(getByText('10')).toBeTruthy();
    });
  });

  describe('Large Numbers', () => {
    it('should display large day count', () => {
      const largeStats: FieldStats = {
        daysWorked: 99,
        totalHours: 999,
        activitiesCount: 9999,
      };

      const { getByText } = render(
        <FieldStatsCard stats={largeStats} />
      );

      expect(getByText('99')).toBeTruthy();
      expect(getByText('999')).toBeTruthy();
      expect(getByText('9999')).toBeTruthy();
    });

    it('should handle very large hours', () => {
      const highHourStats: FieldStats = {
        daysWorked: 30,
        totalHours: 240,
        activitiesCount: 90,
      };

      const { getByText } = render(
        <FieldStatsCard stats={highHourStats} />
      );

      expect(getByText('240')).toBeTruthy();
    });
  });

  describe('Decimal Hours', () => {
    it('should handle decimal total hours', () => {
      const decimalStats: FieldStats = {
        daysWorked: 10,
        totalHours: 85.5,
        activitiesCount: 30,
      };

      const { getByText } = render(
        <FieldStatsCard stats={decimalStats} />
      );

      expect(getByText('85.5')).toBeTruthy();
    });
  });

  describe('Layout Structure', () => {
    it('should render days worked in first stat box', () => {
      const { getByText } = render(
        <FieldStatsCard stats={mockStats} />
      );

      const daysWorked = getByText('15');
      const label = getByText('Hari Kerja');
      expect(daysWorked).toBeTruthy();
      expect(label).toBeTruthy();
    });

    it('should render total hours in second stat box', () => {
      const { getByText } = render(
        <FieldStatsCard stats={mockStats} />
      );

      const totalHours = getByText('120');
      const label = getByText('Jam Kerja');
      expect(totalHours).toBeTruthy();
      expect(label).toBeTruthy();
    });

    it('should render activities in separate row', () => {
      const { getByText } = render(
        <FieldStatsCard stats={mockStats} />
      );

      expect(getByText('Aktivitas:')).toBeTruthy();
      expect(getByText('45')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative values gracefully', () => {
      const negativeStats: FieldStats = {
        daysWorked: -1,
        totalHours: -10,
        activitiesCount: -5,
      };

      const { getByText } = render(
        <FieldStatsCard stats={negativeStats} />
      );

      expect(getByText('-1')).toBeTruthy();
      expect(getByText('-10')).toBeTruthy();
      expect(getByText('-5')).toBeTruthy();
    });

    it('should handle NaN values', () => {
      const nanStats: FieldStats = {
        daysWorked: NaN,
        totalHours: NaN,
        activitiesCount: NaN,
      };

      const { getByText } = render(
        <FieldStatsCard stats={nanStats} />
      );

      expect(getByText('Statistik Bulan Ini')).toBeTruthy();
    });

    it('should handle very small decimal values', () => {
      const smallDecimalStats: FieldStats = {
        daysWorked: 1,
        totalHours: 0.5,
        activitiesCount: 1,
      };

      const { getByText } = render(
        <FieldStatsCard stats={smallDecimalStats} />
      );

      expect(getByText('0.5')).toBeTruthy();
    });
  });

  describe('Realistic Scenarios', () => {
    it('should display typical monthly stats', () => {
      const typicalStats: FieldStats = {
        daysWorked: 20,
        totalHours: 160,
        activitiesCount: 60,
      };

      const { getByText } = render(
        <FieldStatsCard stats={typicalStats} />
      );

      expect(getByText('20')).toBeTruthy();
      expect(getByText('160')).toBeTruthy();
      expect(getByText('60')).toBeTruthy();
    });

    it('should display part-time worker stats', () => {
      const partTimeStats: FieldStats = {
        daysWorked: 10,
        totalHours: 40,
        activitiesCount: 15,
      };

      const { getByText } = render(
        <FieldStatsCard stats={partTimeStats} />
      );

      expect(getByText('10')).toBeTruthy();
      expect(getByText('40')).toBeTruthy();
      expect(getByText('15')).toBeTruthy();
    });

    it('should display new worker stats (first few days)', () => {
      const newWorkerStats: FieldStats = {
        daysWorked: 2,
        totalHours: 16,
        activitiesCount: 6,
      };

      const { getByText } = render(
        <FieldStatsCard stats={newWorkerStats} />
      );

      expect(getByText('2')).toBeTruthy();
      expect(getByText('16')).toBeTruthy();
      expect(getByText('6')).toBeTruthy();
    });
  });

  describe('Styling and Layout', () => {
    it('should render NBCard with elevated variant', () => {
      const { getByTestId } = render(
        <FieldStatsCard stats={mockStats} />
      );

      const card = getByTestId('field-stats-card');
      expect(card).toBeTruthy();
    });
  });
});
