import { render, screen, fireEvent } from '@testing-library/react';
import { NBTable } from '../NBTable';

const mockColumns: Array<{
  key: string;
  title: string;
  sortable?: boolean;
  render?: (val: unknown) => React.ReactNode;
}> = [
  { key: 'name', title: 'Name', sortable: true },
  { key: 'role', title: 'Role' },
  { key: 'status', title: 'Status', render: (val) => String(val).toUpperCase() },
];

const mockData = [
  { id: '1', name: 'John Doe', role: 'Admin', status: 'active' },
  { id: '2', name: 'Jane Smith', role: 'User', status: 'inactive' },
];

describe('NBTable', () => {
  it('renders table with columns and data', () => {
    render(<NBTable columns={mockColumns} data={mockData} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders custom cell content with render function', () => {
    render(<NBTable columns={mockColumns} data={mockData} />);
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('INACTIVE')).toBeInTheDocument();
  });

  it('shows loading skeleton when loading', () => {
    const { container } = render(
      <NBTable columns={mockColumns} data={[]} loading />
    );
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no data', () => {
    render(
      <NBTable
        columns={mockColumns}
        data={[]}
        emptyText="No users found"
      />
    );
    expect(screen.getByText('No users found')).toBeInTheDocument();
  });

  it('renders selection checkboxes when selectable', () => {
    render(
      <NBTable
        columns={mockColumns}
        data={mockData}
        selectable
        selectedRows={[]}
        onSelectionChange={jest.fn()}
      />
    );
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(3); // 1 header + 2 rows
  });

  it('calls onSelectionChange when row selected', () => {
    const handleSelection = jest.fn();
    render(
      <NBTable
        columns={mockColumns}
        data={mockData}
        selectable
        selectedRows={[]}
        onSelectionChange={handleSelection}
      />
    );
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // Click first row
    expect(handleSelection).toHaveBeenCalledWith(['1']);
  });

  it('selects all rows when header checkbox clicked', () => {
    const handleSelection = jest.fn();
    render(
      <NBTable
        columns={mockColumns}
        data={mockData}
        selectable
        selectedRows={[]}
        onSelectionChange={handleSelection}
      />
    );
    const headerCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(headerCheckbox);
    expect(handleSelection).toHaveBeenCalledWith(['1', '2']);
  });

  it('handles row click when onRowClick provided', () => {
    const handleRowClick = jest.fn();
    render(
      <NBTable
        columns={mockColumns}
        data={mockData}
        onRowClick={handleRowClick}
      />
    );
    fireEvent.click(screen.getByText('John Doe'));
    expect(handleRowClick).toHaveBeenCalledWith(mockData[0]);
  });

  it('handles sorting when sortable column clicked', () => {
    const handleSort = jest.fn();
    render(
      <NBTable
        columns={mockColumns}
        data={mockData}
        onSort={handleSort}
      />
    );
    fireEvent.click(screen.getByText('Name'));
    expect(handleSort).toHaveBeenCalledWith('name', 'asc');
  });

  it('applies alternating row backgrounds', () => {
    const { container } = render(
      <NBTable columns={mockColumns} data={mockData} />
    );
    const rows = container.querySelectorAll('tbody tr');
    expect(rows[1]).toHaveClass('bg-nb-gray-50');
  });
});
