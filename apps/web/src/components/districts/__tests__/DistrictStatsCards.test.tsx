/**
 * Unit Tests: DistrictStatsCards
 * Tests district statistics cards component
 */

import { render, screen } from '@testing-library/react';
import DistrictStatsCards from '../DistrictStatsCards';
import type { DistrictStats } from '@/types/models';

describe('DistrictStatsCards', () => {
  const mockStats: DistrictStats = {
    district_id: 'district-1',
    total_areas: 15,
    total_users: 50,
    active_users: 45,
    total_coverage_area: 150000,
  };

  it('should render total areas stat', () => {
    render(<DistrictStatsCards stats={mockStats} />);

    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText(/total area/i)).toBeInTheDocument();
  });

  it('should render total workers stat', () => {
    render(<DistrictStatsCards stats={mockStats} />);

    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText(/total petugas/i)).toBeInTheDocument();
  });

  it('should render active workers stat', () => {
    render(<DistrictStatsCards stats={mockStats} />);

    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText(/petugas aktif/i)).toBeInTheDocument();
  });

  it('should render coverage area stat with formatting', () => {
    render(<DistrictStatsCards stats={mockStats} />);

    // formatArea converts 150000 to "15.00 ha"
    expect(screen.getByText(/15\.00 ha/i)).toBeInTheDocument();
    expect(screen.getByText(/luas tutupan/i)).toBeInTheDocument();
  });

  it('should render loading state', () => {
    render(<DistrictStatsCards loading />);

    // Check for skeleton loading cards
    const loadingCards = document.querySelectorAll('.animate-pulse');
    expect(loadingCards.length).toBeGreaterThan(0);
  });

  it('should render empty state when stats not provided', () => {
    render(<DistrictStatsCards />);

    expect(screen.getByText(/statistik tidak tersedia/i)).toBeInTheDocument();
  });

  it('should render all 4 stat cards in grid', () => {
    render(<DistrictStatsCards stats={mockStats} />);

    // Component renders 4 cards: Total Area, Total Petugas, Petugas Aktif, Luas Tutupan
    expect(screen.getByText(/total area/i)).toBeInTheDocument();
    expect(screen.getByText(/total petugas/i)).toBeInTheDocument();
    expect(screen.getByText(/petugas aktif/i)).toBeInTheDocument();
    expect(screen.getByText(/luas tutupan/i)).toBeInTheDocument();
  });
});
