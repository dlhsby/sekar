/**
 * Unit Tests: DistrictCard
 * Tests district display card component
 */

import { render, screen } from '@testing-library/react';
import DistrictCard from '../DistrictCard';
import type { District } from '@/types/models';

describe('DistrictCard', () => {
  const mockDistrict: District = {
    id: 'district-1',
    name: 'Rayon Utara',
    description: 'Wilayah Utara Surabaya',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  it('should render district name', () => {
    render(<DistrictCard district={mockDistrict} />);

    expect(screen.getByText('Rayon Utara')).toBeInTheDocument();
  });

  it('should render district description', () => {
    render(<DistrictCard district={mockDistrict} />);

    expect(screen.getByText('Wilayah Utara Surabaya')).toBeInTheDocument();
  });

  it('should render as a link to district detail page', () => {
    render(<DistrictCard district={mockDistrict} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/districts/district-1');
  });

  it('should render with stats when provided', () => {
    const mockStats = {
      district_id: 'district-1',
      total_areas: 10,
      total_users: 50,
      active_users: 45,
      total_coverage_area: 100000,
    };

    render(<DistrictCard district={mockDistrict} stats={mockStats} />);

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText(/jumlah area/i)).toBeInTheDocument();
  });

  it('should render loading state', () => {
    render(<DistrictCard district={mockDistrict} loading />);

    const loadingElement = document.querySelector('.animate-pulse');
    expect(loadingElement).toBeInTheDocument();
  });
});
