/**
 * Unit tests: HolidayManagerModal ("Hari Libur & Hari Khusus").
 *
 * Covers the add/delete flow, the in-panel year switcher (which re-scopes the
 * query range and must reset to the calendar year on open), and the canManage
 * gate. The DatePicker is stubbed to a plain input — its calendar popover isn't
 * what these tests are about.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HolidayManagerModal } from '../HolidayManagerModal';
import {
  useSpecialDayOverrides,
  useCreateSpecialDayOverride,
  useDeleteSpecialDayOverride,
} from '@/lib/api/special-day-overrides';

jest.mock('@/lib/api/special-day-overrides', () => ({
  useSpecialDayOverrides: jest.fn(),
  useCreateSpecialDayOverride: jest.fn(),
  useDeleteSpecialDayOverride: jest.fn(),
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

// Stub the DatePicker at its source module (the ui barrel re-exports it), so the
// real Sheet/Select/Input/Button still render. Mocking the barrel itself would
// trip its circular init.
jest.mock('@/components/ui/date-picker', () => ({
  DatePicker: ({
    value,
    onValueChange,
  }: {
    value?: string;
    onValueChange?: (v: string) => void;
  }) => (
    <input
      data-testid="date-picker"
      value={value ?? ''}
      onChange={(e) => onValueChange?.(e.target.value)}
    />
  ),
}));

const createMutate = jest.fn().mockResolvedValue(undefined);
const deleteMutate = jest.fn().mockResolvedValue(undefined);

const rows = [
  { id: 'h-2', date: '2026-08-17', day_type: 'HOLIDAY', name: 'Hari Kemerdekaan' },
  { id: 'h-1', date: '2026-01-01', day_type: 'HOLIDAY', name: 'Tahun Baru' },
];

function setup(
  opts: { rows?: unknown[]; isLoading?: boolean; canManage?: boolean; year?: number } = {}
) {
  const { rows: data = rows, isLoading = false, canManage = true, year = 2026 } = opts;
  (useSpecialDayOverrides as jest.Mock).mockReturnValue({ data, isLoading });
  (useCreateSpecialDayOverride as jest.Mock).mockReturnValue({
    mutateAsync: createMutate,
    isPending: false,
  });
  (useDeleteSpecialDayOverride as jest.Mock).mockReturnValue({ mutateAsync: deleteMutate });
  return render(
    <HolidayManagerModal open onOpenChange={jest.fn()} year={year} canManage={canManage} />
  );
}

beforeEach(() => jest.clearAllMocks());

describe('HolidayManagerModal', () => {
  it('lists the year’s special days sorted by date', () => {
    setup();
    const dates = screen.getAllByText(/^\d{4}-\d{2}-\d{2}$/).map((el) => el.textContent);
    expect(dates).toEqual(['2026-01-01', '2026-08-17']);
    expect(screen.getByText('Tahun Baru')).toBeInTheDocument();
  });

  it('scopes the query to the selected year and re-scopes via the year switcher', async () => {
    const user = userEvent.setup();
    setup({ year: 2026 });
    expect(useSpecialDayOverrides).toHaveBeenCalledWith('2026-01-01', '2026-12-31', true);

    await user.click(screen.getByRole('button', { name: /sebelumnya|prev/i }));
    await waitFor(() =>
      expect(useSpecialDayOverrides).toHaveBeenLastCalledWith('2025-01-01', '2025-12-31', true)
    );
    expect(screen.getByText('2025')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /berikutnya|next/i }));
    await waitFor(() =>
      expect(useSpecialDayOverrides).toHaveBeenLastCalledWith('2026-01-01', '2026-12-31', true)
    );
  });

  it('adds a special day and clears the form', async () => {
    const user = userEvent.setup();
    setup();

    const addBtn = screen.getByRole('button', { name: /^tambah$/i });
    expect(addBtn).toBeDisabled(); // needs both date + type

    await user.type(screen.getByTestId('date-picker'), '2026-12-25');
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Hari Libur' }));
    await user.type(screen.getByPlaceholderText(/nama/i), 'Natal');

    expect(addBtn).toBeEnabled();
    await user.click(addBtn);

    await waitFor(() => expect(createMutate).toHaveBeenCalled());
    expect(createMutate).toHaveBeenCalledWith({
      date: '2026-12-25',
      day_type: 'HOLIDAY',
      name: 'Natal',
    });
    // Form resets so several can be added in a row.
    await waitFor(() => expect(screen.getByTestId('date-picker')).toHaveValue(''));
  });

  it('omits a blank name rather than sending an empty string', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByTestId('date-picker'), '2026-12-25');
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Akhir Pekan' }));
    await user.click(screen.getByRole('button', { name: /^tambah$/i }));

    await waitFor(() => expect(createMutate).toHaveBeenCalled());
    expect(createMutate).toHaveBeenCalledWith({
      date: '2026-12-25',
      day_type: 'WEEKEND',
      name: undefined,
    });
  });

  // `SPECIAL` resolves to DayType.HOLIDAY exactly like `HOLIDAY` and has no
  // capacity tab of its own, so offering it was a choice that silently did
  // nothing. It stays readable (old rows) but is no longer creatable.
  it('does not offer Hari Khusus as a selectable type', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('combobox'));

    expect(await screen.findByRole('option', { name: 'Hari Libur' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Akhir Pekan' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Hari Khusus' })).not.toBeInTheDocument();
  });

  it('still renders the label of a pre-existing SPECIAL entry', async () => {
    setup({
      rows: [{ id: 'h-3', date: '2026-05-31', day_type: 'SPECIAL', name: 'Hari Jadi Surabaya' }],
    });

    expect(screen.getByText('Hari Jadi Surabaya')).toBeInTheDocument();
    expect(screen.getByText('Hari Khusus')).toBeInTheDocument();
  });

  it('deletes an entry by id', async () => {
    const user = userEvent.setup();
    setup();

    const row = screen.getByText('2026-01-01').closest('div')!;
    await user.click(within(row).getByRole('button', { name: /hapus|delete/i }));

    await waitFor(() => expect(deleteMutate).toHaveBeenCalledWith('h-1'));
  });

  it('hides the add form and delete buttons when the user cannot manage', () => {
    setup({ canManage: false });
    expect(screen.queryByTestId('date-picker')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /hapus|delete/i })).not.toBeInTheDocument();
    // Read-only list still renders.
    expect(screen.getByText('2026-01-01')).toBeInTheDocument();
  });

  it('shows the empty state for a year with no entries', () => {
    setup({ rows: [] });
    expect(screen.getByText(/belum ada hari libur/i)).toBeInTheDocument();
  });
});
