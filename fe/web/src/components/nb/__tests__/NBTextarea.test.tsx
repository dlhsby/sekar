import { render, screen, fireEvent } from '@testing-library/react';
import { NBTextarea } from '../NBTextarea';

describe('NBTextarea', () => {
  it('renders with label', () => {
    render(<NBTextarea label="Description" />);
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<NBTextarea label="Description" error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('shows success message', () => {
    render(<NBTextarea label="Description" success="Valid" />);
    expect(screen.getByText('Valid')).toBeInTheDocument();
  });

  it('shows character counter', () => {
    render(
      <NBTextarea label="Bio" value="Hello" maxLength={100} showCounter />
    );
    expect(screen.getByText('5/100')).toBeInTheDocument();
  });

  it('handles onChange events', () => {
    const handleChange = jest.fn();
    render(<NBTextarea label="Description" onChange={handleChange} />);
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'New text' },
    });
    expect(handleChange).toHaveBeenCalled();
  });

  it('applies disabled state', () => {
    render(<NBTextarea label="Description" disabled />);
    expect(screen.getByLabelText('Description')).toBeDisabled();
  });

  it('sets default rows', () => {
    render(<NBTextarea label="Description" />);
    expect(screen.getByLabelText('Description')).toHaveAttribute('rows', '4');
  });

  it('applies error border color', () => {
    render(<NBTextarea label="Description" error="Error" />);
    expect(screen.getByLabelText('Description')).toHaveClass('border-nb-danger');
  });

  it('applies success border color', () => {
    render(<NBTextarea label="Description" success="Success" />);
    expect(screen.getByLabelText('Description')).toHaveClass('border-nb-success');
  });

  it('shows required indicator', () => {
    render(<NBTextarea label="Description" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});
