/**
 * Unit Tests: LocationForm Component
 * Tests area creation and editing form with map polygon editor
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocationForm } from '../LocationForm';
import { useRayons } from '@/lib/api/rayons';
import { useLocationTypes } from '@/lib/api/location-types';
import { isValidPolygon, calculatePolygonCenter, formatCoordinates } from '@/lib/utils/geo';
import type { Location } from '@/types/models';
import { ReactNode } from 'react';

// Mock API hooks
jest.mock('@/lib/api/rayons', () => ({
  useRayons: jest.fn(),
}));
jest.mock('@/lib/api/location-types', () => ({
  useLocationTypes: jest.fn(),
}));

// Mock GoogleBoundaryEditor — Google Maps JS needs an API key + WebGL, cannot
// run in jsdom. Expose buttons to drive polygon/pin changes and render the
// manualFallback, which holds the center-coordinate display.
jest.mock('@/components/maps/GoogleBoundaryEditor', () => ({
  GoogleBoundaryEditor: ({
    onPolygonChange,
    onPinChange,
    manualFallback,
  }: {
    onPolygonChange?: (polygon: GeoJSON.Polygon | null) => void;
    onPinChange?: (coords: { lat: number; lng: number }) => void;
    manualFallback?: ReactNode;
  }) => (
    <div data-testid="google-boundary-editor">
      <button
        type="button"
        data-testid="draw-polygon"
        onClick={() =>
          onPolygonChange?.({
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
        Draw
      </button>
      <button
        type="button"
        data-testid="place-pin"
        onClick={() => onPinChange?.({ lat: -7.28, lng: 112.74 })}
      >
        Pin
      </button>
      {manualFallback}
    </div>
  ),
}));

// Mock geo utilities
jest.mock('@/lib/utils/geo', () => ({
  isValidPolygon: jest.fn(() => true),
  isBoundaryGeometry: jest.fn(() => true),
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

const FORM_ID = 'area-form-test';

/** Submit/Cancel live in the modal's DialogFooter, outside this form — mirror
 *  LocationFormModal's external button wired via the `form` attribute. */
function ExternalSubmitButton() {
  return (
    <button type="submit" form={FORM_ID}>
      Buat Area
    </button>
  );
}

describe('LocationForm', () => {
  const mockOnSubmit = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    (useRayons as jest.Mock).mockReturnValue({
      data: mockRayons,
      isLoading: false,
    });
    (useLocationTypes as jest.Mock).mockReturnValue({
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
        <>
          <LocationForm formId={FORM_ID} mode="create" onSubmit={mockOnSubmit} />
          <ExternalSubmitButton />
        </>,
        { wrapper: createWrapper() }
      );

      expect(screen.getByLabelText(/nama lokasi/i)).toBeInTheDocument();
      expect(screen.getByText('Rayon')).toBeInTheDocument();
      expect(screen.getByText('Tipe Lokasi')).toBeInTheDocument();
      expect(screen.getByTestId('google-boundary-editor')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /buat area/i })).toBeInTheDocument();
    });

    it('shows rayons in dropdown', async () => {
      const user = userEvent.setup();
      render(<LocationForm formId={FORM_ID} mode="create" onSubmit={mockOnSubmit} />, {
        wrapper: createWrapper(),
      });

      // FormCombobox renders options in a popover — open the Rayon combobox first.
      await user.click(screen.getAllByRole('combobox')[0]);
      expect(await screen.findByText('Rayon Utara')).toBeInTheDocument();
      expect(screen.getByText('Rayon Selatan')).toBeInTheDocument();
    });

    it('shows area types in dropdown', async () => {
      const user = userEvent.setup();
      render(<LocationForm formId={FORM_ID} mode="create" onSubmit={mockOnSubmit} />, {
        wrapper: createWrapper(),
      });

      // Open the Tipe Area combobox — comboboxes are rayon[0], region[1], type[2].
      await user.click(screen.getAllByRole('combobox')[2]);
      expect(await screen.findByText(/taman kota/i)).toBeInTheDocument();
      expect(screen.getByText(/jalur hijau/i)).toBeInTheDocument();
    });

    it('shows loading state when rayons are loading', () => {
      (useRayons as jest.Mock).mockReturnValue({ data: undefined, isLoading: true });

      render(<LocationForm formId={FORM_ID} mode="create" onSubmit={mockOnSubmit} />, {
        wrapper: createWrapper(),
      });

      // Rayon select should show empty options while loading
      const rayonSelects = screen.getAllByRole('combobox');
      expect(rayonSelects.length).toBeGreaterThan(0);
    });

    it('shows loading state when area types are loading', () => {
      (useLocationTypes as jest.Mock).mockReturnValue({ data: undefined, isLoading: true });

      render(<LocationForm formId={FORM_ID} mode="create" onSubmit={mockOnSubmit} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByTestId('google-boundary-editor')).toBeInTheDocument();
    });
  });

  describe('Edit mode', () => {
    const mockArea: Location = {
      id: 'area-1',
      name: 'Taman Bungkul',
      rayon_id: 'rayon-1',
      location_type_id: 'type-1',
      address: 'Jl. Taman Bungkul No. 1',
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
      gps_lat: -7.28,
      gps_lng: 112.74,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    it('pre-populates form with existing data', () => {
      render(<LocationForm formId={FORM_ID} mode="edit" initialData={mockArea} onSubmit={mockOnSubmit} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByDisplayValue('Taman Bungkul')).toBeInTheDocument();
    });

    it('displays center coordinates when area has boundary', () => {
      render(<LocationForm formId={FORM_ID} mode="edit" initialData={mockArea} onSubmit={mockOnSubmit} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(/koordinat pusat/i)).toBeInTheDocument();
    });
  });

  describe('Pin interaction', () => {
    it('shows coordinates after the location pin is placed', async () => {
      render(<LocationForm formId={FORM_ID} mode="create" onSubmit={mockOnSubmit} />, {
        wrapper: createWrapper(),
      });

      // Drawing a boundary no longer sets the pin — placing it explicitly does.
      fireEvent.click(screen.getByTestId('place-pin'));

      await waitFor(() => {
        expect(screen.getByText(/koordinat pusat/i)).toBeInTheDocument();
      });
    });
  });

  describe('Geometry validity reporting', () => {
    it('reports invalid until a pin or boundary is set, then valid', async () => {
      const onValidityChange = jest.fn();
      render(
        <LocationForm
          formId={FORM_ID}
          mode="create"
          onSubmit={mockOnSubmit}
          onValidityChange={onValidityChange}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(onValidityChange).toHaveBeenLastCalledWith(false));

      fireEvent.click(screen.getByTestId('place-pin'));

      await waitFor(() => expect(onValidityChange).toHaveBeenLastCalledWith(true));
    });
  });
});
