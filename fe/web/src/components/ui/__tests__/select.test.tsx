/**
 * Unit Tests: Select Component
 * Tests select rendering, styles, and basic accessibility
 * Note: Radix UI Select uses portals which are complex to test.
 * These tests focus on trigger rendering and basic props.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../select';
import '@testing-library/jest-dom';

describe('Select Component', () => {
  describe('Basic Rendering', () => {
    it('should render select trigger', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render placeholder when no value selected', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Choose an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('Choose an option')).toBeInTheDocument();
    });

    it('should render selected value', () => {
      render(
        <Select value="opt1">
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="opt1">Selected Option</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('Selected Option')).toBeInTheDocument();
    });
  });

  describe('SelectTrigger', () => {
    it('should render with Neo Brutalism styles', () => {
      render(
        <Select>
          <SelectTrigger data-testid="select-trigger">
            <SelectValue placeholder="Styled" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByTestId('select-trigger');
      expect(trigger).toHaveClass('border-2', 'border-nb-black', 'shadow-nb-md', 'bg-nb-white');
    });

    it('should render with error styles when error prop is true', () => {
      render(
        <Select>
          <SelectTrigger error data-testid="error-trigger">
            <SelectValue placeholder="Error" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByTestId('error-trigger');
      expect(trigger).toHaveClass('border-nb-danger');
    });

    it('should render chevron icon', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="With Icon" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger.querySelector('svg')).toBeInTheDocument();
    });

    it('should accept custom className', () => {
      render(
        <Select>
          <SelectTrigger className="custom-trigger" data-testid="custom">
            <SelectValue placeholder="Custom" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByTestId('custom')).toHaveClass('custom-trigger');
    });

    it('should have proper height for touch targets', () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue placeholder="Touch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveClass('h-12');
    });
  });

  describe('Disabled State', () => {
    it('should disable trigger when disabled', () => {
      render(
        <Select disabled>
          <SelectTrigger data-testid="disabled-trigger">
            <SelectValue placeholder="Disabled" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByTestId('disabled-trigger');
      expect(trigger).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have combobox role', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should be focusable', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Focus" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByRole('combobox');
      trigger.focus();
      expect(trigger).toHaveFocus();
    });
  });

  describe('Custom Props', () => {
    it('should forward ref to SelectTrigger', () => {
      const ref = React.createRef<HTMLButtonElement>();

      render(
        <Select>
          <SelectTrigger ref={ref}>
            <SelectValue placeholder="Ref" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('should spread data attributes to SelectTrigger', () => {
      render(
        <Select>
          <SelectTrigger data-custom="value">
            <SelectValue placeholder="Data" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('data-custom', 'value');
    });
  });
});
