/**
 * Unit Tests: UserListItem Component
 * Tests status dot color, battery warning display, name/role text,
 * area display, relative time, selection state, and click handler.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UserListItem } from '../UserListItem';
import type { LiveUser } from '@/lib/api/monitoring';

const BASE_USER: LiveUser = {
  id: 'user-1',
  full_name: 'Budi Santoso',
  role: 'satgas',
  phone: '+6281234567890',
  status: 'active',
  location_id: 'area-1',
  location_name: 'Taman Bungkul',
  district_id: 'district-1',
  district_name: 'Rayon Selatan',
  latitude: -7.289659,
  longitude: 112.739208,
  accuracy: 5,
  battery_level: 85,
  last_update: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
  is_within_area: true,
  outside_boundary: false,
  shift_id: 'shift-1',
  shift_name: 'Pagi',
  clock_in_time: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  current_task_status: 'in_progress',
  current_task_title: 'Penyiraman Tanaman',
};

const defaultProps = {
  user: BASE_USER,
  isSelected: false,
  onClick: jest.fn(),
};

describe('UserListItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the user full name', () => {
      render(<UserListItem {...defaultProps} />);
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    });

    it('should render the area name', () => {
      render(<UserListItem {...defaultProps} />);
      expect(screen.getByText('Taman Bungkul')).toBeInTheDocument();
    });

    it('should render a role label badge', () => {
      render(<UserListItem {...defaultProps} />);
      // satgas maps to a human-readable label via ROLE_LABELS
      expect(screen.getByText(/satgas|petugas/i)).toBeInTheDocument();
    });

    it('should render a dash when location_name is empty', () => {
      const user = { ...BASE_USER, location_name: '' };
      render(<UserListItem {...defaultProps} user={user} />);
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('should render as a button element', () => {
      render(<UserListItem {...defaultProps} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render accessible aria-label with name and status', () => {
      render(<UserListItem {...defaultProps} />);
      const btn = screen.getByRole('button');
      expect(btn).toHaveAttribute('aria-label', expect.stringContaining('Budi Santoso'));
      expect(btn).toHaveAttribute('aria-label', expect.stringContaining('Aktif'));
    });
  });

  describe('Status dot colors', () => {
    it.each([
      ['active', 'bg-[var(--color-status-active)]'],
      ['offline', 'bg-[var(--color-status-idle)]'],
      ['absent', 'bg-[var(--color-status-missing)]'],
    ] as const)(
      'should render status dot with correct color class for status "%s"',
      (status, expectedClass) => {
        const { container } = render(
          <UserListItem {...defaultProps} user={{ ...BASE_USER, status }} />
        );
        const dot = container.querySelector('.rounded-full.flex-shrink-0');
        expect(dot).toHaveClass(expectedClass);
      }
    );

    it('should add animate-pulse class to offline status dot', () => {
      const { container } = render(
        <UserListItem {...defaultProps} user={{ ...BASE_USER, status: 'offline' }} />
      );
      const dot = container.querySelector('.rounded-full.flex-shrink-0');
      expect(dot).toHaveClass('bg-[var(--color-status-idle)]', 'animate-pulse');
    });
  });

  describe('Battery warning', () => {
    it('should show battery warning badge when battery is below 20%', () => {
      const user = { ...BASE_USER, battery_level: 15 };
      render(<UserListItem {...defaultProps} user={user} />);

      const batteryBadge = screen.getByLabelText(/baterai rendah: 15%/i);
      expect(batteryBadge).toBeInTheDocument();
      expect(batteryBadge).toHaveTextContent('15%');
    });

    it('should not show battery warning badge when battery is 20% or above', () => {
      const user = { ...BASE_USER, battery_level: 20 };
      render(<UserListItem {...defaultProps} user={user} />);

      expect(screen.queryByLabelText(/baterai rendah/i)).not.toBeInTheDocument();
    });

    it('should not show battery warning badge when battery_level is null', () => {
      const user = { ...BASE_USER, battery_level: null };
      render(<UserListItem {...defaultProps} user={user} />);

      expect(screen.queryByLabelText(/baterai rendah/i)).not.toBeInTheDocument();
    });

    it('should show battery percentage in the badge', () => {
      const user = { ...BASE_USER, battery_level: 8 };
      render(<UserListItem {...defaultProps} user={user} />);

      expect(screen.getByText('8%')).toBeInTheDocument();
    });
  });

  describe('Selection state', () => {
    it('should set aria-selected to false when isSelected is false', () => {
      render(<UserListItem {...defaultProps} isSelected={false} />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-selected', 'false');
    });

    it('should set aria-selected to true when isSelected is true', () => {
      render(<UserListItem {...defaultProps} isSelected={true} />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Interaction', () => {
    it('should call onClick when the item is clicked', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      render(<UserListItem {...defaultProps} onClick={handleClick} />);

      await user.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick when activated via keyboard Enter', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      render(<UserListItem {...defaultProps} onClick={handleClick} />);

      screen.getByRole('button').focus();
      await user.keyboard('{Enter}');

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Relative time display', () => {
    it('should display "baru saja" for very recent updates', () => {
      const user = { ...BASE_USER, last_update: new Date().toISOString() };
      render(<UserListItem {...defaultProps} user={user} />);
      expect(screen.getByText('Baru saja')).toBeInTheDocument();
    });

    it('should display minutes for updates within the last hour', () => {
      const user = {
        ...BASE_USER,
        last_update: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      };
      render(<UserListItem {...defaultProps} user={user} />);
      expect(screen.getByText(/5 menit lalu/)).toBeInTheDocument();
    });

    it('should display hours for updates older than 60 minutes', () => {
      const user = {
        ...BASE_USER,
        last_update: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      };
      render(<UserListItem {...defaultProps} user={user} />);
      expect(screen.getByText(/2 jam lalu/)).toBeInTheDocument();
    });
  });
});
