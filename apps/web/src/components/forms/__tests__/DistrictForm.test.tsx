/**
 * Unit tests: DistrictForm — boundary polygon (optional) + center pin on the
 * unified Google Maps editor (mocked). Submit/Cancel live in the modal's
 * DialogFooter (outside this form), so tests submit via a sibling button
 * wired to the same `formId`, matching how DistrictFormModal renders it.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DistrictForm } from '../DistrictForm';

jest.mock('@/lib/api/districts', () => ({
  checkDistrictName: jest.fn().mockResolvedValue(true),
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

const FORM_ID = 'district-form-test';

/** Mirrors DistrictFormModal: a submit button outside the form, wired via `form`. */
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

describe('DistrictForm', () => {
  it('renders name, map-style colours, description and the boundary editor', () => {
    render(
      <>
        <DistrictForm formId={FORM_ID} mode="create" onSubmit={jest.fn().mockResolvedValue(undefined)} />
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
        <DistrictForm formId={FORM_ID} mode="create" onSubmit={onSubmit} />
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
      staffing_level: 'district',
    });
  });


  it('includes the drawn boundary_polygon on submit', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <>
        <DistrictForm formId={FORM_ID} mode="create" onSubmit={onSubmit} />
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

  it('keeps map-style colours in the submit payload (zod must not strip them)', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    const initialData = {
      id: 'r1',
      name: 'Rayon Lama',
      staffing_level: 'region',
      center_lat: -7.28,
      center_lng: 112.74,
      // Sentinel strings (not real hex) — the lint rule forbids hex literals and
      // the schema only needs a string; we assert the value round-trips.
      border_color: 'border-sentinel',
      fill_color: 'fill-sentinel',
      border_opacity: 0.8,
      fill_opacity: 0.5,
    } as never;
    render(
      <>
        <DistrictForm formId={FORM_ID} mode="edit" initialData={initialData} onSubmit={onSubmit} />
        <ExternalSubmitButton />
      </>
    );

    await user.click(screen.getByRole('button', { name: /buat rayon/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.border_color).toBe('border-sentinel');
    expect(payload.fill_color).toBe('fill-sentinel');
    expect(payload.border_opacity).toBe(0.8);
    expect(payload.fill_opacity).toBe(0.5);
  });

  it('submits an unchanged edit when the API returns STRING opacities (decimal columns)', async () => {
    // TypeORM returns `decimal` columns as strings; the schema validates
    // z.number(), so an unchanged edit must coerce them or it silently blocks.
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    const initialData = {
      id: 'r1',
      name: 'Rayon Lama',
      staffing_level: 'district',
      center_lat: -7.28,
      center_lng: 112.74,
      border_opacity: '0.80',
      fill_opacity: '0.15',
    } as never;
    render(
      <>
        <DistrictForm formId={FORM_ID} mode="edit" initialData={initialData} onSubmit={onSubmit} />
        <ExternalSubmitButton />
      </>
    );

    await user.click(screen.getByRole('button', { name: /buat rayon/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.border_opacity).toBe(0.8);
    expect(payload.fill_opacity).toBe(0.15);
  });

  it('does not preselect a staffing level on create and blocks submit until chosen', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <>
        <DistrictForm formId={FORM_ID} mode="create" onSubmit={onSubmit} />
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
