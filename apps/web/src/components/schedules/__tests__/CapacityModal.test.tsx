/**
 * Unit tests: CapacityModal ("Atur Kapasitas").
 *
 * The contract that matters: a requirement is stored per
 * (subject, shift, role, day_type) — editing Hari Kerja must NOT touch Akhir
 * Pekan / Hari Libur — and Save must persist ALL three day types for every
 * shift × role so a cleared value is written as 0 rather than left stale.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CapacityModal } from '../CapacityModal';
import { useShiftDefinitions } from '@/lib/api/shift-definitions';
import {
  useSubjectStaffRequirements,
  useSetSubjectStaffRequirements,
} from '@/lib/api/location-staff-requirements';

jest.mock('@/lib/api/shift-definitions', () => ({ useShiftDefinitions: jest.fn() }));
jest.mock('@/lib/api/location-staff-requirements', () => ({
  useSubjectStaffRequirements: jest.fn(),
  useSetSubjectStaffRequirements: jest.fn(),
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const SHIFT_1 = 'shift-1';
const SHIFT_2 = 'shift-2';
const SUBJECT = { type: 'region' as const, id: 'reg-1', name: 'Kawasan Banyu Urip' };

const shifts = [
  { id: SHIFT_1, name: 'Shift 1', start_time: '06:00:00', end_time: '15:00:00' },
  { id: SHIFT_2, name: 'Shift 2', start_time: '15:00:00', end_time: '23:00:00' },
];

/** Existing rows: distinct values per day_type so cross-talk is detectable. */
const existingRows = [
  { shift_definition_id: SHIFT_1, role: 'satgas', day_type: 'WEEKDAY', required_count: 10 },
  { shift_definition_id: SHIFT_1, role: 'linmas', day_type: 'WEEKDAY', required_count: 2 },
  { shift_definition_id: SHIFT_1, role: 'satgas', day_type: 'WEEKEND', required_count: 5 },
  { shift_definition_id: SHIFT_1, role: 'satgas', day_type: 'HOLIDAY', required_count: 1 },
];

const mutateAsync = jest.fn().mockResolvedValue(undefined);

function setup(rows: unknown[] = existingRows, isLoading = false) {
  (useShiftDefinitions as jest.Mock).mockReturnValue({ data: shifts });
  (useSubjectStaffRequirements as jest.Mock).mockReturnValue({ data: rows, isLoading });
  (useSetSubjectStaffRequirements as jest.Mock).mockReturnValue({
    mutateAsync,
    isPending: false,
  });
  return render(<CapacityModal open onOpenChange={jest.fn()} subject={SUBJECT} />);
}

/** The stepper row for a role inside a shift card — returns its readout + buttons. */
function stepper(shiftName: string, role: RegExp) {
  const card = screen.getByText(shiftName).closest('div')!.parentElement!;
  const row = within(card).getByText(role).parentElement!;
  return {
    value: () => within(row).getByText(/^\d+$/).textContent,
    inc: () => within(row).getByRole('button', { name: /increase|tambah/i }),
    dec: () => within(row).getByRole('button', { name: /decrease|kurang/i }),
  };
}

beforeEach(() => jest.clearAllMocks());

describe('CapacityModal', () => {
  it('seeds each day-type tab from the existing requirements', async () => {
    const user = userEvent.setup();
    setup();

    // Hari Kerja (default tab) → satgas 10 / linmas 2
    expect(stepper('Shift 1', /satgas/i).value()).toBe('10');
    expect(stepper('Shift 1', /linmas/i).value()).toBe('2');

    // Akhir Pekan → satgas 5 (its own row, not the weekday value)
    await user.click(screen.getByRole('tab', { name: 'Akhir Pekan' }));
    expect(stepper('Shift 1', /satgas/i).value()).toBe('5');

    // Hari Libur → satgas 1
    await user.click(screen.getByRole('tab', { name: 'Hari Libur' }));
    expect(stepper('Shift 1', /satgas/i).value()).toBe('1');
  });

  it('editing one day type does not change the others', async () => {
    const user = userEvent.setup();
    setup();

    // Bump Hari Kerja satgas 10 → 11
    await user.click(stepper('Shift 1', /satgas/i).inc());
    expect(stepper('Shift 1', /satgas/i).value()).toBe('11');

    // Akhir Pekan is untouched…
    await user.click(screen.getByRole('tab', { name: 'Akhir Pekan' }));
    expect(stepper('Shift 1', /satgas/i).value()).toBe('5');

    // …and Hari Kerja kept the edit.
    await user.click(screen.getByRole('tab', { name: 'Hari Kerja' }));
    expect(stepper('Shift 1', /satgas/i).value()).toBe('11');
  });

  it('saves every day type × shift × role (so cleared values persist as 0)', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: /simpan|save/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    const { subject, items } = mutateAsync.mock.calls[0][0];
    expect(subject).toEqual(SUBJECT);
    // 3 day types × 2 shifts × 2 roles
    expect(items).toHaveLength(12);
    expect(items).toContainEqual({
      shift_definition_id: SHIFT_1,
      role: 'satgas',
      day_type: 'WEEKDAY',
      required_count: 10,
    });
    expect(items).toContainEqual({
      shift_definition_id: SHIFT_1,
      role: 'satgas',
      day_type: 'WEEKEND',
      required_count: 5,
    });
    expect(items).toContainEqual({
      shift_definition_id: SHIFT_1,
      role: 'satgas',
      day_type: 'HOLIDAY',
      required_count: 1,
    });
    // A shift with no stored row is written as 0, not omitted.
    expect(items).toContainEqual({
      shift_definition_id: SHIFT_2,
      role: 'linmas',
      day_type: 'HOLIDAY',
      required_count: 0,
    });
  });

  it('persists an edit made on the Hari Libur tab', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('tab', { name: 'Hari Libur' }));
    await user.click(stepper('Shift 1', /satgas/i).inc()); // 1 → 2
    await user.click(screen.getByRole('button', { name: /simpan|save/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    const { items } = mutateAsync.mock.calls[0][0];
    expect(items).toContainEqual({
      shift_definition_id: SHIFT_1,
      role: 'satgas',
      day_type: 'HOLIDAY',
      required_count: 2,
    });
    // Weekday untouched.
    expect(items).toContainEqual({
      shift_definition_id: SHIFT_1,
      role: 'satgas',
      day_type: 'WEEKDAY',
      required_count: 10,
    });
  });

  it('clamps the stepper at 0 (decrease disabled)', async () => {
    setup([]);
    expect(stepper('Shift 1', /satgas/i).value()).toBe('0');
    expect(stepper('Shift 1', /satgas/i).dec()).toBeDisabled();
  });

  it('shows a loading state instead of zeroed steppers while fetching', () => {
    setup([], true);
    expect(screen.getByText(/loading|memuat/i)).toBeInTheDocument();
  });
});
