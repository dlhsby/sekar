/**
 * AttendanceCard Component Tests
 * Unit tests for worker attendance status card
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import AttendanceCard from '../AttendanceCard';

describe('AttendanceCard', () => {
  const defaultClockedInProps = {
    workerName: 'John Doe',
    status: 'clocked_in' as const,
    clockInTime: '2026-01-19T08:30:00Z',
    hoursWorked: 4.5,
    isLate: false,
    areaName: 'Taman Bungkul',
  };

  const defaultNotClockedInProps = {
    workerName: 'Jane Smith',
    status: 'not_clocked_in' as const,
    areaName: 'Taman Harmoni',
  };

  describe('rendering', () => {
    it('should render worker name', () => {
      render(<AttendanceCard {...defaultClockedInProps} />);

      expect(screen.getByText('John Doe')).toBeTruthy();
    });

    it('should render worker initials from two-word name', () => {
      render(<AttendanceCard {...defaultClockedInProps} />);

      expect(screen.getByText('JD')).toBeTruthy();
    });

    it('should render initials from single-word name', () => {
      render(
        <AttendanceCard
          workerName="Budi"
          status="clocked_in"
          clockInTime="2026-01-19T08:30:00Z"
        />
      );

      expect(screen.getByText('BU')).toBeTruthy();
    });

    it('should render initials from multi-word name using first and last', () => {
      render(
        <AttendanceCard
          workerName="Ahmad Budi Santoso"
          status="clocked_in"
          clockInTime="2026-01-19T08:30:00Z"
        />
      );

      expect(screen.getByText('AS')).toBeTruthy();
    });
  });

  describe('clocked_in status', () => {
    it('should render clock in time formatted as HH:MM', () => {
      // Create a date that will be formatted in local timezone
      const clockInDate = new Date('2026-01-19T08:30:00Z');
      const expectedHours = String(clockInDate.getHours()).padStart(2, '0');
      const expectedMinutes = String(clockInDate.getMinutes()).padStart(2, '0');
      const expectedTime = `${expectedHours}:${expectedMinutes}`;

      render(<AttendanceCard {...defaultClockedInProps} />);

      expect(screen.getByText(`Masuk: ${expectedTime}`)).toBeTruthy();
    });

    it('should render duration with hours and minutes', () => {
      render(<AttendanceCard {...defaultClockedInProps} />);

      expect(screen.getByText('Durasi: 4 jam 30 menit')).toBeTruthy();
    });

    it('should render duration with only hours when minutes are 0', () => {
      render(
        <AttendanceCard
          workerName="John Doe"
          status="clocked_in"
          clockInTime="2026-01-19T08:00:00Z"
          hoursWorked={3}
        />
      );

      expect(screen.getByText('Durasi: 3 jam')).toBeTruthy();
    });

    it('should render area name', () => {
      render(<AttendanceCard {...defaultClockedInProps} />);

      expect(screen.getByText('Taman Bungkul')).toBeTruthy();
    });

    it('should render checkmark status indicator', () => {
      render(<AttendanceCard {...defaultClockedInProps} />);

      expect(screen.getByText('✓')).toBeTruthy();
    });

    it('should not render absent text', () => {
      render(<AttendanceCard {...defaultClockedInProps} />);

      expect(screen.queryByText('Belum absen hari ini')).toBeNull();
    });
  });

  describe('not_clocked_in status', () => {
    it('should render absent text', () => {
      render(<AttendanceCard {...defaultNotClockedInProps} />);

      expect(screen.getByText('Belum absen hari ini')).toBeTruthy();
    });

    it('should render X status indicator', () => {
      render(<AttendanceCard {...defaultNotClockedInProps} />);

      expect(screen.getByText('✕')).toBeTruthy();
    });

    it('should render area name with prefix', () => {
      render(<AttendanceCard {...defaultNotClockedInProps} />);

      expect(screen.getByText('Area: Taman Harmoni')).toBeTruthy();
    });

    it('should not render clock in time', () => {
      render(<AttendanceCard {...defaultNotClockedInProps} />);

      expect(screen.queryByText(/Masuk:/)).toBeNull();
    });

    it('should not render duration', () => {
      render(<AttendanceCard {...defaultNotClockedInProps} />);

      expect(screen.queryByText(/Durasi:/)).toBeNull();
    });
  });

  describe('late status', () => {
    it('should render late badge when isLate is true and clocked in', () => {
      render(
        <AttendanceCard
          {...defaultClockedInProps}
          isLate={true}
        />
      );

      expect(screen.getByText('Terlambat')).toBeTruthy();
    });

    it('should not render late badge when isLate is false', () => {
      render(<AttendanceCard {...defaultClockedInProps} isLate={false} />);

      expect(screen.queryByText('Terlambat')).toBeNull();
    });

    it('should not render late badge when isLate is not provided (default false)', () => {
      render(
        <AttendanceCard
          workerName="John Doe"
          status="clocked_in"
          clockInTime="2026-01-19T08:30:00Z"
        />
      );

      expect(screen.queryByText('Terlambat')).toBeNull();
    });
  });

  describe('optional props', () => {
    it('should render without clockInTime', () => {
      render(
        <AttendanceCard
          workerName="John Doe"
          status="clocked_in"
        />
      );

      expect(screen.getByText('John Doe')).toBeTruthy();
      expect(screen.queryByText(/Masuk:/)).toBeNull();
    });

    it('should render without hoursWorked', () => {
      render(
        <AttendanceCard
          workerName="John Doe"
          status="clocked_in"
          clockInTime="2026-01-19T08:30:00Z"
        />
      );

      expect(screen.queryByText(/Durasi:/)).toBeNull();
    });

    it('should render without areaName', () => {
      render(
        <AttendanceCard
          workerName="John Doe"
          status="clocked_in"
          clockInTime="2026-01-19T08:30:00Z"
          hoursWorked={2}
        />
      );

      expect(screen.queryByText('Area:')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle zero hours worked', () => {
      render(
        <AttendanceCard
          workerName="John Doe"
          status="clocked_in"
          clockInTime="2026-01-19T08:30:00Z"
          hoursWorked={0}
        />
      );

      expect(screen.getByText('Durasi: 0 jam')).toBeTruthy();
    });

    it('should handle fractional hours correctly', () => {
      render(
        <AttendanceCard
          workerName="John Doe"
          status="clocked_in"
          clockInTime="2026-01-19T08:30:00Z"
          hoursWorked={2.25}
        />
      );

      expect(screen.getByText('Durasi: 2 jam 15 menit')).toBeTruthy();
    });

    it('should handle hours less than 1', () => {
      render(
        <AttendanceCard
          workerName="John Doe"
          status="clocked_in"
          clockInTime="2026-01-19T08:30:00Z"
          hoursWorked={0.5}
        />
      );

      expect(screen.getByText('Durasi: 0 jam 30 menit')).toBeTruthy();
    });

    it('should handle long worker names', () => {
      render(
        <AttendanceCard
          workerName="Muhammad Abdullah Bin Rashid Al-Maktoum"
          status="clocked_in"
          clockInTime="2026-01-19T08:30:00Z"
        />
      );

      expect(screen.getByText('Muhammad Abdullah Bin Rashid Al-Maktoum')).toBeTruthy();
      expect(screen.getByText('MA')).toBeTruthy(); // First and last initials
    });
  });
});
