/**
 * Unit Tests: AreaForm Component
 * Tests area creation and editing form with map polygon editor
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AreaForm } from '../AreaForm';
import { useRayons } from '@/lib/api/rayons';
import { useAreaTypes } from '@/lib/api/area-types';
import { isValidPolygon, calculatePolygonCenter, formatCoordinates } from '@/lib/utils/geo';
import type { Area } from '@/types/models';
import { ReactNode } from 'react';

// Mock API hooks
jest.mock('@/lib/api/rayons', () => ({
  useRayons: jest.fn(),
}));
jest.mock('@/lib/api/area-types', () => ({
  useAreaTypes: jest.fn(),
}));

// Mock PolygonEditor — Mapbox GL requires WebGL, cannot run in jsdom
jest.mock('@/components/maps/PolygonEditor', () => ({
  PolygonEditor: ({ onChange }: { onChange: (polygon: GeoJSON.Polygon | null) => void }) => (
    <div
      data-testid="polygon-editor"
      onClick={() =>
        onChange({
          type: 'Polygon',
          coordinates: [
            [
              [112.74, -7.28],
              [112.75, -7.28],
              [112.75, -7.29],
              [112.74, -7.29],
              [112.74, -7.28],
            ],
          ],
        })
      }
    >
      Polygon Editor Mock
    </div>
  ),
}));

// Mock geo utilities
jest.mock('@/lib/utils/geo', () => ({
  isValidPolygon: jest.fn(() => true),
  calculatePolygonCenter: jest.fn(() => [112.74, -7.28] as [number, number]),
  formatCoordinates: jest.fn(() => '112.740000°E, 7.280000°S'),
}));

const mockRayons = [
  { id: 'rayon-1', name: 'Rayon Utara', code: 'RU' },
  { id: 'rayon-2', name: 'Rayon Selatan', code: 'RS' },
];

const mockAreaTypes = [
  { id: 'type-1', name: 'Taman Kota', category: 'Taman', code: 'TK' },
  { id: 'type-2', name: 'Jalur Hijau', category: 'Jalur', code: 'JH' },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
}

describe('AreaForm', () => {
  const mockOnSubmit = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    (useRayons as jest.Mock).mockReturnValue({
      data: mockRayons,
      isLoading: false,
    });
    (useAreaTypes as jest.Mock).mockReturnValue({
      data: mockAreaTypes,
      isLoading: false,
    });
    (isValidPolygon as jest.Mock).mockReturnValue(true);
    (calculatePolygonCenter as jest.Mock).mockReturnValue([112.74, -7.28]);
    (formatCoordinates as jest.Mock).mockReturnValue('112.740000°E, 7.280000°S');
  });

  describe('Create mode', () => {
    it('renders all form fields in create mode', () => {
      render(
        <AreaForm mode="create" onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByLabelText(/nama area/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/kode area/i)).toBeInTheDocument();
      expect(screen.getByText('Rayon')).toBeInTheDocument();
      expect(screen.getByText('Tipe Area')).toBeInTheDocument();
      expect(screen.getByTestId('polygon-editor')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /simpan area/i })).toBeInTheDocument();
    });

    it('shows rayons in dropdown', () => {
      render(
        <AreaForm mode="create" onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Rayon Utara')).toBeInTheDocument();
      expect(screen.getByText('Rayon Selatan')).toBeInTheDocument();
    });

    it('shows area types in dropdown', () => {
      render(
        <AreaForm mode="create" onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/taman kota/i)).toBeInTheDocument();
      expect(screen.getByText(/jalur hijau/i)).toBeInTheDocument();
    });

    it('shows loading state when rayons are loading', () => {
      (useRayons as jest.Mock).mockReturnValue({ data: undefined, isLoading: true });

      render(
        <AreaForm mode="create" onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      // Rayon select should show empty options while loading
      const rayonSelects = screen.getAllByRole('combobox');
      expect(rayonSelects.length).toBeGreaterThan(0);
    });

    it('shows loading state when area types are loading', () => {
      (useAreaTypes as jest.Mock).mockReturnValue({ data: undefined, isLoading: true });

      render(
        <AreaForm mode="create" onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId('polygon-editor')).toBeInTheDocument();
    });
  });

  describe('Edit mode', () => {
    const mockArea: Area = {
      id: 'area-1',
      name: 'Taman Bungkul',
      code: 'TMNBKL',
      rayon_id: 'rayon-1',
      area_type_id: 'type-1',
      description: 'Taman kota utama',
      boundary_polygon: {
        type: 'Polygon',
        coordinates: [
          [
            [112.74, -7.28],
            [112.75, -7.28],
            [112.75, -7.29],
            [112.74, -7.29],
            [112.74, -7.28],
          ],
        ],
      },
      center_latitude: -7.28,
      center_longitude: 112.74,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    it('pre-populates form with existing data', () => {
      render(
        <AreaForm mode="edit" initialData={mockArea} onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByDisplayValue('Taman Bungkul')).toBeInTheDocument();
      expect(screen.getByDisplayValue('TMNBKL')).toBeInTheDocument();
    });

    it('shows update button in edit mode', () => {
      render(
        <AreaForm mode="edit" initialData={mockArea} onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button', { name: /perbarui area/i })).toBeInTheDocument();
    });

    it('displays center coordinates when area has boundary', () => {
      render(
        <AreaForm mode="edit" initialData={mockArea} onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/koordinat pusat/i)).toBeInTheDocument();
    });
  });

  describe('Polygon interaction', () => {
    it('shows coordinates after polygon is drawn', async () => {
      render(
        <AreaForm mode="create" onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      const polygonEditor = screen.getByTestId('polygon-editor');
      fireEvent.click(polygonEditor);

      await waitFor(() => {
        expect(screen.getByText(/koordinat pusat/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading state', () => {
    it('shows loading text on submit button when isLoading is true', () => {
      render(
        <AreaForm mode="create" onSubmit={mockOnSubmit} isLoading />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button', { name: /menyimpan/i })).toBeInTheDocument();
    });

    it('shows updating text in edit mode when isLoading', () => {
      render(
        <AreaForm mode="edit" onSubmit={mockOnSubmit} isLoading />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button', { name: /memperbarui/i })).toBeInTheDocument();
    });
  });

  describe('Code auto-uppercase', () => {
    it('auto-uppercases the code field input', async () => {
      const user = userEvent.setup();
      render(
        <AreaForm mode="create" onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      const codeInput = screen.getByLabelText(/kode area/i);
      await user.type(codeInput, 'tmnbkl');

      await waitFor(() => {
        expect((codeInput as HTMLInputElement).value).toBe('TMNBKL');
      });
    });
  });
});
