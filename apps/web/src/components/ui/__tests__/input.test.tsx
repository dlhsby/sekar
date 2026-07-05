/**
 * Unit Tests: Input Component
 * Tests input variants, states, icons, and accessibility
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../input';
import '@testing-library/jest-dom';

describe('Input Component', () => {
  describe('Basic Rendering', () => {
    it('should render input element', () => {
      render(<Input aria-label="Test input" />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('should render with default value', () => {
      render(<Input defaultValue="Default text" aria-label="Input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('Default text');
    });

    it('should render with controlled value', () => {
      render(<Input value="Controlled" onChange={() => {}} aria-label="Input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('Controlled');
    });
  });

  describe('Input Types', () => {
    it('should render as text input by default', () => {
      render(<Input aria-label="Text input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('should render as password input', () => {
      render(<Input type="password" aria-label="Password" />);
      const input = screen.getByLabelText('Password');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('should render as email input', () => {
      render(<Input type="email" aria-label="Email" />);
      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('should render as number input', () => {
      render(<Input type="number" aria-label="Number" />);
      const input = screen.getByLabelText('Number');
      expect(input).toHaveAttribute('type', 'number');
    });
  });

  describe('Sizes', () => {
    it('should render with default size', () => {
      render(<Input data-testid="input" aria-label="Input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('h-12', 'px-4');
    });

    it('should render with small size', () => {
      render(<Input size="sm" data-testid="input" aria-label="Input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('h-10', 'px-3');
    });

    it('should render with large size', () => {
      render(<Input size="lg" data-testid="input" aria-label="Input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('h-14', 'px-5');
    });
  });

  describe('States', () => {
    it('should render in default state', () => {
      render(<Input data-testid="input" aria-label="Input" />);
      const input = screen.getByTestId('input');
      expect(input).not.toHaveClass('border-nb-danger');
    });

    it('should render in error state', () => {
      render(<Input error="Error message" data-testid="input" aria-label="Input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('border-nb-danger');
    });

    it('should display error message', () => {
      render(<Input error="Field is required" aria-label="Input" />);
      expect(screen.getByText('Field is required')).toBeInTheDocument();
    });

    it('should render in success state', () => {
      render(<Input state="success" data-testid="input" aria-label="Input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('border-nb-success');
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled aria-label="Input" />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should have disabled styles when disabled', () => {
      render(<Input disabled data-testid="input" aria-label="Input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
    });
  });

  describe('Helper Text', () => {
    it('should display helper text', () => {
      render(<Input helperText="Help text" aria-label="Input" />);
      expect(screen.getByText('Help text')).toBeInTheDocument();
    });

    it('should prioritize error over helper text', () => {
      render(<Input error="Error" helperText="Helper" aria-label="Input" />);
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.queryByText('Helper')).not.toBeInTheDocument();
    });

    it('should have correct color for helper text', () => {
      render(<Input helperText="Helper" aria-label="Input" />);
      const helper = screen.getByText('Helper');
      expect(helper).toHaveClass('text-nb-gray-600');
    });

    it('should have correct color for error text', () => {
      render(<Input error="Error" aria-label="Input" />);
      const error = screen.getByText('Error');
      expect(error).toHaveClass('text-nb-danger');
    });
  });

  describe('Icons', () => {
    it('should render left icon', () => {
      const leftIcon = <span data-testid="left-icon">←</span>;
      render(<Input leftIcon={leftIcon} aria-label="Input" />);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('should render right icon', () => {
      const rightIcon = <span data-testid="right-icon">→</span>;
      render(<Input rightIcon={rightIcon} aria-label="Input" />);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('should render both icons', () => {
      const leftIcon = <span data-testid="left-icon">←</span>;
      const rightIcon = <span data-testid="right-icon">→</span>;
      render(<Input leftIcon={leftIcon} rightIcon={rightIcon} aria-label="Input" />);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('should adjust padding with left icon', () => {
      const leftIcon = <span>←</span>;
      render(<Input leftIcon={leftIcon} data-testid="input" aria-label="Input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('pl-10');
    });

    it('should adjust padding with right icon', () => {
      const rightIcon = <span>→</span>;
      render(<Input rightIcon={rightIcon} data-testid="input" aria-label="Input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('pr-10');
    });
  });

  describe('User Interactions', () => {
    it('should handle text input', async () => {
      const user = userEvent.setup();
      render(<Input aria-label="Input" />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Hello World');

      expect(input).toHaveValue('Hello World');
    });

    it('should call onChange handler', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<Input onChange={handleChange} aria-label="Input" />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Test');

      expect(handleChange).toHaveBeenCalled();
    });

    it('should call onFocus handler', async () => {
      const user = userEvent.setup();
      const handleFocus = jest.fn();
      render(<Input onFocus={handleFocus} aria-label="Input" />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('should call onBlur handler', async () => {
      const user = userEvent.setup();
      const handleBlur = jest.fn();
      render(<Input onBlur={handleBlur} aria-label="Input" />);

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.tab();

      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('should not accept input when disabled', async () => {
      const user = userEvent.setup();
      render(<Input disabled defaultValue="Initial" aria-label="Input" />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'New text');

      expect(input).toHaveValue('Initial');
    });
  });

  describe('Accessibility', () => {
    it('should have proper textbox role', () => {
      render(<Input aria-label="Input" />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should support aria-label', () => {
      render(<Input aria-label="Username" />);
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });

    it('should set aria-invalid when error exists', () => {
      render(<Input error="Error" aria-label="Input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should not set aria-invalid when no error', () => {
      render(<Input aria-label="Input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it('should link error message with aria-describedby', () => {
      render(<Input error="Error message" aria-label="Input" />);
      const input = screen.getByRole('textbox');
      // The describedby id is unique per instance and points at the message node.
      const describedBy = input.getAttribute('aria-describedby');
      expect(describedBy).toMatch(/^input-helper-/);
      expect(document.getElementById(describedBy!)).toHaveTextContent('Error message');
    });

    it('should link helper text with aria-describedby', () => {
      render(<Input helperText="Helper text" aria-label="Input" />);
      const input = screen.getByRole('textbox');
      const describedBy = input.getAttribute('aria-describedby');
      expect(describedBy).toMatch(/^input-helper-/);
      expect(document.getElementById(describedBy!)).toHaveTextContent('Helper text');
    });

    it('should have minimum touch target height', () => {
      render(<Input data-testid="input" aria-label="Input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('min-h-[48px]');
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <Input aria-label="First" />
          <Input aria-label="Second" />
        </div>
      );

      const firstInput = screen.getByLabelText('First');
      const secondInput = screen.getByLabelText('Second');

      firstInput.focus();
      expect(firstInput).toHaveFocus();

      await user.tab();
      expect(secondInput).toHaveFocus();
    });
  });

  describe('Custom Props', () => {
    it('should accept custom className', () => {
      render(<Input className="custom-class" data-testid="input" aria-label="Input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('custom-class');
    });

    it('should accept data attributes', () => {
      render(<Input data-testid="custom-input" aria-label="Input" />);
      expect(screen.getByTestId('custom-input')).toBeInTheDocument();
    });

    it('should accept name attribute', () => {
      render(<Input name="username" aria-label="Input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('name', 'username');
    });

    it('should accept required attribute', () => {
      render(<Input required aria-label="Input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('required');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} aria-label="Input" />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });

  describe('Neo Brutalism Styles', () => {
    it('should have thick borders', () => {
      render(<Input data-testid="input" aria-label="Input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('border-2', 'border-nb-black');
    });

    it('should have Neo Brutalism shadow', () => {
      render(<Input data-testid="input" aria-label="Input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('shadow-nb-md');
    });

    it('should have focus visible styles', () => {
      render(<Input data-testid="input" aria-label="Input" />);
      const input = screen.getByTestId('input');
      expect(input.className).toContain('focus-visible');
    });
  });
});
