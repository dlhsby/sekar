/**
 * Unit Tests: DataTable
 * Tests data table component with sorting, selection, and rendering
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, DataTableColumn } from '../data-table';

interface TestData extends Record<string, unknown> {
  id: string;
  name: string;
  age: number;
  email: string;
}

describe('DataTable', () => {
  const mockData: TestData[] = [
    { id: '1', name: 'Alice', age: 30, email: 'alice@example.com' },
    { id: '2', name: 'Bob', age: 25, email: 'bob@example.com' },
    { id: '3', name: 'Charlie', age: 35, email: 'charlie@example.com' },
  ];

  const basicColumns: DataTableColumn<TestData>[] = [
    { key: 'name', title: 'Name' },
    { key: 'age', title: 'Age' },
    { key: 'email', title: 'Email' },
  ];

  it('should render table with data', () => {
    render(<DataTable columns={basicColumns} data={mockData} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('should render column headers', () => {
    render(<DataTable columns={basicColumns} data={mockData} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('should use header alias for column title', () => {
    const columns: DataTableColumn<TestData>[] = [{ key: 'name', header: 'Full Name' }];

    render(<DataTable columns={columns} data={mockData} />);

    expect(screen.getByText('Full Name')).toBeInTheDocument();
  });

  it('should use key as title when no title/header provided', () => {
    const columns: DataTableColumn<TestData>[] = [{ key: 'name' }];

    render(<DataTable columns={columns} data={mockData} />);

    expect(screen.getByText('name')).toBeInTheDocument();
  });

  it('should render custom cells with render function', () => {
    const columns: DataTableColumn<TestData>[] = [
      {
        key: 'name',
        title: 'Name',
        render: (value) => `Custom: ${value}`,
      },
    ];

    render(<DataTable columns={columns} data={mockData} />);

    expect(screen.getByText('Custom: Alice')).toBeInTheDocument();
  });

  it('should support cell alias for render function', () => {
    const columns: DataTableColumn<TestData>[] = [
      {
        key: 'name',
        title: 'Name',
        cell: (row) => row.name.toUpperCase(),
      },
    ];

    render(<DataTable columns={columns} data={mockData} />);

    expect(screen.getByText('ALICE')).toBeInTheDocument();
  });

  it('should display empty state when no data', () => {
    render(<DataTable columns={basicColumns} data={[]} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('should display custom empty message', () => {
    render(<DataTable columns={basicColumns} data={[]} emptyText="No users found" />);

    expect(screen.getByText('No users found')).toBeInTheDocument();
  });

  it('should support emptyMessage alias', () => {
    render(<DataTable columns={basicColumns} data={[]} emptyMessage="Nothing here" />);

    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('should display loading state with skeletons', () => {
    render(<DataTable columns={basicColumns} data={[]} loading />);

    const skeletons = screen
      .getAllByRole('row')
      .filter((row) => row.querySelector('.animate-pulse'));
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should not show data when loading', () => {
    render(<DataTable columns={basicColumns} data={mockData} loading />);

    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('should render sortable column headers', () => {
    const columns: DataTableColumn<TestData>[] = [
      { key: 'name', title: 'Name', sortable: true },
      { key: 'age', title: 'Age', sortable: true },
    ];

    render(<DataTable columns={columns} data={mockData} />);

    const nameHeader = screen.getByText('Name').closest('th');
    expect(nameHeader).toHaveClass('cursor-pointer');
  });

  it('should call onSort when clicking sortable column', async () => {
    const onSort = jest.fn();
    const columns: DataTableColumn<TestData>[] = [{ key: 'name', title: 'Name', sortable: true }];

    const user = userEvent.setup();
    render(<DataTable columns={columns} data={mockData} onSort={onSort} />);

    await user.click(screen.getByText('Name'));

    expect(onSort).toHaveBeenCalledWith('name', 'asc');
  });

  it('should toggle sort direction on multiple clicks', async () => {
    const onSort = jest.fn();
    const columns: DataTableColumn<TestData>[] = [{ key: 'name', title: 'Name', sortable: true }];

    const user = userEvent.setup();
    render(<DataTable columns={columns} data={mockData} onSort={onSort} />);

    const nameHeader = screen.getByText('Name');

    await user.click(nameHeader); // asc
    expect(onSort).toHaveBeenCalledWith('name', 'asc');

    await user.click(nameHeader); // desc
    expect(onSort).toHaveBeenCalledWith('name', 'desc');
  });

  it('should render selection checkboxes when selectable', () => {
    render(<DataTable columns={basicColumns} data={mockData} selectable />);

    expect(screen.getByLabelText('Select all rows')).toBeInTheDocument();
    expect(screen.getByLabelText('Select row 1')).toBeInTheDocument();
  });

  it('should handle row selection', async () => {
    const onSelectionChange = jest.fn();
    const user = userEvent.setup();

    render(
      <DataTable
        columns={basicColumns}
        data={mockData}
        selectable
        selectedRows={[]}
        onSelectionChange={onSelectionChange}
      />
    );

    await user.click(screen.getByLabelText('Select row 1'));

    expect(onSelectionChange).toHaveBeenCalledWith(['1']);
  });

  it('should handle select all', async () => {
    const onSelectionChange = jest.fn();
    const user = userEvent.setup();

    render(
      <DataTable
        columns={basicColumns}
        data={mockData}
        selectable
        selectedRows={[]}
        onSelectionChange={onSelectionChange}
      />
    );

    await user.click(screen.getByLabelText('Select all rows'));

    expect(onSelectionChange).toHaveBeenCalledWith(['1', '2', '3']);
  });

  it('should handle deselect all when all selected', async () => {
    const onSelectionChange = jest.fn();
    const user = userEvent.setup();

    render(
      <DataTable
        columns={basicColumns}
        data={mockData}
        selectable
        selectedRows={['1', '2', '3']}
        onSelectionChange={onSelectionChange}
      />
    );

    await user.click(screen.getByLabelText('Select all rows'));

    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });

  it('should call onRowClick when row is clicked', async () => {
    const onRowClick = jest.fn();
    const user = userEvent.setup();

    render(<DataTable columns={basicColumns} data={mockData} onRowClick={onRowClick} />);

    await user.click(screen.getByText('Alice'));

    expect(onRowClick).toHaveBeenCalledWith(mockData[0]);
  });

  it('should use custom rowKey', () => {
    const customData = [
      { customId: 'a', name: 'Alice' },
      { customId: 'b', name: 'Bob' },
    ];

    const columns: DataTableColumn<(typeof customData)[0]>[] = [{ key: 'name', title: 'Name' }];

    render(
      <DataTable
        columns={columns}
        data={customData}
        rowKey="customId"
        selectable
        selectedRows={['a']}
      />
    );

    const checkbox = screen.getByLabelText('Select row a') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('should apply column alignment classes', () => {
    const columns: DataTableColumn<TestData>[] = [
      { key: 'name', title: 'Name', align: 'left' },
      { key: 'age', title: 'Age', align: 'center' },
      { key: 'email', title: 'Email', align: 'right' },
    ];

    render(<DataTable columns={columns} data={mockData} />);

    // Check the div inside the th has justify-center for center alignment
    const ageHeader = screen.getByText('Age');
    expect(ageHeader.parentElement).toHaveClass('justify-center');
  });

  it('should apply custom width to columns', () => {
    const columns: DataTableColumn<TestData>[] = [{ key: 'name', title: 'Name', width: '200px' }];

    render(<DataTable columns={columns} data={mockData} />);

    const nameHeader = screen.getByText('Name').closest('th');
    expect(nameHeader).toHaveStyle({ width: '200px' });
  });

  it('should apply custom className', () => {
    const { container } = render(
      <DataTable columns={basicColumns} data={mockData} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should show indeterminate checkbox state when some selected', () => {
    render(<DataTable columns={basicColumns} data={mockData} selectable selectedRows={['1']} />);

    const selectAll = screen.getByLabelText('Select all rows') as HTMLInputElement;
    expect(selectAll.indeterminate).toBe(true);
  });

  it('should alternate row colors', () => {
    const { container } = render(<DataTable columns={basicColumns} data={mockData} />);

    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0]).not.toHaveClass('bg-nb-gray-50');
    expect(rows[1]).toHaveClass('bg-nb-gray-50');
    expect(rows[2]).not.toHaveClass('bg-nb-gray-50');
  });

  it('should not call onSort when clicking non-sortable column', async () => {
    const onSort = jest.fn();
    const columns: DataTableColumn<TestData>[] = [{ key: 'name', title: 'Name', sortable: false }];

    const user = userEvent.setup();
    render(<DataTable columns={columns} data={mockData} onSort={onSort} />);

    await user.click(screen.getByText('Name'));

    expect(onSort).not.toHaveBeenCalled();
  });

  it('should handle selection change when checkbox clicked', async () => {
    const onSelectionChange = jest.fn();
    const user = userEvent.setup();

    render(
      <DataTable
        columns={basicColumns}
        data={mockData}
        selectable
        selectedRows={[]}
        onSelectionChange={onSelectionChange}
      />
    );

    const checkbox = screen.getByLabelText('Select row 1');
    await user.click(checkbox);

    // Checkbox click should update selection
    expect(onSelectionChange).toHaveBeenCalledWith(['1']);
  });
});
