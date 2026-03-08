/**
 * Unit Tests: LocationTimeline Component
 * Tests loading skeletons, no-history empty state, empty points state,
 * rendering of location points, summary stats, date picker, shift info,
 * callback handlers, interactive point selection, first/last markers,
 * summary info bar, and hide-others toggle.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { LocationTimeline } from '../LocationTimeline';
import type { LocationHistory } from '@/lib/api/monitoring';

const POINT_1_ISO = '2026-03-05T06:05:00.000Z';
const POINT_2_ISO = '2026-03-05T06:30:00.000Z';
const POINT_3_ISO = '2026-03-05T07:00:00.000Z';

const MOCK_HISTORY: LocationHistory = {
  user_id: 'user-1',
  user_name: 'Budi Santoso',
  role: 'satgas',
  date: '2026-03-05',
  shift_id: 'shift-1',
  shift_name: 'Pagi',
  area_id: 'area-1',
  area_name: 'Taman Bungkul',
  clock_in_time: POINT_1_ISO,
  clock_out_time: null,
  points: [
    {
      latitude: -7.289659,
      longitude: 112.739208,
      accuracy: 5,
      battery_level: 80,
      logged_at: POINT_1_ISO,
      is_within_area: true,
    },
    {
      latitude: -7.290001,
      longitude: 112.740000,
      accuracy: 10,
      battery_level: 78,
      logged_at: POINT_2_ISO,
      is_within_area: true,
    },
    {
      latitude: -7.295000,
      longitude: 112.745000,
      accuracy: 15,
      battery_level: 15,
      logged_at: POINT_3_ISO,
      is_within_area: false,
    },
  ],
  total_points: 3,
  total_distance_meters: 850,
  time_inside_area_minutes: 45,
  time_outside_area_minutes: 15,
  generated_at: '2026-03-05T09:00:00Z',
};

const defaultProps = {
  history: MOCK_HISTORY,
  isLoading: false,
  selectedDate: '2026-03-05',
  onDateChange: jest.fn(),
  onBack: jest.fn(),
  userName: 'Budi Santoso',
};

describe('LocationTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the user name in the header', () => {
      render(<LocationTimeline {...defaultProps} />);
      // userName appears in header and summary info bar
      const nameElements = screen.getAllByText('Budi Santoso');
      expect(nameElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should render the "Riwayat Lokasi" subtitle', () => {
      render(<LocationTimeline {...defaultProps} />);
      expect(screen.getByText('Riwayat Lokasi')).toBeInTheDocument();
    });

    it('should render the date picker with selected date value', () => {
      render(<LocationTimeline {...defaultProps} />);
      const datePicker = screen.getByLabelText(/pilih tanggal/i);
      expect(datePicker).toHaveValue('2026-03-05');
    });
  });

  describe('Loading state', () => {
    it('should render loading skeletons when isLoading is true', () => {
      const { container } = render(
        <LocationTimeline {...defaultProps} isLoading={true} />
      );
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not render location points while loading', () => {
      render(<LocationTimeline {...defaultProps} isLoading={true} />);
      expect(screen.queryByText('-7.289659')).not.toBeInTheDocument();
    });
  });

  describe('Empty / no history state', () => {
    it('should render no-history message when history is undefined', () => {
      render(<LocationTimeline {...defaultProps} history={undefined} />);
      expect(screen.getByText(/tidak ada riwayat lokasi/i)).toBeInTheDocument();
    });

    it('should render no-points message when points array is empty', () => {
      const emptyHistory = { ...MOCK_HISTORY, points: [], total_points: 0 };
      render(<LocationTimeline {...defaultProps} history={emptyHistory} />);
      expect(screen.getByText(/tidak ada titik lokasi/i)).toBeInTheDocument();
    });
  });

  describe('Summary stats', () => {
    it('should render total distance in meters when below 1000m', () => {
      render(<LocationTimeline {...defaultProps} />);
      expect(screen.getByText('850m')).toBeInTheDocument();
    });

    it('should render total distance in km when 1000m or above', () => {
      const history = { ...MOCK_HISTORY, total_distance_meters: 2500 };
      render(<LocationTimeline {...defaultProps} history={history} />);
      expect(screen.getByText('2.5km')).toBeInTheDocument();
    });

    it('should render total points count', () => {
      render(<LocationTimeline {...defaultProps} />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should render time inside area formatted as minutes', () => {
      render(<LocationTimeline {...defaultProps} />);
      expect(screen.getByText('45m')).toBeInTheDocument();
    });

    it('should render time outside area formatted as minutes', () => {
      render(<LocationTimeline {...defaultProps} />);
      expect(screen.getByText('15m')).toBeInTheDocument();
    });

    it('should render time as hours+minutes format when >= 60 minutes', () => {
      const history = {
        ...MOCK_HISTORY,
        time_inside_area_minutes: 90,
        time_outside_area_minutes: 70,
      };
      render(<LocationTimeline {...defaultProps} history={history} />);
      expect(screen.getByText('1j 30m')).toBeInTheDocument();
      expect(screen.getByText('1j 10m')).toBeInTheDocument();
    });

    it('should render shift name when available', () => {
      render(<LocationTimeline {...defaultProps} />);
      expect(screen.getByText(/pagi/i)).toBeInTheDocument();
    });
  });

  describe('Summary info bar', () => {
    it('should render summary info bar with userName and date', () => {
      render(<LocationTimeline {...defaultProps} />);
      // The info bar contains userName, date, distance, area times
      expect(screen.getByText(/2026-03-05/)).toBeInTheDocument();
    });

    it('should not render summary info bar when history is undefined', () => {
      render(<LocationTimeline {...defaultProps} history={undefined} />);
      expect(screen.queryByText(/Dalam/)).not.toBeInTheDocument();
    });
  });

  describe('Location points list', () => {
    it('should render all three location points', () => {
      render(<LocationTimeline {...defaultProps} />);
      const list = screen.getByRole('list', { name: /3 titik lokasi/i });
      const items = list.querySelectorAll('li');
      expect(items).toHaveLength(3);
    });

    it('should render "Dalam Area" label for within-area points', () => {
      render(<LocationTimeline {...defaultProps} />);
      const withinLabels = screen.getAllByText('Dalam Area');
      expect(withinLabels.length).toBeGreaterThanOrEqual(2);
    });

    it('should render "Di Luar Area" label for outside-area points', () => {
      render(<LocationTimeline {...defaultProps} />);
      const luarAreaLabels = screen.getAllByText('Di Luar Area');
      expect(luarAreaLabels.length).toBeGreaterThanOrEqual(1);
    });

    it('should render accuracy value for each point', () => {
      render(<LocationTimeline {...defaultProps} />);
      expect(screen.getByText('±5m')).toBeInTheDocument();
    });

    it('should render battery percentage for each point', () => {
      render(<LocationTimeline {...defaultProps} />);
      expect(screen.getByText('80%')).toBeInTheDocument();
    });

    it('should apply red text class for low battery points', () => {
      render(<LocationTimeline {...defaultProps} />);
      const lowBatteryEl = screen.getByText('15%');
      expect(lowBatteryEl).toHaveClass('text-red-500', 'font-semibold');
    });

    it('should render green dot indicator for within-area points', () => {
      const { container } = render(<LocationTimeline {...defaultProps} />);
      const greenDots = container.querySelectorAll('.bg-\\[var\\(--color-status-active\\)\\]');
      expect(greenDots.length).toBeGreaterThanOrEqual(2);
    });

    it('should render purple dot indicator for outside-area points', () => {
      const { container } = render(<LocationTimeline {...defaultProps} />);
      const purpleDots = container.querySelectorAll('.bg-\\[var\\(--color-status-outside\\)\\]');
      expect(purpleDots.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('First/Last markers', () => {
    it('should render "Mulai" badge on first point', () => {
      render(<LocationTimeline {...defaultProps} />);
      expect(screen.getByText(/Mulai/)).toBeInTheDocument();
    });

    it('should render "Akhir" badge on last point', () => {
      render(<LocationTimeline {...defaultProps} />);
      expect(screen.getByText(/Akhir/)).toBeInTheDocument();
    });

    it('should not render "Akhir" badge when only one point exists', () => {
      const singlePointHistory = { ...MOCK_HISTORY, points: [MOCK_HISTORY.points[0]], total_points: 1 };
      render(<LocationTimeline {...defaultProps} history={singlePointHistory} />);
      expect(screen.getByText(/Mulai/)).toBeInTheDocument();
      expect(screen.queryByText(/Akhir/)).not.toBeInTheDocument();
    });
  });

  describe('Interactive point selection', () => {
    it('should call onPointSelect when a point is clicked', async () => {
      const user = userEvent.setup();
      const handleSelect = jest.fn();
      render(<LocationTimeline {...defaultProps} onPointSelect={handleSelect} />);

      const pointButtons = screen.getAllByRole('button', { name: /titik lokasi/i });
      await user.click(pointButtons[1]);

      expect(handleSelect).toHaveBeenCalledWith(1);
    });

    it('should highlight the selected point row', () => {
      const { container } = render(
        <LocationTimeline {...defaultProps} selectedPointIndex={0} />
      );
      const firstItem = container.querySelector('li');
      expect(firstItem).toHaveClass('border-l-4');
    });

    it('should mark selected point button as pressed', () => {
      render(<LocationTimeline {...defaultProps} selectedPointIndex={1} />);
      const pointButtons = screen.getAllByRole('button', { name: /titik lokasi/i });
      expect(pointButtons[1]).toHaveAttribute('aria-pressed', 'true');
      expect(pointButtons[0]).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Hide-others toggle', () => {
    it('should render toggle when onToggleShowOnly is provided', () => {
      render(
        <LocationTimeline
          {...defaultProps}
          onToggleShowOnly={jest.fn()}
          showOnlyThisUser={false}
        />
      );
      expect(screen.getByText(/tampilkan hanya petugas ini/i)).toBeInTheDocument();
    });

    it('should not render toggle when onToggleShowOnly is not provided', () => {
      render(<LocationTimeline {...defaultProps} />);
      expect(screen.queryByText(/tampilkan hanya petugas ini/i)).not.toBeInTheDocument();
    });

    it('should call onToggleShowOnly when checkbox is clicked', async () => {
      const user = userEvent.setup();
      const handleToggle = jest.fn();
      render(
        <LocationTimeline
          {...defaultProps}
          onToggleShowOnly={handleToggle}
          showOnlyThisUser={false}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(handleToggle).toHaveBeenCalledWith(true);
    });
  });

  describe('Date picker interaction', () => {
    it('should call onDateChange when date input value changes', async () => {
      const user = userEvent.setup();
      const handleDateChange = jest.fn();
      render(<LocationTimeline {...defaultProps} onDateChange={handleDateChange} />);

      const datePicker = screen.getByLabelText(/pilih tanggal/i);
      await user.clear(datePicker);
      await user.type(datePicker, '2026-03-04');

      expect(handleDateChange).toHaveBeenCalled();
    });
  });

  describe('Back navigation', () => {
    it('should render the back button', () => {
      render(<LocationTimeline {...defaultProps} />);
      expect(
        screen.getByRole('button', { name: /kembali ke detail petugas/i })
      ).toBeInTheDocument();
    });

    it('should call onBack when back button is clicked', async () => {
      const user = userEvent.setup();
      const handleBack = jest.fn();
      render(<LocationTimeline {...defaultProps} onBack={handleBack} />);

      await user.click(
        screen.getByRole('button', { name: /kembali ke detail petugas/i })
      );

      expect(handleBack).toHaveBeenCalledTimes(1);
    });
  });
});
