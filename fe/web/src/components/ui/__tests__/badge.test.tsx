/**
 * Unit Tests: Badge Component
 * Tests badge variants, sizes, icons, and remove functionality
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Badge } from '../badge';
import '@testing-library/jest-dom';

describe('Badge Component', () => {
  describe('Rendering', () => {
    it('should render badge with text', () => {
      render(<Badge>Status</Badge>);
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('should render with default variant', () => {
      render(<Badge>Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge).toHaveClass('bg-nb-primary', 'text-nb-black');
    });

    it('should render with secondary variant', () => {
      render(<Badge variant="secondary">Secondary</Badge>);
      const badge = screen.getByText('Secondary');
      expect(badge).toHaveClass('bg-nb-gray-100', 'text-nb-black');
    });

    it('should render with destructive variant', () => {
      render(<Badge variant="destructive">Error</Badge>);
      const badge = screen.getByText('Error');
      expect(badge).toHaveClass('bg-nb-danger', 'text-nb-black');
    });

    it('should render with success variant', () => {
      render(<Badge variant="success">Success</Badge>);
      const badge = screen.getByText('Success');
      expect(badge).toHaveClass('bg-nb-success', 'text-nb-black');
    });

    it('should render with warning variant', () => {
      render(<Badge variant="warning">Warning</Badge>);
      const badge = screen.getByText('Warning');
      expect(badge).toHaveClass('bg-nb-warning', 'text-nb-black');
    });

    it('should render with outline variant', () => {
      render(<Badge variant="outline">Outline</Badge>);
      const badge = screen.getByText('Outline');
      expect(badge).toHaveClass('bg-transparent', 'text-nb-black');
    });
  });

  describe('Sizes', () => {
    it('should render with default size', () => {
      render(<Badge>Default Size</Badge>);
      const badge = screen.getByText('Default Size');
      expect(badge).toHaveClass('px-3', 'py-1', 'text-sm');
    });

    it('should render with small size', () => {
      render(<Badge size="sm">Small</Badge>);
      const badge = screen.getByText('Small');
      expect(badge).toHaveClass('px-2', 'py-0.5', 'text-xs');
    });

    it('should render with large size', () => {
      render(<Badge size="lg">Large</Badge>);
      const badge = screen.getByText('Large');
      expect(badge).toHaveClass('px-4', 'py-1.5', 'text-base');
    });
  });

  describe('Icons', () => {
    it('should render with icon', () => {
      const icon = <span data-testid="badge-icon">★</span>;
      render(<Badge icon={icon}>With Icon</Badge>);

      expect(screen.getByTestId('badge-icon')).toBeInTheDocument();
      expect(screen.getByText('With Icon')).toBeInTheDocument();
    });

    it('should render icon before text', () => {
      const icon = <span data-testid="badge-icon">★</span>;
      const { container } = render(<Badge icon={icon}>With Icon</Badge>);

      const badge = container.firstChild;
      expect(badge?.firstChild).toContainElement(screen.getByTestId('badge-icon'));
    });
  });

  describe('Remove Functionality', () => {
    it('should render remove button when onRemove is provided', () => {
      const handleRemove = jest.fn();
      render(<Badge onRemove={handleRemove}>Removable</Badge>);

      const removeButton = screen.getByRole('button', { name: /remove/i });
      expect(removeButton).toBeInTheDocument();
    });

    it('should not render remove button when onRemove is not provided', () => {
      render(<Badge>Not Removable</Badge>);

      const removeButton = screen.queryByRole('button', { name: /remove/i });
      expect(removeButton).not.toBeInTheDocument();
    });

    it('should call onRemove when remove button is clicked', async () => {
      const user = userEvent.setup();
      const handleRemove = jest.fn();
      render(<Badge onRemove={handleRemove}>Removable</Badge>);

      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);

      expect(handleRemove).toHaveBeenCalledTimes(1);
    });
  });

  describe('Neo Brutalism Styles', () => {
    it('should have border and uppercase text', () => {
      render(<Badge>Styled</Badge>);
      const badge = screen.getByText('Styled');
      expect(badge).toHaveClass('border-2', 'border-nb-black', 'uppercase', 'font-semibold');
    });

    it('should have inline-flex display', () => {
      render(<Badge>Flex</Badge>);
      const badge = screen.getByText('Flex');
      expect(badge).toHaveClass('inline-flex', 'items-center', 'gap-1');
    });
  });

  describe('Custom Props', () => {
    it('should accept custom className', () => {
      render(<Badge className="custom-class">Custom</Badge>);
      const badge = screen.getByText('Custom');
      expect(badge).toHaveClass('custom-class');
    });

    it('should accept data attributes', () => {
      render(<Badge data-testid="custom-badge">Custom</Badge>);
      expect(screen.getByTestId('custom-badge')).toBeInTheDocument();
    });

    it('should spread additional HTML attributes', () => {
      render(
        <Badge id="my-badge" title="Badge Title">
          Props
        </Badge>
      );
      const badge = screen.getByText('Props');
      expect(badge).toHaveAttribute('id', 'my-badge');
      expect(badge).toHaveAttribute('title', 'Badge Title');
    });
  });

  describe('Accessibility', () => {
    it('should have remove button with aria-label', () => {
      const handleRemove = jest.fn();
      render(<Badge onRemove={handleRemove}>Accessible</Badge>);

      const removeButton = screen.getByRole('button');
      expect(removeButton).toHaveAttribute('aria-label', 'Remove');
    });

    it('should be focusable when has remove button', async () => {
      const handleRemove = jest.fn();
      render(<Badge onRemove={handleRemove}>Focusable</Badge>);

      const removeButton = screen.getByRole('button');
      removeButton.focus();
      expect(removeButton).toHaveFocus();
    });

    it('should respond to keyboard interaction on remove button', async () => {
      const user = userEvent.setup();
      const handleRemove = jest.fn();
      render(<Badge onRemove={handleRemove}>Keyboard</Badge>);

      const removeButton = screen.getByRole('button');
      removeButton.focus();
      await user.keyboard('{Enter}');

      expect(handleRemove).toHaveBeenCalledTimes(1);
    });
  });
});
