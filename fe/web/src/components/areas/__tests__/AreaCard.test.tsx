/**
 * Unit Tests: AreaCard
 * Tests area display card component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AreaCard } from '../AreaCard';
import type { Area } from '@/types/models';

// Mock the utility functions
jest.mock('@/lib/utils/geo', () => ({
  formatArea: (area: number) => `${area.toLocaleString()} m²`,
}));

jest.mock('@/lib/utils/static-map', () => ({
  getStaticMapUrl: () => 'https://example.com/map.png',
}));

describe('AreaCard', () => {
  const mockArea: Area = {
    id: '1',
    name: 'Taman Bungkul',
    rayon_id: 'rayon-1',
    area_type_id: 'type-1',
    areaType: {
      id: 'type-1',
      name: 'Taman',
      category: 'ACTIVE',
      code: 'TM',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    rayon: {
      id: 'rayon-1',
      name: 'Rayon Selatan',
      code: 'RS',
      description: '',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    boundary_polygon: undefined,
    gps_lat: -7.2885,
    gps_lng: 112.7395,
    coverage_area: 15000,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  it('should render area name', () => {
    render(<AreaCard area={mockArea} />);

    expect(screen.getByText('Taman Bungkul')).toBeInTheDocument();
  });

  it('should render rayon badge', () => {
    render(<AreaCard area={mockArea} />);

    expect(screen.getByText(/rayon selatan/i)).toBeInTheDocument();
  });

  it('should render area type badge', () => {
    render(<AreaCard area={mockArea} />);

    expect(screen.getByText('Taman')).toBeInTheDocument();
  });

  it('should render map preview', () => {
    render(<AreaCard area={mockArea} />);

    const img = screen.getByRole('img', { name: /peta taman bungkul/i });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', expect.stringContaining('map.png'));
  });

  it('should render formatted area size', () => {
    render(<AreaCard area={mockArea} />);

    expect(screen.getByText(/15,000 m²/i)).toBeInTheDocument();
  });

  it('should call onView when view button is clicked', async () => {
    const onView = jest.fn();
    const user = userEvent.setup();

    render(<AreaCard area={mockArea} onView={onView} />);

    await user.click(screen.getByRole('button', { name: /lihat/i }));

    expect(onView).toHaveBeenCalledWith(mockArea);
  });

  it('should call onEdit when edit button is clicked', async () => {
    const onEdit = jest.fn();
    const user = userEvent.setup();

    render(<AreaCard area={mockArea} onEdit={onEdit} />);

    // Edit button is icon-only, it's the second button (after "Lihat")
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[1]);

    expect(onEdit).toHaveBeenCalledWith(mockArea);
  });

  it('should call onDelete when delete button is clicked', async () => {
    const onDelete = jest.fn();
    const user = userEvent.setup();

    render(<AreaCard area={mockArea} onDelete={onDelete} />);

    // Delete button is icon-only, it's the second button (after "Lihat")
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[1]);

    expect(onDelete).toHaveBeenCalledWith(mockArea);
  });

  it('should hide actions when showActions is false', () => {
    render(<AreaCard area={mockArea} showActions={false} />);

    expect(screen.queryByRole('button', { name: /lihat/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /hapus/i })).not.toBeInTheDocument();
  });

  it('should render without rayon', () => {
    const areaWithoutRayon = { ...mockArea, rayon: undefined };

    render(<AreaCard area={areaWithoutRayon} />);

    expect(screen.getByText('Taman Bungkul')).toBeInTheDocument();
    expect(screen.queryByText(/rayon/i)).not.toBeInTheDocument();
  });

  it('should render without area type', () => {
    const areaWithoutType = { ...mockArea, areaType: undefined };

    render(<AreaCard area={areaWithoutType} />);

    expect(screen.getByText('Taman Bungkul')).toBeInTheDocument();
  });
});
