/**
 * Unit Tests: UserDetailPanel Component
 * Tests loading skeleton, no-data fallback, user header info,
 * shift section, location section, activities list, tasks list,
 * WhatsApp/call links, onBack callback, and onViewLocationHistory callback.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UserDetailPanel } from '../UserDetailPanel';
import type { UserDaySummary } from '@/lib/api/monitoring';

const CLOCK_IN_ISO = '2026-03-05T06:00:00.000Z';
const LAST_LOC_ISO = new Date(Date.now() - 3 * 60 * 1000).toISOString(); // 3 min ago

const MOCK_SUMMARY: UserDaySummary = {
  user_id: 'user-1',
  full_name: 'Budi Santoso',
  username: 'budi.s',
  role: 'satgas',
  phone: '+6281234567890',
  status: 'active',
  location_id: 'area-1',
  location_name: 'Taman Bungkul',
  district_id: 'district-1',
  district_name: 'Rayon Selatan',
  shift: {
    id: 'shift-1',
    name: 'Pagi',
    clock_in_time: CLOCK_IN_ISO,
    clock_out_time: null,
    duration_minutes: 480,
    outside_boundary: false,
  },
  last_location: {
    latitude: -7.289659,
    longitude: 112.739208,
    accuracy: 8,
    battery_level: 72,
    logged_at: LAST_LOC_ISO,
    is_within_area: true,
  },
  activities_today: [
    {
      id: 'act-1',
      title: 'Penyiraman Tanaman',
      activity_type: 'maintenance',
      created_at: '2026-03-05T07:15:00.000Z',
      photo_url: null,
    },
  ],
  tasks_today: [
    {
      id: 'task-1',
      title: 'Bersihkan Taman',
      status: 'in_progress',
      priority: 'medium',
    },
  ],
  whatsapp_links: {
    chat: 'https://wa.me/6281234567890',
    call: 'https://wa.me/6281234567890?action=call',
  },
};

const defaultProps = {
  summary: MOCK_SUMMARY,
  isLoading: false,
  onBack: jest.fn(),
  onViewLocationHistory: jest.fn(),
};

describe('UserDetailPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should render loading skeletons when isLoading is true', () => {
      const { container } = render(
        <UserDetailPanel {...defaultProps} isLoading={true} summary={undefined} />
      );
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not render user name while loading', () => {
      render(<UserDetailPanel {...defaultProps} isLoading={true} summary={undefined} />);
      expect(screen.queryByText('Budi Santoso')).not.toBeInTheDocument();
    });
  });

  describe('No data state', () => {
    it('should render unavailable message when summary is undefined and not loading', () => {
      render(<UserDetailPanel {...defaultProps} isLoading={false} summary={undefined} />);
      expect(screen.getByText(/data tidak tersedia/i)).toBeInTheDocument();
    });

    it('should render a back button in no-data state', () => {
      render(<UserDetailPanel {...defaultProps} isLoading={false} summary={undefined} />);
      expect(screen.getByRole('button', { name: /kembali/i })).toBeInTheDocument();
    });

    it('should call onBack when back button clicked in no-data state', async () => {
      const user = userEvent.setup();
      const handleBack = jest.fn();
      render(
        <UserDetailPanel
          {...defaultProps}
          isLoading={false}
          summary={undefined}
          onBack={handleBack}
        />
      );

      await user.click(screen.getByRole('button', { name: /kembali/i }));
      expect(handleBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('User header section', () => {
    it('should render the user full name', () => {
      render(<UserDetailPanel {...defaultProps} />);
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    });

    it('should render the username prefixed with @', () => {
      render(<UserDetailPanel {...defaultProps} />);
      expect(screen.getByText('@budi.s')).toBeInTheDocument();
    });

    it('should render the role label badge', () => {
      render(<UserDetailPanel {...defaultProps} />);
      // satgas or its label is shown
      expect(screen.getByText(/satgas|petugas/i)).toBeInTheDocument();
    });

    it('should render the status label badge', () => {
      render(<UserDetailPanel {...defaultProps} />);
      expect(screen.getByText('Aktif')).toBeInTheDocument();
    });

    it('should render district name', () => {
      render(<UserDetailPanel {...defaultProps} />);
      expect(screen.getByText(/rayon selatan/i)).toBeInTheDocument();
    });

    it('should render area name', () => {
      render(<UserDetailPanel {...defaultProps} />);
      expect(screen.getByText(/taman bungkul/i)).toBeInTheDocument();
    });
  });

  describe('Back navigation', () => {
    it('should call onBack when back button is clicked', async () => {
      const user = userEvent.setup();
      const handleBack = jest.fn();
      render(<UserDetailPanel {...defaultProps} onBack={handleBack} />);

      await user.click(screen.getByRole('button', { name: /kembali ke daftar/i }));

      expect(handleBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Shift section', () => {
    it('should render shift name', () => {
      render(<UserDetailPanel {...defaultProps} />);
      expect(screen.getByText('Pagi')).toBeInTheDocument();
    });

    it('should render shift duration', () => {
      render(<UserDetailPanel {...defaultProps} />);
      // 480 minutes = 8j 0m
      expect(screen.getByText('8j 0m')).toBeInTheDocument();
    });

    it('should not render shift section when shift is null', () => {
      const summary = { ...MOCK_SUMMARY, shift: null };
      render(<UserDetailPanel {...defaultProps} summary={summary} />);
      expect(screen.queryByText('Shift Hari Ini')).not.toBeInTheDocument();
    });

    it('should render "Di luar batas area" when outside_boundary is true', () => {
      const summary = {
        ...MOCK_SUMMARY,
        shift: { ...MOCK_SUMMARY.shift!, outside_boundary: true },
      };
      render(<UserDetailPanel {...defaultProps} summary={summary} />);
      expect(screen.getByText(/di luar batas area/i)).toBeInTheDocument();
    });
  });

  describe('Last location section', () => {
    it('should render coordinates in monospace', () => {
      render(<UserDetailPanel {...defaultProps} />);
      expect(screen.getByText(/-7\.289659/)).toBeInTheDocument();
    });

    it('should render battery percentage', () => {
      render(<UserDetailPanel {...defaultProps} />);
      expect(screen.getByText('72%')).toBeInTheDocument();
    });

    it('should show "Dalam area" when is_within_area is true', () => {
      render(<UserDetailPanel {...defaultProps} />);
      expect(screen.getByText('Dalam area')).toBeInTheDocument();
    });

    it('should show "Di luar area" when is_within_area is false', () => {
      const summary = {
        ...MOCK_SUMMARY,
        last_location: { ...MOCK_SUMMARY.last_location!, is_within_area: false },
      };
      render(<UserDetailPanel {...defaultProps} summary={summary} />);
      expect(screen.getByText('Di luar area')).toBeInTheDocument();
    });

    it('should call onViewLocationHistory when location history button is clicked', async () => {
      const user = userEvent.setup();
      const handleViewHistory = jest.fn();
      render(<UserDetailPanel {...defaultProps} onViewLocationHistory={handleViewHistory} />);

      await user.click(screen.getByRole('button', { name: /lihat riwayat lokasi/i }));

      expect(handleViewHistory).toHaveBeenCalledTimes(1);
    });

    it('should not render location section when last_location is null', () => {
      const summary = { ...MOCK_SUMMARY, last_location: null };
      render(<UserDetailPanel {...defaultProps} summary={summary} />);
      expect(
        screen.queryByRole('button', { name: /lihat riwayat lokasi/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('Activities today section', () => {
    it('should render activity titles', () => {
      render(<UserDetailPanel {...defaultProps} />);
      expect(screen.getByText('Penyiraman Tanaman')).toBeInTheDocument();
    });

    it('should render activities count in section heading', () => {
      render(<UserDetailPanel {...defaultProps} />);
      expect(screen.getByText(/aktivitas hari ini \(1\)/i)).toBeInTheDocument();
    });

    it('should not render activities section when list is empty', () => {
      const summary = { ...MOCK_SUMMARY, activities_today: [] };
      render(<UserDetailPanel {...defaultProps} summary={summary} />);
      expect(screen.queryByText(/aktivitas hari ini/i)).not.toBeInTheDocument();
    });
  });

  describe('Tasks today section', () => {
    it('should render task titles', () => {
      render(<UserDetailPanel {...defaultProps} />);
      expect(screen.getByText('Bersihkan Taman')).toBeInTheDocument();
    });

    it('should render tasks count in section heading', () => {
      render(<UserDetailPanel {...defaultProps} />);
      expect(screen.getByText(/tugas hari ini \(1\)/i)).toBeInTheDocument();
    });

    it('should not render tasks section when list is empty', () => {
      const summary = { ...MOCK_SUMMARY, tasks_today: [] };
      render(<UserDetailPanel {...defaultProps} summary={summary} />);
      expect(screen.queryByText(/tugas hari ini/i)).not.toBeInTheDocument();
    });
  });

  describe('Contact links section', () => {
    it('should render WhatsApp Chat link with correct href', () => {
      render(<UserDetailPanel {...defaultProps} />);
      const chatLink = screen.getByRole('link', { name: /chat whatsapp/i });
      expect(chatLink).toHaveAttribute('href', 'https://wa.me/6281234567890');
    });

    it('should render Telepon link with correct href', () => {
      render(<UserDetailPanel {...defaultProps} />);
      const callLink = screen.getByRole('link', { name: /telepon/i });
      expect(callLink).toHaveAttribute('href', 'https://wa.me/6281234567890?action=call');
    });

    it('should open links in a new tab', () => {
      render(<UserDetailPanel {...defaultProps} />);
      const chatLink = screen.getByRole('link', { name: /chat whatsapp/i });
      expect(chatLink).toHaveAttribute('target', '_blank');
      expect(chatLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should not render contact section when whatsapp_links is null', () => {
      const summary = { ...MOCK_SUMMARY, whatsapp_links: null };
      render(<UserDetailPanel {...defaultProps} summary={summary} />);
      expect(screen.queryByRole('link', { name: /chat whatsapp/i })).not.toBeInTheDocument();
    });
  });
});
