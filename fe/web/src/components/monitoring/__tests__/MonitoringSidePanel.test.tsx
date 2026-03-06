/**
 * Unit Tests: MonitoringSidePanel Component
 * Tests status filter toggles, search input, user list rendering,
 * empty state, loading skeletons, and reset filter button.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MonitoringSidePanel } from '../MonitoringSidePanel';
import type { LiveUsersResponse, LiveUser } from '@/lib/api/monitoring';

const MOCK_USER_1: LiveUser = {
  id: 'user-1',
  full_name: 'Budi Santoso',
  role: 'satgas',
  phone: '+6281111111111',
  status: 'active',
  area_id: 'area-1',
  area_name: 'Taman Bungkul',
  rayon_id: 'rayon-1',
  rayon_name: 'Rayon Selatan',
  latitude: -7.289659,
  longitude: 112.739208,
  accuracy: 5,
  battery_level: 80,
  last_update: new Date().toISOString(),
  is_within_area: true,
  outside_boundary: false,
  shift_id: 'shift-1',
  shift_name: 'Pagi',
  clock_in_time: new Date().toISOString(),
  current_task_status: null,
  current_task_title: null,
};

const MOCK_USER_2: LiveUser = {
  ...MOCK_USER_1,
  id: 'user-2',
  full_name: 'Siti Rahayu',
  role: 'korlap',
  status: 'inactive',
  area_name: 'Taman Flora',
  area_id: 'area-2',
};

const MOCK_DATA: LiveUsersResponse = {
  total_active: 1,
  total_inactive: 1,
  total_outside_area: 0,
  total_missing: 0,
  total_offline: 0,
  users: [MOCK_USER_1, MOCK_USER_2],
  generated_at: new Date().toISOString(),
};

const defaultProps = {
  data: MOCK_DATA,
  isLoading: false,
  selectedUserId: null,
  onUserSelect: jest.fn(),
};

describe('MonitoringSidePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the summary bar with totals', () => {
      render(<MonitoringSidePanel {...defaultProps} />);
      // total online = active + inactive = 2, total = 2
      expect(screen.getByText(/2 aktif \/ 2 total/i)).toBeInTheDocument();
    });

    it('should render all four status cards', () => {
      render(<MonitoringSidePanel {...defaultProps} />);
      expect(screen.getByRole('button', { name: /saring aktif/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /saring idle/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /saring di luar area/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /saring tidak terdeteksi/i })).toBeInTheDocument();
    });

    it('should render the search input', () => {
      render(<MonitoringSidePanel {...defaultProps} />);
      expect(screen.getByRole('searchbox', { name: /cari petugas/i })).toBeInTheDocument();
    });

    it('should render the user list container', () => {
      render(<MonitoringSidePanel {...defaultProps} />);
      expect(screen.getByRole('listbox', { name: /daftar petugas aktif/i })).toBeInTheDocument();
    });

    it('should render user names in the list', () => {
      render(<MonitoringSidePanel {...defaultProps} />);
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
      expect(screen.getByText('Siti Rahayu')).toBeInTheDocument();
    });

    it('should render footer count when users are visible', () => {
      render(<MonitoringSidePanel {...defaultProps} />);
      expect(screen.getByText('2 petugas ditampilkan')).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should render loading skeletons when isLoading is true', () => {
      const { container } = render(
        <MonitoringSidePanel {...defaultProps} isLoading={true} />
      );
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not render user items while loading', () => {
      render(<MonitoringSidePanel {...defaultProps} isLoading={true} />);
      expect(screen.queryByText('Budi Santoso')).not.toBeInTheDocument();
    });
  });

  describe('Empty data', () => {
    it('should render empty message when data is undefined', () => {
      render(<MonitoringSidePanel {...defaultProps} data={undefined} />);
      expect(screen.getByText(/tidak ada petugas ditemukan/i)).toBeInTheDocument();
    });

    it('should render empty message when users array is empty', () => {
      const emptyData = { ...MOCK_DATA, users: [] };
      render(<MonitoringSidePanel {...defaultProps} data={emptyData} />);
      expect(screen.getByText(/tidak ada petugas ditemukan/i)).toBeInTheDocument();
    });
  });

  describe('Search filter', () => {
    it('should filter users by name when search text is typed', async () => {
      const user = userEvent.setup();
      render(<MonitoringSidePanel {...defaultProps} />);

      await user.type(screen.getByRole('searchbox'), 'Budi');

      await waitFor(() => {
        expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
        expect(screen.queryByText('Siti Rahayu')).not.toBeInTheDocument();
      });
    });

    it('should filter users by area name', async () => {
      const user = userEvent.setup();
      render(<MonitoringSidePanel {...defaultProps} />);

      await user.type(screen.getByRole('searchbox'), 'Flora');

      await waitFor(() => {
        expect(screen.getByText('Siti Rahayu')).toBeInTheDocument();
        expect(screen.queryByText('Budi Santoso')).not.toBeInTheDocument();
      });
    });

    it('should show empty message and reset button when search yields no results', async () => {
      const user = userEvent.setup();
      render(<MonitoringSidePanel {...defaultProps} />);

      await user.type(screen.getByRole('searchbox'), 'zzzznonexistent');

      await waitFor(() => {
        expect(screen.getByText(/tidak ada petugas ditemukan/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reset filter/i })).toBeInTheDocument();
      });
    });

    it('should clear search and show all users after clicking reset filter', async () => {
      const user = userEvent.setup();
      render(<MonitoringSidePanel {...defaultProps} />);

      await user.type(screen.getByRole('searchbox'), 'zzzznonexistent');
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /reset filter/i })).toBeInTheDocument()
      );

      await user.click(screen.getByRole('button', { name: /reset filter/i }));

      await waitFor(() => {
        expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
        expect(screen.getByText('Siti Rahayu')).toBeInTheDocument();
      });
    });
  });

  describe('Status filter toggles', () => {
    it('should filter list to active users when active status card is clicked', async () => {
      const user = userEvent.setup();
      render(<MonitoringSidePanel {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /saring aktif/i }));

      expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
      expect(screen.queryByText('Siti Rahayu')).not.toBeInTheDocument();
    });

    it('should filter list to inactive users when idle status card is clicked', async () => {
      const user = userEvent.setup();
      render(<MonitoringSidePanel {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /saring idle/i }));

      expect(screen.getByText('Siti Rahayu')).toBeInTheDocument();
      expect(screen.queryByText('Budi Santoso')).not.toBeInTheDocument();
    });

    it('should toggle the status filter off on second click of the same status card', async () => {
      const user = userEvent.setup();
      render(<MonitoringSidePanel {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /saring aktif/i }));
      await user.click(screen.getByRole('button', { name: /saring aktif/i }));

      expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
      expect(screen.getByText('Siti Rahayu')).toBeInTheDocument();
    });

    it('should mark the active status card as pressed when selected', async () => {
      const user = userEvent.setup();
      render(<MonitoringSidePanel {...defaultProps} />);

      const activeCard = screen.getByRole('button', { name: /saring aktif/i });
      expect(activeCard).toHaveAttribute('aria-pressed', 'false');

      await user.click(activeCard);
      expect(activeCard).toHaveAttribute('aria-pressed', 'true');
    });

    it('should show reset button when a status filter is active and no results found', async () => {
      const user = userEvent.setup();
      render(<MonitoringSidePanel {...defaultProps} />);

      // Filter to missing — no users with that status exist in mock data
      await user.click(screen.getByRole('button', { name: /saring tidak terdeteksi/i }));

      expect(screen.getByRole('button', { name: /reset filter/i })).toBeInTheDocument();
    });
  });

  describe('User selection', () => {
    it('should call onUserSelect with the user when a list item is clicked', async () => {
      const user = userEvent.setup();
      const handleSelect = jest.fn();
      render(<MonitoringSidePanel {...defaultProps} onUserSelect={handleSelect} />);

      await user.click(screen.getByRole('button', { name: /budi santoso/i }));

      expect(handleSelect).toHaveBeenCalledWith(MOCK_USER_1);
    });

    it('should mark the selected user item as selected', () => {
      render(<MonitoringSidePanel {...defaultProps} selectedUserId="user-1" />);
      expect(
        screen.getByRole('button', { name: /budi santoso/i })
      ).toHaveAttribute('aria-selected', 'true');
    });

    it('should not mark unselected user items as selected', () => {
      render(<MonitoringSidePanel {...defaultProps} selectedUserId="user-1" />);
      expect(
        screen.getByRole('button', { name: /siti rahayu/i })
      ).toHaveAttribute('aria-selected', 'false');
    });
  });
});
