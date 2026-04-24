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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TrailInfoBar', () => {
  describe('user name display', () => {
    it('displays the user name from history', () => {
      const { getByText } = render(
        <TrailInfoBar history={baseHistory} date="2026-03-08" />,
      );
      expect(getByText('Budi Santoso')).toBeTruthy();
    });

    it('displays a different user name when provided', () => {
      const history: LocationHistory = { ...baseHistory, user_name: 'Siti Rahayu' };
      const { getByText } = render(
        <TrailInfoBar history={history} date="2026-03-08" />,
      );
      expect(getByText('Siti Rahayu')).toBeTruthy();
    });
  });

  describe('distance formatting', () => {
    it('shows meters when distance is below 1000m', () => {
      const history: LocationHistory = { ...baseHistory, total_distance_meters: 500 };
      const { getByText } = render(
        <TrailInfoBar history={history} date="2026-03-08" />,
      );
      expect(getByText('500m')).toBeTruthy();
    });

    it('rounds meters to the nearest integer', () => {
      const history: LocationHistory = { ...baseHistory, total_distance_meters: 999.6 };
      const { getByText } = render(
        <TrailInfoBar history={history} date="2026-03-08" />,
      );
      expect(getByText('1000m')).toBeTruthy();
    });

    it('shows km with one decimal place when distance is exactly 1000m', () => {
      const history: LocationHistory = { ...baseHistory, total_distance_meters: 1000 };
      const { getByText } = render(
        <TrailInfoBar history={history} date="2026-03-08" />,
      );
      expect(getByText('1.0km')).toBeTruthy();
    });

    it('shows km with one decimal place for distances above 1000m', () => {
      const history: LocationHistory = { ...baseHistory, total_distance_meters: 1500 };
      const { getByText } = render(
        <TrailInfoBar history={history} date="2026-03-08" />,
      );
      expect(getByText('1.5km')).toBeTruthy();
    });

    it('shows km correctly for large distances', () => {
      const history: LocationHistory = { ...baseHistory, total_distance_meters: 12300 };
      const { getByText } = render(
        <TrailInfoBar history={history} date="2026-03-08" />,
      );
      expect(getByText('12.3km')).toBeTruthy();
    });
  });

  describe('inside-area time formatting', () => {
    it('shows minutes only when time is less than one hour', () => {
      const history: LocationHistory = { ...baseHistory, time_inside_area_minutes: 45 };
      const { getByText } = render(
        <TrailInfoBar history={history} date="2026-03-08" />,
      );
      expect(getByText('Di area: 45m')).toBeTruthy();
    });

    it('shows zero minutes correctly', () => {
      const history: LocationHistory = { ...baseHistory, time_inside_area_minutes: 0 };
      const { getByText } = render(
        <TrailInfoBar history={history} date="2026-03-08" />,
      );
      expect(getByText('Di area: 0m')).toBeTruthy();
    });

    it('shows hours and minutes when time is 60 minutes or more', () => {
      const history: LocationHistory = { ...baseHistory, time_inside_area_minutes: 90 };
      const { getByText } = render(
        <TrailInfoBar history={history} date="2026-03-08" />,
      );
      expect(getByText('Di area: 1j 30m')).toBeTruthy();
    });

    it('shows hours and zero minutes for exact hour multiples', () => {
      const history: LocationHistory = { ...baseHistory, time_inside_area_minutes: 120 };
      const { getByText } = render(
        <TrailInfoBar history={history} date="2026-03-08" />,
      );
      expect(getByText('Di area: 2j 0m')).toBeTruthy();
    });
  });

  describe('outside-area time formatting', () => {
    it('shows minutes only when time is less than one hour', () => {
      const history: LocationHistory = { ...baseHistory, time_outside_area_minutes: 10 };
      const { getByText } = render(
        <TrailInfoBar history={history} date="2026-03-08" />,
      );
      expect(getByText('Di luar: 10m')).toBeTruthy();
    });

    it('shows hours and minutes when time is 60 minutes or more', () => {
      const history: LocationHistory = { ...baseHistory, time_outside_area_minutes: 75 };
      const { getByText } = render(
        <TrailInfoBar history={history} date="2026-03-08" />,
      );
      expect(getByText('Di luar: 1j 15m')).toBeTruthy();
    });

    it('shows zero minutes correctly', () => {
      const history: LocationHistory = { ...baseHistory, time_outside_area_minutes: 0 };
      const { getByText } = render(
        <TrailInfoBar history={history} date="2026-03-08" />,
      );
      expect(getByText('Di luar: 0m')).toBeTruthy();
    });
  });

  describe('all four info items are present', () => {
    it('renders name, distance, inside-area time, and outside-area time together', () => {
      const history: LocationHistory = {
        ...baseHistory,
        user_name: 'Agus Purnomo',
        total_distance_meters: 2500,
        time_inside_area_minutes: 90,
        time_outside_area_minutes: 30,
      };
      const { getByText } = render(
        <TrailInfoBar history={history} date="2026-03-08" />,
      );

      expect(getByText('Agus Purnomo')).toBeTruthy();
      expect(getByText('2.5km')).toBeTruthy();
      expect(getByText('Di area: 1j 30m')).toBeTruthy();
      expect(getByText('Di luar: 30m')).toBeTruthy();
    });
  });
});
