/**
 * Unit Tests: FormSelect Component
 * Tests form select with label, options, validation states, and accessibility
 * Note: Radix UI Select uses portals which are complex to test.
 * These tests focus on trigger rendering, label association, and basic props.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FormSelect } from '../form-select';
import '@testing-library/jest-dom';

const mockOptions = [
  { value: 'admin', label: 'Administrator' },
  { value: 'user', label: 'Standard User' },
  { value: 'guest', label: 'Guest' },
];

describe('FormSelect Component', () => {
  describe('Basic Rendering', () => {
    it('should render label and select', () => {
      const handleChange = jest.fn();
      render(
        <FormSelect
          label="User Role"
          options={mockOptions}
          onChange={handleChange}
        />
      );

      expect(screen.getByText('User Role')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render placeholder text', () => {
      const handleChange = jest.fn();
      render(
        <FormSelect
          label="Role"
          options={mockOptions}
          placeholder="Choose a role"
          onChange={handleChange}
        />
      );

      expect(screen.getByText('Choose a role')).toBeInTheDocument();
    });

    it('should render default placeholder when not provided', () => {
      const handleChange = jest.fn();
      render(
        <FormSelect
          label="Role"
          options={mockOptions}
          onChange={handleChange}
        />
      );

      expect(screen.getByText('Select...')).toBeInTheDocument();
    });

    it('should render selected value', () => {
      const handleChange = jest.fn();
      render(
        <FormSelect
          label="Role"
          options={mockOptions}
          value="admin"
          onChange={handleChange}
        />
      );

      expect(screen.getByText('Administrator')).toBeInTheDocument();
    });
  });

  describe('Label', () => {
    it('should render label associated with select', () => {
      const handleChange = jest.fn();
      render(
        <FormSelect
          label="Select Role"
          options={mockOptions}
          onChange={handleChange}
        />
      );

      const label = screen.getByText('Select Role');
      expect(label.tagName).toBe('LABEL');
    });

    it('should render required indicator when required', () => {
      const handleChange = jest.fn();
      render(
        <FormSelect
          label="Role"
          options={mockOptions}
          onChange={handleChange}
          required
        />
      );

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should not render required indicator when not required', () => {
      const handleChange = jest.fn();
      render(
        <FormSelect
          label="Role"
          options={mockOptions}
          onChange={handleChange}
        />
      );

      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should render error message when error prop is provided', () => {
      const handleChange = jest.fn();
      render(
        <FormSelect
          label="Role"
          options={mockOptions}
          onChange={handleChange}
          error="Please select a role"
        />
      );

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent('Please select a role');
    });

    it('should have error styling on trigger', () => {
      const handleChange = jest.fn();
      render(
        <FormSelect
          label="Role"
          options={mockOptions}
          onChange={handleChange}
          error="Error message"
        />
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveClass('border-nb-danger');
    });

    it('should render error message with danger color', () => {
      const handleChange = jest.fn();
      render(
        <FormSelect
          label="Role"
          options={mockOptions}
          onChange={handleChange}
          error="This field is required"
        />
      );

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveClass('text-nb-danger');
    });
  });

  describe('Helper Text', () => {
    it('should render helper text when provided', () => {
      const handleChange = jest.fn();
      render(
        <FormSelect
          label="Role"
          options={mockOptions}
          onChange={handleChange}
          helperText="Select the user's permission level"
        />
      );

      expect(screen.getByText("Select the user's permission level")).toBeInTheDocument();
    });

    it('should not render helper text when error is present', () => {
      const handleChange = jest.fn();
      render(
        <FormSelect
          label="Role"
          options={mockOptions}
          onChange={handleChange}
          helperText="This is helper text"
          error="This is an error"
        />
      );

      expect(screen.queryByText('This is helper text')).not.toBeInTheDocument();
      expect(screen.getByText('This is an error')).toBeInTheDocument();
    });

    it('should render helper text with muted color', () => {
      const handleChange = jest.fn();
      render(
        <FormSelect
          label="Role"
          options={mockOptions}
          onChange={handleChange}
          helperText="Helper text"
        />
      );

      const helper = screen.getByText('Helper text');
      expect(helper).toHaveClass('text-nb-gray-600');
    });
  });

  describe('Disabled State', () => {
    it('should disable select when disabled prop is true', () => {
      const handleChange = jest.fn();
      render(
        <FormSelect
          label="Role"
          options={mockOptions}
          onChange={handleChange}
          disabled
        />
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeDisabled();
    });
  });

  describe('Custom Styling', () => {
    it('should accept custom className', () => {
      const handleChange = jest.fn();
      const { container } = render(
        <FormSelect
          label="Role"
          options={mockOptions}
          onChange={handleChange}
          className="custom-wrapper"
        />
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-wrapper');
    });

    it('should have proper spacing between elements', () => {
      const handleChange = jest.fn();
      const { container } = render(
        <FormSelect
          label="Role"
          options={mockOptions}
          onChange={handleChange}
        />
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('space-y-1');
    });
  });

  describe('Accessibility', () => {
    it('should have unique id linking label to select', () => {
      const handleChange = jest.fn();
      render(
        <FormSelect
          label="Accessible Select"
          options={mockOptions}
          onChange={handleChange}
        />
      );

      const label = screen.getByText('Accessible Select');
      const trigger = screen.getByRole('combobox');

      const labelFor = label.getAttribute('for');
      const triggerId = trigger.getAttribute('id');

      expect(labelFor).toBe(triggerId);
    });

    it('should announce error to screen readers', () => {
      const handleChange = jest.fn();
      render(
        <FormSelect
          label="Role"
          options={mockOptions}
          onChange={handleChange}
          error="Selection required"
        />
      );

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toBeInTheDocument();
    });

    it('should be focusable', () => {
      const handleChange = jest.fn();
      render(
        <FormSelect
          label="Role"
          options={mockOptions}
          onChange={handleChange}
        />
      );

      const trigger = screen.getByRole('combobox');
      trigger.focus();
      expect(trigger).toHaveFocus();
    });
  });

  describe('Empty Options', () => {
    it('should handle empty options array', () => {
      const handleChange = jest.fn();
      render(
        <FormSelect
          label="Role"
          options={[]}
          onChange={handleChange}
          placeholder="No options available"
        />
      );

      expect(screen.getByText('No options available')).toBeInTheDocument();
    });
  });

  describe('DisplayName', () => {
    it('should have displayName set', () => {
      expect(FormSelect.displayName).toBe('FormSelect');
    });
  });

  describe('Neo Brutalism Styles', () => {
    it('should have proper border and shadow styles on trigger', () => {
      const handleChange = jest.fn();
      render(
        <FormSelect
          label="Role"
          options={mockOptions}
          onChange={handleChange}
        />
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveClass('border-3', 'border-nb-black', 'shadow-nb-sm', 'bg-nb-white');
    });

    it('should have proper height for touch targets', () => {
      const handleChange = jest.fn();
      render(
        <FormSelect
          label="Role"
          options={mockOptions}
          onChange={handleChange}
        />
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveClass('h-12');
    });
  });
});
