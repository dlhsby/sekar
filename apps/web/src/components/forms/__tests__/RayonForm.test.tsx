/**
 * Unit tests: RayonForm — boundary polygon (optional) + center pin on the
 * unified Google Maps editor (mocked). Submit/Cancel live in the modal's
 * DialogFooter (outside this form), so tests submit via a sibling button
 * wired to the same `formId`, matching how RayonFormModal renders it.
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

const FORM_ID = 'rayon-form-test';

/** Mirrors RayonFormModal: a submit button outside the form, wired via `form`. */
function ExternalSubmitButton() {
  return (
    <button type="submit" form={FORM_ID}>
      Buat Rayon
    </button>
  );
}

/** Pick a "Tingkat Kebutuhan Petugas" option (no preselection on create). */
async function selectStaffing(user: ReturnType<typeof userEvent.setup>, label: RegExp) {
  await user.click(screen.getByRole('combobox', { name: /tingkat kebutuhan petugas/i }));
  await user.click(await screen.findByRole('option', { name: label }));
}

describe('RayonForm', () => {
  it('renders name, map-style colours, description and the boundary editor', () => {
    render(
      <>
        <RayonForm formId={FORM_ID} mode="create" onSubmit={jest.fn().mockResolvedValue(undefined)} />
        <ExternalSubmitButton />
      </>
    );
    expect(screen.getByLabelText(/nama rayon/i)).toBeInTheDocument();
    // The legacy single "Warna" field is gone — only the map-style border/fill
    // colours remain (fill is optional, toggled off by default).
    expect(screen.getByLabelText(/warna batas/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/kode warna/i)).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /aktifkan warna isi/i })).toBeInTheDocument();
    expect(screen.getByTestId('google-boundary-editor')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /buat rayon/i })).toBeInTheDocument();
  });

  it('submits with only a pin (boundary optional) — boundary_polygon is null', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <>
        <RayonForm formId={FORM_ID} mode="create" onSubmit={onSubmit} />
        <ExternalSubmitButton />
      </>
    );

    await user.type(screen.getByLabelText(/nama rayon/i), 'Rayon Baru');
    await selectStaffing(user, /seluruh rayon/i);
    await user.click(screen.getByTestId('place-pin')); // at least one geometry required
    await user.click(screen.getByRole('button', { name: /buat rayon/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'Rayon Baru',
      boundary_polygon: null,
      staffing_level: 'rayon',
    });
  });

  it('reports geometry validity via onValidityChange as the pin/boundary change', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const onValidityChange = jest.fn();
    const user = userEvent.setup();
    render(
      <RayonForm
        formId={FORM_ID}
        mode="create"
        onSubmit={onSubmit}
        onValidityChange={onValidityChange}
      />
    );

    await waitFor(() => expect(onValidityChange).toHaveBeenLastCalledWith(false));

    await user.click(screen.getByTestId('place-pin'));

    await waitFor(() => expect(onValidityChange).toHaveBeenLastCalledWith(true));
  });

  it('includes the drawn boundary_polygon on submit', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <>
        <RayonForm formId={FORM_ID} mode="create" onSubmit={onSubmit} />
        <ExternalSubmitButton />
      </>
    );

    await user.type(screen.getByLabelText(/nama rayon/i), 'Rayon Baru');
    await selectStaffing(user, /per kawasan/i);
    await user.click(screen.getByTestId('draw-polygon'));
    await user.click(screen.getByTestId('place-pin'));
    await user.click(screen.getByRole('button', { name: /buat rayon/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.boundary_polygon).toEqual(expect.objectContaining({ type: 'Polygon' }));
    expect(payload.center_lat).toBeCloseTo(-7.28);
    expect(payload.center_lng).toBeCloseTo(112.74);
    expect(payload.staffing_level).toBe('region');
  });

  it('does not preselect a staffing level on create and blocks submit until chosen', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <>
        <RayonForm formId={FORM_ID} mode="create" onSubmit={onSubmit} />
        <ExternalSubmitButton />
      </>
    );

    // Placeholder shown (no option preselected).
    expect(screen.getByText(/pilih tingkat kebutuhan/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/nama rayon/i), 'Rayon Baru');
    await user.click(screen.getByTestId('place-pin'));
    await user.click(screen.getByRole('button', { name: /buat rayon/i }));

    // Required staffing level not chosen → submit blocked.
    await waitFor(() => expect(screen.getByText(/wajib/i)).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
