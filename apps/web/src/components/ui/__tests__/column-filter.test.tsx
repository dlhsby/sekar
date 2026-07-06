/**
 * Unit Tests: enum column filter windowing
 * A long option list (e.g. Area, 100+ rows) renders only a window of matches
 * at a time — grows on scroll-near-bottom, resets on search — instead of
 * mounting every checkbox row up front.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DataTable, type ColumnDef } from '../data-table';

interface Row {
  id: string;
  area: string;
}

const AREA_COUNT = 25;
const options = Array.from({ length: AREA_COUNT }, (_, i) => ({
  value: `Area ${String(i + 1).padStart(2, '0')}`,
  label: `Area ${String(i + 1).padStart(2, '0')}`,
}));

const mockData: Row[] = options.map((o, i) => ({ id: String(i), area: o.value }));

const columns: ColumnDef<Row>[] = [
  {
    id: 'area',
    accessorKey: 'area',
    header: 'Area',
    meta: { label: 'Area', filterVariant: 'enum', filterOptions: options },
  },
];

async function openAreaFilterPopover(): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByTitle(/filter/i));
  await user.click(screen.getByRole('button', { name: /filter area/i }));
}

describe('EnumColumnFilter windowing', () => {
  it('renders only the first page of options up front', async () => {
    render(<DataTable columns={columns} data={mockData} getRowId={(r) => r.id} />);
    await openAreaFilterPopover();

    expect(screen.getAllByRole('checkbox')).toHaveLength(10);
  });

  it('reveals more options as the list is scrolled near the bottom', async () => {
    render(<DataTable columns={columns} data={mockData} getRowId={(r) => r.id} />);
    await openAreaFilterPopover();

    const list = screen.getAllByRole('checkbox')[0].closest('div[class*="overflow-y-auto"]');
    expect(list).toBeTruthy();
    if (!list) return;

    Object.defineProperty(list, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(list, 'clientHeight', { value: 200, configurable: true });
    Object.defineProperty(list, 'scrollTop', { value: 900, configurable: true });
    fireEvent.scroll(list);

    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(10);
  });

  it('resets the window when the search narrows the list', async () => {
    render(<DataTable columns={columns} data={mockData} getRowId={(r) => r.id} />);
    await openAreaFilterPopover();

    const list = screen.getAllByRole('checkbox')[0].closest('div[class*="overflow-y-auto"]');
    if (list) {
      Object.defineProperty(list, 'scrollHeight', { value: 1000, configurable: true });
      Object.defineProperty(list, 'clientHeight', { value: 200, configurable: true });
      Object.defineProperty(list, 'scrollTop', { value: 900, configurable: true });
      fireEvent.scroll(list);
    }
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(10);

    const user = userEvent.setup();
    const search = screen.getByPlaceholderText(/cari opsi|search options/i);
    await user.type(search, 'Area 0');

    // "Area 01".."Area 09" = 9 matches, all fit in the first page.
    expect(screen.getAllByRole('checkbox')).toHaveLength(9);
  });
});
