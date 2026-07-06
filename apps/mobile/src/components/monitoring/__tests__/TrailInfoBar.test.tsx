import React from 'react';
import { render } from '@testing-library/react-native';
import { TrailInfoBar } from '../TrailInfoBar';
import type { LocationHistory } from '../../../types/models.types';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Text');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseHistory: LocationHistory = {
  user_id: 'user-1',
  user_name: 'Budi Santoso',
  role: 'satgas',
  date: '2026-03-08',
  shift_id: 'shift-1',
  shift_name: 'Pagi',
  area_id: 'area-1',
  area_name: 'Taman Bungkul',
  clock_in_time: '2026-03-08T07:00:00Z',
  clock_out_time: null,
  points: [],
  total_points: 0,
  total_distance_meters: 500,
  time_inside_area_minutes: 45,
  time_outside_area_minutes: 10,
  generated_at: '2026-03-08T10:00:00Z',
};

// The bar shows three stat columns: Total Jarak / Di Area / Di Luar.
// The worker's name was moved to the trail header in this revision and is
// no longer rendered here.

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TrailInfoBar', () => {
  describe('column labels', () => {
    it('renders all three uppercase stat labels', () => {
      const { getByText } = render(
        <TrailInfoBar history={baseHistory} />,
      );
      expect(getByText('Total Jarak')).toBeTruthy();
      expect(getByText('Di Area')).toBeTruthy();
      expect(getByText('Di Luar')).toBeTruthy();
    });
  });

  describe('distance formatting', () => {
    it('shows meters when distance is below 1000m', () => {
      const history = { ...baseHistory, total_distance_meters: 500 };
      const { getByText } = render(
        <TrailInfoBar history={history} />,
      );
      expect(getByText('500 m')).toBeTruthy();
    });

    it('rounds meters to the nearest integer', () => {
      const history = { ...baseHistory, total_distance_meters: 999.6 };
      const { getByText } = render(
        <TrailInfoBar history={history} />,
      );
      expect(getByText('1000 m')).toBeTruthy();
    });

    it('shows km with one decimal place when distance is exactly 1000m', () => {
      const history = { ...baseHistory, total_distance_meters: 1000 };
      const { getByText } = render(
        <TrailInfoBar history={history} />,
      );
      expect(getByText('1.0 km')).toBeTruthy();
    });

    it('shows km with one decimal place for distances above 1000m', () => {
      const history = { ...baseHistory, total_distance_meters: 1500 };
      const { getByText } = render(
        <TrailInfoBar history={history} />,
      );
      expect(getByText('1.5 km')).toBeTruthy();
    });

    it('shows km correctly for large distances', () => {
      const history = { ...baseHistory, total_distance_meters: 12300 };
      const { getByText } = render(
        <TrailInfoBar history={history} />,
      );
      expect(getByText('12.3 km')).toBeTruthy();
    });
  });

  describe('inside-area time formatting', () => {
    it('shows minutes only when time is less than one hour', () => {
      const history = { ...baseHistory, time_inside_area_minutes: 45 };
      const { getByText } = render(
        <TrailInfoBar history={history} />,
      );
      expect(getByText('45m')).toBeTruthy();
    });

    it('shows zero minutes correctly', () => {
      const history = {
        ...baseHistory,
        time_inside_area_minutes: 0,
        time_outside_area_minutes: 10,
      };
      const { getAllByText } = render(
        <TrailInfoBar history={history} />,
      );
      // The "0m" string could match more than one column; existence is enough.
      expect(getAllByText('0m').length).toBeGreaterThanOrEqual(1);
    });

    it('shows hours and minutes when time is 60 minutes or more', () => {
      const history = { ...baseHistory, time_inside_area_minutes: 90 };
      const { getByText } = render(
        <TrailInfoBar history={history} />,
      );
      expect(getByText('1j 30m')).toBeTruthy();
    });

    it('shows hours and zero minutes for exact hour multiples', () => {
      const history = { ...baseHistory, time_inside_area_minutes: 120 };
      const { getByText } = render(
        <TrailInfoBar history={history} />,
      );
      expect(getByText('2j 0m')).toBeTruthy();
    });
  });

  describe('outside-area time formatting', () => {
    it('shows minutes only when time is less than one hour', () => {
      const history = {
        ...baseHistory,
        time_inside_area_minutes: 30,
        time_outside_area_minutes: 10,
      };
      const { getByText } = render(
        <TrailInfoBar history={history} />,
      );
      expect(getByText('10m')).toBeTruthy();
    });

    it('shows hours and minutes when time is 60 minutes or more', () => {
      const history = { ...baseHistory, time_outside_area_minutes: 75 };
      const { getByText } = render(
        <TrailInfoBar history={history} />,
      );
      expect(getByText('1j 15m')).toBeTruthy();
    });
  });

  describe('all stat columns render together', () => {
    it('renders distance, inside-area time, and outside-area time together', () => {
      const history = {
        ...baseHistory,
        total_distance_meters: 2500,
        time_inside_area_minutes: 90,
        time_outside_area_minutes: 30,
      };
      const { getByText } = render(
        <TrailInfoBar history={history} />,
      );

      expect(getByText('2.5 km')).toBeTruthy();
      expect(getByText('1j 30m')).toBeTruthy();
      expect(getByText('30m')).toBeTruthy();
    });
  });
});
