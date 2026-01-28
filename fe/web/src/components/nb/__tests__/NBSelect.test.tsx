import { render, screen, fireEvent } from '@testing-library/react';
import { NBSelect } from '../NBSelect';

const mockOptions = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
  { value: '3', label: 'Option 3', disabled: true },
];

describe('NBSelect', () => {
  it('renders with label', () => {
    render(
      <NBSelect label="Status" options={mockOptions} onChange={jest.fn()} />
    );
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('shows placeholder when no value selected', () => {
    render(
      <NBSelect
        label="Status"
        options={mockOptions}
        placeholder="Select option"
        onChange={jest.fn()}
      />
    );
    expect(screen.getByText('Select option')).toBeInTheDocument();
  });

  it('opens dropdown on click', () => {
    render(
      <NBSelect label="Status" options={mockOptions} onChange={jest.fn()} />
    );
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    expect(screen.getByText('Option 1')).toBeInTheDocument();
  });

  it('calls onChange when option selected', () => {
    const handleChange = jest.fn();
    render(
      <NBSelect label="Status" options={mockOptions} onChange={handleChange} />
    );
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Option 1'));
    expect(handleChange).toHaveBeenCalledWith('1');
  });

  it('shows error message', () => {
    render(
      <NBSelect
        label="Status"
        options={mockOptions}
        error="Required"
        onChange={jest.fn()}
      />
    );
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('disables select when disabled prop is true', () => {
    render(
      <NBSelect
        label="Status"
        options={mockOptions}
        disabled
        onChange={jest.fn()}
      />
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('supports multi-select mode', () => {
    const handleChange = jest.fn();
    render(
      <NBSelect
        label="Status"
        options={mockOptions}
        multiple
        onChange={handleChange}
      />
    );
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Option 1'));
    expect(handleChange).toHaveBeenCalledWith(['1']);
  });

  it('filters options when searchable', () => {
    render(
      <NBSelect
        label="Status"
        options={mockOptions}
        searchable
        onChange={jest.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button'));
    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'Option 1' } });
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.queryByText('Option 2')).not.toBeInTheDocument();
  });

  it('closes dropdown on escape key', () => {
    render(
      <NBSelect label="Status" options={mockOptions} onChange={jest.fn()} />
    );
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(screen.queryByText('Option 1')).not.toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(
      <NBSelect
        label="Status"
        options={mockOptions}
        required
        onChange={jest.fn()}
      />
    );
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});
