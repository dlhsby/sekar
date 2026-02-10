/**
 * Unit Tests: FormInput Component
 * Tests form input with label, validation, and accessibility
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormInput } from '../form-input';
import '@testing-library/jest-dom';

describe('FormInput Component', () => {
  describe('Basic Rendering', () => {
    it('should render label and input', () => {
      render(<FormInput label="Username" />);
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<FormInput label="Email" placeholder="Enter email" />);
      expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument();
    });

    it('should link label to input with htmlFor/id', () => {
      render(<FormInput label="Password" />);
      const label = screen.getByText('Password');
      const input = screen.getByLabelText('Password');
      expect(label).toHaveAttribute('for', input.id);
    });

    it('should use custom id when provided', () => {
      render(<FormInput label="Custom" id="custom-id" />);
      const input = screen.getByLabelText('Custom');
      expect(input).toHaveAttribute('id', 'custom-id');
    });

    it('should generate unique id when not provided', () => {
      render(
        <>
          <FormInput label="First" />
          <FormInput label="Second" />
        </>
      );
      const firstInput = screen.getByLabelText('First');
      const secondInput = screen.getByLabelText('Second');
      expect(firstInput.id).not.toBe(secondInput.id);
    });
  });

  describe('Required Field', () => {
    it('should show required indicator when required prop is true', () => {
      render(<FormInput label="Required Field" required />);
      const asterisk = screen.getByText('*');
      expect(asterisk).toBeInTheDocument();
      expect(asterisk).toHaveClass('text-nb-danger');
    });

    it('should not show required indicator by default', () => {
      render(<FormInput label="Optional Field" />);
      const asterisk = screen.queryByText('*');
      expect(asterisk).not.toBeInTheDocument();
    });

    it('should set required attribute on input', () => {
      render(<FormInput label="Required" required />);
      const input = screen.getByLabelText(/required/i);
      expect(input).toHaveAttribute('required');
    });
  });

  describe('Error Handling', () => {
    it('should display error message', () => {
      render(<FormInput label="Field" error="Error message" />);
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('should show error state styling', () => {
      render(<FormInput label="Field" error="Error" data-testid="input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-nb-danger');
    });

    it('should set aria-invalid when error exists', () => {
      render(<FormInput label="Field" error="Error" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('User Interactions', () => {
    it('should handle text input', async () => {
      const user = userEvent.setup();
      render(<FormInput label="Name" />);

      const input = screen.getByLabelText('Name');
      await user.type(input, 'John Doe');

      expect(input).toHaveValue('John Doe');
    });

    it('should call onChange handler', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<FormInput label="Field" onChange={handleChange} />);

      const input = screen.getByLabelText('Field');
      await user.type(input, 'Test');

      expect(handleChange).toHaveBeenCalled();
    });

    it('should call onBlur handler', async () => {
      const user = userEvent.setup();
      const handleBlur = jest.fn();
      render(<FormInput label="Field" onBlur={handleBlur} />);

      const input = screen.getByLabelText('Field');
      await user.click(input);
      await user.tab();

      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when disabled prop is true', async () => {
      const user = userEvent.setup();
      render(<FormInput label="Disabled" disabled defaultValue="Initial" />);

      const input = screen.getByLabelText('Disabled');
      await user.type(input, 'New');

      expect(input).toHaveValue('Initial');
      expect(input).toBeDisabled();
    });
  });

  describe('Input Types', () => {
    it('should render as text input by default', () => {
      render(<FormInput label="Text" />);
      const input = screen.getByLabelText('Text');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('should render as password input', () => {
      render(<FormInput label="Password" type="password" />);
      const input = screen.getByLabelText('Password');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('should render as email input', () => {
      render(<FormInput label="Email" type="email" />);
      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('should render as number input', () => {
      render(<FormInput label="Age" type="number" />);
      const input = screen.getByLabelText('Age');
      expect(input).toHaveAttribute('type', 'number');
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <FormInput label="First" />
          <FormInput label="Second" />
        </div>
      );

      const firstInput = screen.getByLabelText('First');
      const secondInput = screen.getByLabelText('Second');

      firstInput.focus();
      expect(firstInput).toHaveFocus();

      await user.tab();
      expect(secondInput).toHaveFocus();
    });

    it('should be clickable via label', async () => {
      const user = userEvent.setup();
      render(<FormInput label="Clickable Label" />);

      const label = screen.getByText('Clickable Label');
      await user.click(label);

      const input = screen.getByLabelText('Clickable Label');
      expect(input).toHaveFocus();
    });

    it('should have proper label association', () => {
      render(<FormInput label="Associated" />);
      const label = screen.getByText(/associated/i);
      const input = screen.getByLabelText(/associated/i);

      const labelFor = label.getAttribute('for');
      const inputId = input.getAttribute('id');

      expect(labelFor).toBe(inputId);
    });

    it('should have minimum touch target size', () => {
      render(<FormInput label="Touch Target" />);
      const input = screen.getByLabelText('Touch Target');
      expect(input).toHaveClass('min-h-[48px]');
    });
  });

  describe('Form Integration', () => {
    it('should work with react-hook-form register', () => {
      const register = jest.fn(() => ({
        onChange: jest.fn(),
        onBlur: jest.fn(),
        ref: jest.fn(),
        name: 'testField',
      }));

      render(<FormInput label="Field" {...register()} />);
      expect(screen.getByLabelText('Field')).toBeInTheDocument();
    });

    it('should accept name attribute', () => {
      render(<FormInput label="Field" name="fieldName" />);
      const input = screen.getByLabelText('Field');
      expect(input).toHaveAttribute('name', 'fieldName');
    });

    it('should support controlled component pattern', async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const [value, setValue] = React.useState('');
        return (
          <FormInput label="Controlled" value={value} onChange={(e) => setValue(e.target.value)} />
        );
      };

      render(<TestComponent />);
      const input = screen.getByLabelText('Controlled');

      await user.type(input, 'Hello');
      expect(input).toHaveValue('Hello');
    });

    it('should support uncontrolled component pattern', () => {
      render(<FormInput label="Uncontrolled" defaultValue="Initial" />);
      const input = screen.getByLabelText('Uncontrolled');
      expect(input).toHaveValue('Initial');
    });
  });

  describe('Custom Props', () => {
    it('should accept custom className', () => {
      render(<FormInput label="Custom" className="custom-wrapper" />);
      const input = screen.getByLabelText('Custom');
      // className is applied to the outer wrapper (space-y-1 + custom-wrapper)
      const outerWrapper = input.parentElement?.parentElement;
      expect(outerWrapper).toHaveClass('custom-wrapper');
      expect(outerWrapper).toHaveClass('space-y-1');
    });

    it('should accept data attributes', () => {
      render(<FormInput label="Data" data-testid="custom-input" />);
      expect(screen.getByTestId('custom-input')).toBeInTheDocument();
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<FormInput label="Ref" ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });

  describe('Real-world Usage', () => {
    it('should render login form username field', () => {
      render(<FormInput label="Username" type="text" placeholder="Masukkan username" required />);

      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Masukkan username')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should render password field with validation error', () => {
      render(
        <FormInput
          label="Password"
          type="password"
          placeholder="Masukkan password"
          error="Password minimal 6 karakter"
          required
        />
      );

      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByText('Password minimal 6 karakter')).toBeInTheDocument();
      const input = screen.getByPlaceholderText('Masukkan password');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should render email field', () => {
      render(
        <FormInput
          label="Email"
          type="email"
          placeholder="user@example.com"
          helperText="Format: nama@domain.com"
        />
      );

      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByText('Format: nama@domain.com')).toBeInTheDocument();
    });
  });
});
