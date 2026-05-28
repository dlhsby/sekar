/**
 * ProfileStatsRow tests — field vs monitoring tile sets and the "—" fallback.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { ProfileStatsRow } from '../ProfileStatsRow';

describe('ProfileStatsRow', () => {
  describe('field mode', () => {
    it('renders Hadir/Tugas/Jam labels with their values', () => {
      const { getByText } = render(
        <ProfileStatsRow mode="field" stats={{ daysWorked: 22, totalHours: 182, activitiesCount: 48 }} />,
      );
      expect(getByText('Hadir')).toBeTruthy();
      expect(getByText('22')).toBeTruthy();
      expect(getByText('Tugas')).toBeTruthy();
      expect(getByText('48')).toBeTruthy();
      expect(getByText('Jam')).toBeTruthy();
      expect(getByText('182')).toBeTruthy();
    });

    it('renders "—" for zero values', () => {
      const { getAllByText } = render(
        <ProfileStatsRow mode="field" stats={{ daysWorked: 0, totalHours: 0, activitiesCount: 0 }} />,
      );
      expect(getAllByText('—')).toHaveLength(3);
    });
  });

  describe('monitoring mode', () => {
    it('renders Tim/Area/Aktivitas labels with their values', () => {
      const { getByText } = render(
        <ProfileStatsRow
          mode="monitoring"
          stats={{ totalUsersManaged: 12, totalAreasMonitored: 5, activitiesReviewedThisMonth: 30 }}
        />,
      );
      expect(getByText('Tim')).toBeTruthy();
      expect(getByText('12')).toBeTruthy();
      expect(getByText('Area')).toBeTruthy();
      expect(getByText('5')).toBeTruthy();
      expect(getByText('Aktivitas')).toBeTruthy();
      expect(getByText('30')).toBeTruthy();
    });

    it('renders "—" for zero values', () => {
      const { getAllByText } = render(
        <ProfileStatsRow
          mode="monitoring"
          stats={{ totalUsersManaged: 0, totalAreasMonitored: 0, activitiesReviewedThisMonth: 0 }}
        />,
      );
      expect(getAllByText('—')).toHaveLength(3);
    });
  });
});
