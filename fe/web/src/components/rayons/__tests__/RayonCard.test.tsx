/**
 * Unit Tests: RayonCard
 * Tests rayon display card component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RayonCard from '../RayonCard';
import type { Rayon } from '@/types/models';

describe('RayonCard', () => {
  const mockRayon: Rayon = {
    id: 'rayon-1',
    name: 'Rayon Utara',
    code: 'RU',
    description: 'Wilayah Utara Surabaya',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  it('should render rayon name', () => {
    render(<RayonCard rayon={mockRayon} />);

    expect(screen.getByText('Rayon Utara')).toBeInTheDocument();
  });

  it('should render rayon code', () => {
    render(<RayonCard rayon={mockRayon} />);

    expect(screen.getByText('RU')).toBeInTheDocument();
  });

  it('should render rayon description', () => {
    render(<RayonCard rayon={mockRayon} />);

    expect(screen.getByText('Wilayah Utara Surabaya')).toBeInTheDocument();
  });

  it('should render as a link to rayon detail page', () => {
    render(<RayonCard rayon={mockRayon} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/rayons/rayon-1');
  });

  it('should render with stats when provided', () => {
    const mockStats = {
      rayon_id: 'rayon-1',
      total_areas: 10,
      total_workers: 50,
      active_workers: 45,
      total_coverage_area: 100000,
    };

    render(<RayonCard rayon={mockRayon} stats={mockStats} />);

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText(/jumlah area/i)).toBeInTheDocument();
  });

  it('should render loading state', () => {
    render(<RayonCard rayon={mockRayon} loading />);

    const loadingElement = document.querySelector('.animate-pulse');
    expect(loadingElement).toBeInTheDocument();
  });
});
