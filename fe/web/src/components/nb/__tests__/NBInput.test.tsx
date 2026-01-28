import { render, screen, fireEvent } from '@testing-library/react';
import { NBInput } from '../NBInput';

describe('NBInput', () => {
  describe('Rendering', () => {
    it('renders with label', () => {
      render(<NBInput label="Email" />);
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('renders with placeholder', () => {
      render(<NBInput label="Email" placeholder="Enter email" />);
      expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument();
    });

    it('shows required indicator', () => {
      render(<NBInput label="Email" required />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('renders with helper text', () => {
      render(<NBInput label="Email" helperText="Enter your email address" />);
      expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    });

    it('renders with left icon', () => {
      render(
        <NBInput label="Email" leftIcon={<span data-testid="icon">@</span>} />
      );
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('renders with right icon', () => {
      render(
        <NBInput label="Email" rightIcon={<span data-testid="icon">✓</span>} />
      );
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('renders with left text', () => {
      render(<NBInput label="Price" leftText="Rp" />);
      expect(screen.getByText('Rp')).toBeInTheDocument();
    });

    it('renders with right text', () => {
      render(<NBInput label="Price" rightText=".00" />);
      expect(screen.getByText('.00')).toBeInTheDocument();
    });
  });

  describe('States', () => {
    it('shows error message', () => {
      render(<NBInput label="Email" error="Email is required" />);
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('shows success message', () => {
      render(<NBInput label="Email" success="Email is valid" />);
      expect(screen.getByText('Email is valid')).toBeInTheDocument();
    });

    it('applies error border color', () => {
      render(<NBInput label="Email" error="Error" />);
      const input = screen.getByLabelText('Email');
      expect(input).toHaveClass('border-nb-danger');
    });

    it('applies success border color', () => {
      render(<NBInput label="Email" success="Success" />);
      const input = screen.getByLabelText('Email');
      expect(input).toHaveClass('border-nb-success');
    });

    it('applies disabled state', () => {
      render(<NBInput label="Email" disabled />);
      expect(screen.getByLabelText('Email')).toBeDisabled();
    });
  });

  describe('Character Counter', () => {
    it('shows character counter when enabled', () => {
      render(
        <NBInput label="Bio" value="Hello" maxLength={100} showCounter />
      );
      expect(screen.getByText('5/100')).toBeInTheDocument();
    });

    it('updates counter on value change', () => {
      const { rerender } = render(
        <NBInput label="Bio" value="Hello" maxLength={100} showCounter />
      );
      expect(screen.getByText('5/100')).toBeInTheDocument();

      rerender(
        <NBInput label="Bio" value="Hello World" maxLength={100} showCounter />
      );
      expect(screen.getByText('11/100')).toBeInTheDocument();
    });

    it('does not show counter when not enabled', () => {
      render(<NBInput label="Bio" value="Hello" maxLength={100} />);
      expect(screen.queryByText('5/100')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('handles onChange events', () => {
      const handleChange = jest.fn();
      render(<NBInput label="Email" onChange={handleChange} />);
      const input = screen.getByLabelText('Email');
      fireEvent.change(input, { target: { value: 'test@example.com' } });
      expect(handleChange).toHaveBeenCalled();
    });

    it('handles onFocus events', () => {
      const handleFocus = jest.fn();
      render(<NBInput label="Email" onFocus={handleFocus} />);
      const input = screen.getByLabelText('Email');
      fireEvent.focus(input);
      expect(handleFocus).toHaveBeenCalled();
    });

    it('handles onBlur events', () => {
      const handleBlur = jest.fn();
      render(<NBInput label="Email" onBlur={handleBlur} />);
      const input = screen.getByLabelText('Email');
      fireEvent.blur(input);
      expect(handleBlur).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('associates label with input', () => {
      render(<NBInput label="Email" />);
      const input = screen.getByLabelText('Email');
      expect(input).toBeInTheDocument();
    });

    it('sets aria-invalid when error', () => {
      render(<NBInput label="Email" error="Error" />);
      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('sets aria-describedby for error', () => {
      render(<NBInput label="Email" error="Email is required" />);
      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('aria-describedby');
    });

    it('sets aria-describedby for helper text', () => {
      render(<NBInput label="Email" helperText="Helper text" />);
      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('aria-describedby');
    });

    it('forwards ref correctly', () => {
      const ref = jest.fn();
      render(<NBInput label="Email" ref={ref} />);
      expect(ref).toHaveBeenCalled();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      render(<NBInput label="Email" className="custom-class" />);
      expect(screen.getByLabelText('Email')).toHaveClass('custom-class');
    });

    it('applies left padding when leftIcon or leftText', () => {
      render(<NBInput label="Email" leftText="@" />);
      expect(screen.getByLabelText('Email')).toHaveClass('pl-12');
    });

    it('applies right padding when rightIcon or rightText', () => {
      render(<NBInput label="Email" rightText="✓" />);
      expect(screen.getByLabelText('Email')).toHaveClass('pr-12');
    });
  });
});
