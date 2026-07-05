/**
 * Unit tests: RayonForm — boundary polygon (optional) + center pin on the
 * unified Google Maps editor (mocked).
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RayonForm } from '../RayonForm';

jest.mock('@/lib/api/rayons', () => ({
  checkRayonName: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/hooks/useAvailabilityCheck', () => ({
  useAvailabilityCheck: () => 'idle',
}));

jest.mock('@/components/maps/GoogleBoundaryEditor', () => ({
  GoogleBoundaryEditor: ({
    onPolygonChange,
    onPinChange,
  }: {
    onPolygonChange?: (p: GeoJSON.Polygon | null) => void;
    onPinChange?: (c: { lat: number; lng: number }) => void;
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
    </div>
  ),
}));

describe('RayonForm', () => {
  it('renders name, color, description and the boundary editor', () => {
    render(<RayonForm mode="create" onSubmit={jest.fn().mockResolvedValue(undefined)} />);
    expect(screen.getByLabelText(/nama rayon/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/kode warna/i)).toBeInTheDocument();
    expect(screen.getByTestId('google-boundary-editor')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /buat rayon/i })).toBeInTheDocument();
  });

  it('submits with only a pin (boundary optional) — boundary_polygon is null', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<RayonForm mode="create" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/nama rayon/i), 'Rayon Baru');
    await user.click(screen.getByTestId('place-pin')); // at least one geometry required
    await user.click(screen.getByRole('button', { name: /buat rayon/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: 'Rayon Baru', boundary_polygon: null });
  });

  it('blocks save when neither boundary nor pin is set', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<RayonForm mode="create" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/nama rayon/i), 'Rayon Baru');
    expect(screen.getByRole('button', { name: /buat rayon/i })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('includes the drawn boundary_polygon on submit', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<RayonForm mode="create" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/nama rayon/i), 'Rayon Baru');
    await user.click(screen.getByTestId('draw-polygon'));
    await user.click(screen.getByTestId('place-pin'));
    await user.click(screen.getByRole('button', { name: /buat rayon/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.boundary_polygon).toEqual(expect.objectContaining({ type: 'Polygon' }));
    expect(payload.center_lat).toBeCloseTo(-7.28);
    expect(payload.center_lng).toBeCloseTo(112.74);
  });
});
