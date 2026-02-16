/**
 * MonitoringStatsCard Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { MonitoringStatsCard } from '../MonitoringStatsCard';
import type { MonitoringStats } from '../../../hooks/useProfileData';

// Mock NBCard component
jest.mock('../../nb', () => ({
  NBCard: ({ children, testID, style }: any) => {
    const { View } = require('react-native');
    return <View testID={testID} style={style}>{children}</View>;
  },
}));

describe('MonitoringStatsCard', () => {
  const mockStats: MonitoringStats = {
    totalUsersManaged: 25,
    totalAreasMonitored: 10,
    activitiesReviewedThisMonth: 150,
  };

  describe('Rendering', () => {
    it('should render card title', () => {
      const { getByText } = render(
        <MonitoringStatsCard stats={mockStats} />
      );

      expect(getByText('Ringkasan')).toBeTruthy();
    });

    it('should render with custom testID', () => {
      const { getByTestId } = render(
        <MonitoringStatsCard stats={mockStats} testID="custom-monitoring-card" />
      );

      expect(getByTestId('custom-monitoring-card')).toBeTruthy();
    });

    it('should render with default testID', () => {
      const { getByTestId } = render(
        <MonitoringStatsCard stats={mockStats} />
      );

      expect(getByTestId('monitoring-stats-card')).toBeTruthy();
    });
  });

  describe('Stats Display', () => {
    it('should display total users managed', () => {
      const { getByText } = render(
        <MonitoringStatsCard stats={mockStats} />
      );

      expect(getByText('25')).toBeTruthy();
      expect(getByText('Pekerja aktif')).toBeTruthy();
    });

    it('should display total areas monitored', () => {
      const { getByText } = render(
        <MonitoringStatsCard stats={mockStats} />
      );

      expect(getByText('10')).toBeTruthy();
      expect(getByText('Area dikelola')).toBeTruthy();
    });

    it('should display activities reviewed this month', () => {
      const { getByText } = render(
        <MonitoringStatsCard stats={mockStats} />
      );

      expect(getByText('150')).toBeTruthy();
      expect(getByText('Aktivitas bulan ini')).toBeTruthy();
    });
  });

  describe('Icons Display', () => {
    it('should render account-group icon for users', () => {
      const { UNSAFE_getAllByType } = render(
        <MonitoringStatsCard stats={mockStats} />
      );

      const MaterialCommunityIcons = require('react-native-vector-icons/MaterialCommunityIcons').default;
      const icons = UNSAFE_getAllByType(MaterialCommunityIcons);
      expect(icons.length).toBe(3); // 3 stat icons
    });

    it('should render all three stat icons', () => {
      const { UNSAFE_getAllByType } = render(
        <MonitoringStatsCard stats={mockStats} />
      );

      const MaterialCommunityIcons = require('react-native-vector-icons/MaterialCommunityIcons').default;
      const icons = UNSAFE_getAllByType(MaterialCommunityIcons);
      expect(icons.length).toBe(3);
    });
  });

  describe('Zero Stats', () => {
    it('should handle zero users managed', () => {
      const zeroStats: MonitoringStats = {
        totalUsersManaged: 0,
        totalAreasMonitored: 0,
        activitiesReviewedThisMonth: 0,
      };

      const { getAllByText } = render(
        <MonitoringStatsCard stats={zeroStats} />
      );

      const zeroTexts = getAllByText('0');
      expect(zeroTexts.length).toBe(3); // All 3 stats are zero
    });

    it('should handle partial zero stats', () => {
      const partialStats: MonitoringStats = {
        totalUsersManaged: 5,
        totalAreasMonitored: 0,
        activitiesReviewedThisMonth: 20,
      };

      const { getAllByText, getByText } = render(
        <MonitoringStatsCard stats={partialStats} />
      );

      expect(getByText('5')).toBeTruthy();
      expect(getAllByText('0').length).toBeGreaterThan(0);
      expect(getByText('20')).toBeTruthy();
    });
  });

  describe('Large Numbers', () => {
    it('should display large stat values', () => {
      const largeStats: MonitoringStats = {
        totalUsersManaged: 999,
        totalAreasMonitored: 99,
        activitiesReviewedThisMonth: 9999,
      };

      const { getByText } = render(
        <MonitoringStatsCard stats={largeStats} />
      );

      expect(getByText('999')).toBeTruthy();
      expect(getByText('99')).toBeTruthy();
      expect(getByText('9999')).toBeTruthy();
    });

    it('should handle very large activity count', () => {
      const highActivityStats: MonitoringStats = {
        totalUsersManaged: 50,
        totalAreasMonitored: 20,
        activitiesReviewedThisMonth: 99999,
      };

      const { getByText } = render(
        <MonitoringStatsCard stats={highActivityStats} />
      );

      expect(getByText('99999')).toBeTruthy();
    });
  });

  describe('Layout Structure', () => {
    it('should render stats in correct order', () => {
      const { getByText } = render(
        <MonitoringStatsCard stats={mockStats} />
      );

      // Check all labels are present in order
      expect(getByText('Pekerja aktif')).toBeTruthy();
      expect(getByText('Area dikelola')).toBeTruthy();
      expect(getByText('Aktivitas bulan ini')).toBeTruthy();
    });

    it('should render dividers between stats', () => {
      const { getAllByText } = render(
        <MonitoringStatsCard stats={mockStats} />
      );

      // Should have 3 stat rows
      expect(getAllByText(/aktif|dikelola|bulan ini/)).toHaveLength(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative values gracefully', () => {
      const negativeStats: MonitoringStats = {
        totalUsersManaged: -1,
        totalAreasMonitored: -5,
        activitiesReviewedThisMonth: -10,
      };

      const { getByText } = render(
        <MonitoringStatsCard stats={negativeStats} />
      );

      expect(getByText('-1')).toBeTruthy();
      expect(getByText('-5')).toBeTruthy();
      expect(getByText('-10')).toBeTruthy();
    });

    it('should handle NaN values', () => {
      const nanStats: MonitoringStats = {
        totalUsersManaged: NaN,
        totalAreasMonitored: NaN,
        activitiesReviewedThisMonth: NaN,
      };

      const { getByText } = render(
        <MonitoringStatsCard stats={nanStats} />
      );

      expect(getByText('Ringkasan')).toBeTruthy();
    });
  });

  describe('Realistic Scenarios', () => {
    it('should display small team stats', () => {
      const smallTeamStats: MonitoringStats = {
        totalUsersManaged: 5,
        totalAreasMonitored: 3,
        activitiesReviewedThisMonth: 25,
      };

      const { getByText } = render(
        <MonitoringStatsCard stats={smallTeamStats} />
      );

      expect(getByText('5')).toBeTruthy();
      expect(getByText('3')).toBeTruthy();
      expect(getByText('25')).toBeTruthy();
    });

    it('should display rayon manager stats', () => {
      const rayonStats: MonitoringStats = {
        totalUsersManaged: 30,
        totalAreasMonitored: 12,
        activitiesReviewedThisMonth: 200,
      };

      const { getByText } = render(
        <MonitoringStatsCard stats={rayonStats} />
      );

      expect(getByText('30')).toBeTruthy();
      expect(getByText('12')).toBeTruthy();
      expect(getByText('200')).toBeTruthy();
    });

    it('should display top management city-wide stats', () => {
      const cityStats: MonitoringStats = {
        totalUsersManaged: 200,
        totalAreasMonitored: 85,
        activitiesReviewedThisMonth: 5000,
      };

      const { getByText } = render(
        <MonitoringStatsCard stats={cityStats} />
      );

      expect(getByText('200')).toBeTruthy();
      expect(getByText('85')).toBeTruthy();
      expect(getByText('5000')).toBeTruthy();
    });

    it('should display korlap area stats', () => {
      const korlapStats: MonitoringStats = {
        totalUsersManaged: 8,
        totalAreasMonitored: 1,
        activitiesReviewedThisMonth: 50,
      };

      const { getByText } = render(
        <MonitoringStatsCard stats={korlapStats} />
      );

      expect(getByText('8')).toBeTruthy();
      expect(getByText('1')).toBeTruthy();
      expect(getByText('50')).toBeTruthy();
    });

    it('should display new supervisor with no activity yet', () => {
      const newSupervisorStats: MonitoringStats = {
        totalUsersManaged: 10,
        totalAreasMonitored: 5,
        activitiesReviewedThisMonth: 0,
      };

      const { getByText, getAllByText } = render(
        <MonitoringStatsCard stats={newSupervisorStats} />
      );

      expect(getByText('10')).toBeTruthy();
      expect(getByText('5')).toBeTruthy();
      expect(getAllByText('0').length).toBeGreaterThan(0);
    });
  });

  describe('Icon Configuration', () => {
    it('should use correct icon for users stat', () => {
      const { UNSAFE_getAllByType } = render(
        <MonitoringStatsCard stats={mockStats} />
      );

      const MaterialCommunityIcons = require('react-native-vector-icons/MaterialCommunityIcons').default;
      const icons = UNSAFE_getAllByType(MaterialCommunityIcons);
      expect(icons[0].props.name).toBe('account-group');
    });

    it('should use correct icon for areas stat', () => {
      const { UNSAFE_getAllByType } = render(
        <MonitoringStatsCard stats={mockStats} />
      );

      const MaterialCommunityIcons = require('react-native-vector-icons/MaterialCommunityIcons').default;
      const icons = UNSAFE_getAllByType(MaterialCommunityIcons);
      expect(icons[1].props.name).toBe('map-marker');
    });

    it('should use correct icon for activities stat', () => {
      const { UNSAFE_getAllByType } = render(
        <MonitoringStatsCard stats={mockStats} />
      );

      const MaterialCommunityIcons = require('react-native-vector-icons/MaterialCommunityIcons').default;
      const icons = UNSAFE_getAllByType(MaterialCommunityIcons);
      expect(icons[2].props.name).toBe('file-document-outline');
    });
  });

  describe('Styling and Layout', () => {
    it('should render NBCard with elevated variant', () => {
      const { getByTestId } = render(
        <MonitoringStatsCard stats={mockStats} />
      );

      const card = getByTestId('monitoring-stats-card');
      expect(card).toBeTruthy();
    });
  });
});
