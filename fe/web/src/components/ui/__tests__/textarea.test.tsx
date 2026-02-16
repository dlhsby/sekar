/**
 * Unit Tests: Textarea Component
 * Tests textarea variants, states, character count, and accessibility
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from '../textarea';
import '@testing-library/jest-dom';

describe('Textarea Component', () => {
  describe('Basic Rendering', () => {
    it('should render textarea', () => {
      render(<Textarea />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<Textarea placeholder="Enter description" />);
      expect(screen.getByPlaceholderText('Enter description')).toBeInTheDocument();
    });

    it('should render with value', () => {
      render(<Textarea value="Initial content" onChange={() => {}} />);
      expect(screen.getByDisplayValue('Initial content')).toBeInTheDocument();
    });

    it('should render with label', () => {
      render(<Textarea label="Description" />);
      expect(screen.getByText('Description')).toBeInTheDocument();
    });
  });

  describe('States', () => {
    it('should render with default state', () => {
      render(<Textarea data-testid="default-textarea" />);
      const textarea = screen.getByTestId('default-textarea');
      expect(textarea).toHaveClass('border-nb-black');
    });

    it('should render with error state', () => {
      render(<Textarea state="error" data-testid="error-textarea" />);
      const textarea = screen.getByTestId('error-textarea');
      expect(textarea).toHaveClass('border-nb-danger');
    });

    it('should render with success state', () => {
      render(<Textarea state="success" data-testid="success-textarea" />);
      const textarea = screen.getByTestId('success-textarea');
      expect(textarea).toHaveClass('border-nb-success');
    });

    it('should override state when error prop is provided', () => {
      render(<Textarea error="Field required" data-testid="error-override" />);
      const textarea = screen.getByTestId('error-override');
      expect(textarea).toHaveClass('border-nb-danger');
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Textarea disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should have disabled styling', () => {
      render(<Textarea disabled data-testid="disabled-textarea" />);
      const textarea = screen.getByTestId('disabled-textarea');
      expect(textarea).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
    });
  });

  describe('Error Message', () => {
    it('should display error message when error prop is provided', () => {
      render(<Textarea error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should have error styling on message', () => {
      render(<Textarea error="Error message" />);
      const errorMessage = screen.getByText('Error message');
      expect(errorMessage).toHaveClass('text-nb-danger');
    });

    it('should set aria-invalid when error is present', () => {
      render(<Textarea error="Invalid input" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('Helper Text', () => {
    it('should display helper text when provided', () => {
      render(<Textarea helperText="Enter at least 10 characters" />);
      expect(screen.getByText('Enter at least 10 characters')).toBeInTheDocument();
    });

    it('should prioritize error over helper text', () => {
      render(<Textarea helperText="This is helper" error="This is error" />);
      expect(screen.getByText('This is error')).toBeInTheDocument();
      expect(screen.queryByText('This is helper')).not.toBeInTheDocument();
    });

    it('should have muted styling on helper text', () => {
      render(<Textarea helperText="Helper text" />);
      const helper = screen.getByText('Helper text');
      expect(helper).toHaveClass('text-nb-gray-600');
    });
  });

  describe('Character Count', () => {
    it('should show character count when showCount and maxLength are provided', () => {
      render(<Textarea showCount maxLength={100} value="Hello" onChange={() => {}} />);
      expect(screen.getByText('5/100')).toBeInTheDocument();
    });

    it('should not show character count without showCount prop', () => {
      render(<Textarea maxLength={100} value="Hello" onChange={() => {}} />);
      expect(screen.queryByText('5/100')).not.toBeInTheDocument();
    });

    it('should not show character count without maxLength prop', () => {
      render(<Textarea showCount value="Hello" onChange={() => {}} />);
      expect(screen.queryByText(/\/\d+/)).not.toBeInTheDocument();
    });

    it('should update character count on input', async () => {
      const user = userEvent.setup();
      render(<Textarea showCount maxLength={50} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Test input');

      expect(screen.getByText('10/50')).toBeInTheDocument();
    });
  });

  describe('Auto Resize', () => {
    it('should have overflow-hidden when autoResize is true', () => {
      render(<Textarea autoResize data-testid="auto-resize" />);
      const textarea = screen.getByTestId('auto-resize');
      expect(textarea).toHaveClass('overflow-hidden', 'resize-none');
    });

    it('should have resize-y by default', () => {
      render(<Textarea data-testid="default-resize" />);
      const textarea = screen.getByTestId('default-resize');
      expect(textarea).toHaveClass('resize-y');
    });
  });

  describe('Interactions', () => {
    it('should call onChange when typing', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<Textarea onChange={handleChange} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Test');

      expect(handleChange).toHaveBeenCalled();
    });

    it('should update internal value when typing', async () => {
      const user = userEvent.setup();
      render(<Textarea />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'New content');

      expect(textarea).toHaveValue('New content');
    });

    it('should respect maxLength', async () => {
      const user = userEvent.setup();
      render(<Textarea maxLength={5} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello World');

      expect(textarea).toHaveValue('Hello');
    });
  });

  describe('Neo Brutalism Styles', () => {
    it('should have border and shadow styles', () => {
      render(<Textarea data-testid="styled-textarea" />);
      const textarea = screen.getByTestId('styled-textarea');
      expect(textarea).toHaveClass('border-2', 'border-nb-black', 'shadow-nb-sm');
    });

    it('should have proper minimum height', () => {
      render(<Textarea data-testid="height-textarea" />);
      const textarea = screen.getByTestId('height-textarea');
      expect(textarea).toHaveClass('min-h-[120px]');
    });

    it('should have white background', () => {
      render(<Textarea data-testid="bg-textarea" />);
      const textarea = screen.getByTestId('bg-textarea');
      expect(textarea).toHaveClass('bg-nb-white');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-describedby when helper or error is present', () => {
      render(<Textarea helperText="Helper" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-describedby', 'textarea-helper');
    });

    it('should have aria-describedby when showCount is true', () => {
      render(<Textarea showCount maxLength={100} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-describedby', 'textarea-helper');
    });

    it('should not have aria-describedby without helper, error, or count', () => {
      render(<Textarea />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).not.toHaveAttribute('aria-describedby');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<Textarea placeholder="Focus me" />);

      await user.tab();
      expect(screen.getByRole('textbox')).toHaveFocus();
    });
  });

  describe('Custom Props', () => {
    it('should accept custom className', () => {
      render(<Textarea className="custom-class" data-testid="custom" />);
      expect(screen.getByTestId('custom')).toHaveClass('custom-class');
    });

    it('should accept rows attribute', () => {
      render(<Textarea rows={5} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('rows', '5');
    });

    it('should accept name attribute', () => {
      render(<Textarea name="description" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('name', 'description');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLTextAreaElement>();
      render(<Textarea ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
    });
  });

  describe('DisplayName', () => {
    it('should have displayName set', () => {
      expect(Textarea.displayName).toBe('Textarea');
    });
  });

  describe('Controlled vs Uncontrolled', () => {
    it('should work as controlled component', async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const [value, setValue] = React.useState('');
        return (
          <>
            <Textarea value={value} onChange={(e) => setValue(e.target.value)} />
            <span data-testid="value-display">{value}</span>
          </>
        );
      };

      render(<TestComponent />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Controlled');

      expect(screen.getByTestId('value-display')).toHaveTextContent('Controlled');
    });

    it('should work as uncontrolled component', async () => {
      const user = userEvent.setup();
      render(<Textarea defaultValue="Initial" />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('Initial');

      await user.clear(textarea);
      await user.type(textarea, 'New value');

      expect(textarea).toHaveValue('New value');
    });
  });
});
