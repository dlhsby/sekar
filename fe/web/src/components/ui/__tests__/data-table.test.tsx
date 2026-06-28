/**
 * Unit Tests: DataTable (TanStack-based)
 * Covers rendering, custom cells, empty/loading states, client sorting,
 * global search, row click, pinned columns, pagination and column toggle.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DataTable, type ColumnDef } from '../data-table';

interface TestData {
  id: string;
  name: string;
  age: number;
  email: string;
}

const mockData: TestData[] = [
  { id: '1', name: 'Alice', age: 30, email: 'alice@example.com' },
  { id: '2', name: 'Bob', age: 25, email: 'bob@example.com' },
  { id: '3', name: 'Charlie', age: 35, email: 'charlie@example.com' },
];

const basicColumns: ColumnDef<TestData>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', enableSorting: true, meta: { label: 'Name' } },
  { id: 'age', accessorKey: 'age', header: 'Age', enableSorting: true, meta: { label: 'Age' } },
  { id: 'email', accessorKey: 'email', header: 'Email', meta: { label: 'Email' } },
];

/** Names rendered in tbody, in DOM order (desktop table). */
function bodyNames(): string[] {
  const table = document.querySelector('table');
  const cells = table?.querySelectorAll('tbody tr td:first-child') ?? [];
  return Array.from(cells).map((c) => c.textContent ?? '');
}

describe('DataTable', () => {
  it('renders data rows', () => {
    render(<DataTable columns={basicColumns} data={mockData} getRowId={(r) => r.id} />);
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bob').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Charlie').length).toBeGreaterThan(0);
  });

  it('renders column headers', () => {
    render(<DataTable columns={basicColumns} data={mockData} getRowId={(r) => r.id} />);
    // Labels appear in the desktop header AND the mobile card list; assert present.
    expect(screen.getAllByText('Name').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Age').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Email').length).toBeGreaterThan(0);
  });

  it('renders custom cells', () => {
    const columns: ColumnDef<TestData>[] = [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        meta: { label: 'Name' },
        cell: ({ row }) => `Custom: ${row.original.name}`,
      },
    ];
    render(<DataTable columns={columns} data={mockData} getRowId={(r) => r.id} />);
    expect(screen.getAllByText('Custom: Alice').length).toBeGreaterThan(0);
  });

  it('shows the empty state with a custom title', () => {
    render(
      <DataTable columns={basicColumns} data={[]} getRowId={(r) => r.id} emptyTitle="No users found" />
    );
    expect(screen.getAllByText('No users found').length).toBeGreaterThan(0);
  });

  it('shows the no-results state when a search matches nothing', async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        columns={basicColumns}
        data={mockData}
        getRowId={(r) => r.id}
        searchPlaceholder="Cari"
      />
    );
    await user.type(screen.getByLabelText('Cari'), 'zzzzz');
    await waitFor(() =>
      expect(screen.getAllByText('Tidak Ditemukan').length).toBeGreaterThan(0)
    );
  });

  it('renders loading skeletons and hides data', () => {
    render(<DataTable columns={basicColumns} data={mockData} loading getRowId={(r) => r.id} />);
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('renders an error state with a retry action', async () => {
    const onRetry = jest.fn();
    const user = userEvent.setup();
    render(<DataTable columns={basicColumns} data={[]} error onRetry={onRetry} getRowId={(r) => r.id} />);
    const retry = screen.getAllByRole('button', { name: 'Coba Lagi' })[0];
    await user.click(retry);
    expect(onRetry).toHaveBeenCalled();
  });

  it('sorts client-side when a sortable header is clicked', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={basicColumns} data={mockData} getRowId={(r) => r.id} />);
    // Initial DOM order matches data order.
    expect(bodyNames()).toEqual(['Alice', 'Bob', 'Charlie']);
    // Numeric columns sort descending-first (TanStack default) → 35, 30, 25.
    await user.click(screen.getByRole('button', { name: /Age/ }));
    await waitFor(() => expect(bodyNames()).toEqual(['Charlie', 'Alice', 'Bob']));
    // Toggle to ascending → 25, 30, 35.
    await user.click(screen.getByRole('button', { name: /Age/ }));
    await waitFor(() => expect(bodyNames()).toEqual(['Bob', 'Alice', 'Charlie']));
  });

  it('filters rows via global search', async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        columns={basicColumns}
        data={mockData}
        getRowId={(r) => r.id}
        searchPlaceholder="Cari"
      />
    );
    await user.type(screen.getByLabelText('Cari'), 'Bob');
    await waitFor(() => expect(bodyNames()).toEqual(['Bob']));
  });

  it('calls onRowClick with the row data', async () => {
    const onRowClick = jest.fn();
    const user = userEvent.setup();
    render(
      <DataTable columns={basicColumns} data={mockData} getRowId={(r) => r.id} onRowClick={onRowClick} />
    );
    await user.click(screen.getAllByText('Alice')[0]);
    expect(onRowClick).toHaveBeenCalledWith(mockData[0]);
  });

  it('pins a column flagged meta.pinRight as sticky', () => {
    const columns: ColumnDef<TestData>[] = [
      { id: 'name', accessorKey: 'name', header: 'Name', meta: { label: 'Name' } },
      {
        id: 'actions',
        header: 'Aksi',
        enableColumnFilter: false,
        meta: { label: 'Aksi', pinRight: true },
        cell: () => <button type="button">Edit</button>,
      },
    ];
    render(<DataTable columns={columns} data={mockData} getRowId={(r) => r.id} />);
    const desktop = document.querySelector('table') as HTMLElement;
    const firstActionCell = within(desktop)
      .getAllByRole('button', { name: 'Edit' })[0]
      .closest('td');
    expect(firstActionCell).toHaveClass('sticky');
    expect(firstActionCell).toHaveClass('right-0');
  });

  it('renders the pagination bar by default and hides it when disabled', () => {
    const { rerender } = render(
      <DataTable columns={basicColumns} data={mockData} getRowId={(r) => r.id} />
    );
    expect(screen.getByText(/Menampilkan/)).toBeInTheDocument();
    rerender(
      <DataTable columns={basicColumns} data={mockData} getRowId={(r) => r.id} enablePagination={false} />
    );
    expect(screen.queryByText(/Menampilkan/)).not.toBeInTheDocument();
  });

  it('applies a custom className to the root', () => {
    const { container } = render(
      <DataTable
        columns={basicColumns}
        data={mockData}
        getRowId={(r) => r.id}
        className="custom-class"
      />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders the column-toggle control by default', () => {
    render(<DataTable columns={basicColumns} data={mockData} getRowId={(r) => r.id} />);
    expect(screen.getByRole('button', { name: /Kolom/ })).toBeInTheDocument();
  });

  describe('rowActions (... menu)', () => {
    it('renders a kebab trigger per row and fires the chosen action', async () => {
      const onView = jest.fn();
      const user = userEvent.setup();
      render(
        <DataTable
          columns={basicColumns}
          data={mockData}
          getRowId={(r) => r.id}
          rowActions={(row) => [
            { key: 'view', label: 'Lihat', onClick: () => onView(row.id) },
            { key: 'del', label: 'Hapus', variant: 'danger', onClick: () => {} },
          ]}
        />
      );
      const triggers = screen.getAllByRole('button', { name: 'Aksi baris' });
      expect(triggers).toHaveLength(mockData.length);
      await user.click(triggers[0]);
      await user.click(await screen.findByRole('menuitem', { name: 'Lihat' }));
      expect(onView).toHaveBeenCalledWith('1');
    });

    it('omits hidden actions and disables disabled ones', async () => {
      const user = userEvent.setup();
      render(
        <DataTable
          columns={basicColumns}
          data={mockData}
          getRowId={(r) => r.id}
          rowActions={() => [
            { key: 'view', label: 'Lihat', onClick: () => {} },
            { key: 'edit', label: 'Ubah', disabled: true, onClick: () => {} },
            { key: 'secret', label: 'Rahasia', hidden: true, onClick: () => {} },
          ]}
        />
      );
      await user.click(screen.getAllByRole('button', { name: 'Aksi baris' })[0]);
      expect(await screen.findByRole('menuitem', { name: 'Lihat' })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: 'Rahasia' })).not.toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Ubah' })).toHaveAttribute(
        'aria-disabled',
        'true'
      );
    });
  });

  it('honours defaultPageSize', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: String(i),
      name: `Person ${i}`,
      age: 20 + i,
      email: `p${i}@x.com`,
    }));
    render(
      <DataTable columns={basicColumns} data={many} getRowId={(r) => r.id} defaultPageSize={5} />
    );
    // 5 of 12 on the first page → range shows 1–5.
    expect(screen.getByText(/Menampilkan 1–5 dari 12/)).toBeInTheDocument();
  });
});
