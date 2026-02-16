/**
 * Unit Tests: Dialog Component
 * Tests dialog open/close, accessibility, and content rendering
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../dialog';
import '@testing-library/jest-dom';

// Mock Radix UI portal to render in document body
jest.mock('@radix-ui/react-dialog', () => {
  const actual = jest.requireActual('@radix-ui/react-dialog');
  return {
    ...actual,
    Portal: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="dialog-portal">{children}</div>
    ),
  };
});

describe('Dialog Component', () => {
  describe('Basic Rendering', () => {
    it('should render trigger button', () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <button>Open Dialog</button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Test Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByRole('button', { name: /open dialog/i })).toBeInTheDocument();
    });

    it('should not render content when closed', () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <button>Open Dialog</button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Hidden Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.queryByText('Hidden Title')).not.toBeInTheDocument();
    });

    it('should render content when open', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Visible Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Visible Title')).toBeInTheDocument();
    });
  });

  describe('Open/Close Behavior', () => {
    it('should open dialog when trigger is clicked', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger asChild>
            <button>Open</button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog Content</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        expect(screen.getByText('Dialog Content')).toBeInTheDocument();
      });
    });

    it('should call onOpenChange when state changes', async () => {
      const user = userEvent.setup();
      const handleOpenChange = jest.fn();

      render(
        <Dialog onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <button>Open</button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Content</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      expect(handleOpenChange).toHaveBeenCalledWith(true);
    });

    it('should render close button in content', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>With Close</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      // Close button should have sr-only text "Close"
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });

  describe('DialogHeader', () => {
    it('should render header with correct styles', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogHeader data-testid="dialog-header">
              <DialogTitle>Header Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const header = screen.getByTestId('dialog-header');
      expect(header).toHaveClass('p-4', 'border-b-2', 'border-nb-black');
    });

    it('should render children correctly', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Title</DialogTitle>
              <DialogDescription>Description text</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description text')).toBeInTheDocument();
    });
  });

  describe('DialogFooter', () => {
    it('should render footer with correct styles', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>With Footer</DialogTitle>
            <DialogFooter data-testid="dialog-footer">
              <button>Cancel</button>
              <button>Confirm</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      const footer = screen.getByTestId('dialog-footer');
      expect(footer).toHaveClass('p-4', 'border-t-2', 'border-nb-black');
    });

    it('should render action buttons', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Actions</DialogTitle>
            <DialogFooter>
              <button>Cancel</button>
              <button>Confirm</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });
  });

  describe('DialogTitle', () => {
    it('should render title with bold styling', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Bold Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      const title = screen.getByText('Bold Title');
      expect(title).toHaveClass('text-lg', 'font-bold');
    });

    it('should accept custom className', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle className="custom-title">Custom Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      const title = screen.getByText('Custom Title');
      expect(title).toHaveClass('custom-title');
    });
  });

  describe('DialogDescription', () => {
    it('should render description with muted styling', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Muted description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      const description = screen.getByText('Muted description');
      expect(description).toHaveClass('text-sm', 'text-nb-gray-600');
    });
  });

  describe('DialogContent', () => {
    it('should render with Neo Brutalism styles', () => {
      render(
        <Dialog open>
          <DialogContent data-testid="dialog-content">
            <DialogTitle>Styled Content</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      const content = screen.getByRole('dialog');
      expect(content).toHaveClass('border-2', 'border-nb-black', 'bg-nb-white', 'shadow-nb-lg');
    });

    it('should accept custom className', () => {
      render(
        <Dialog open>
          <DialogContent className="custom-content">
            <DialogTitle>Custom</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      const content = screen.getByRole('dialog');
      expect(content).toHaveClass('custom-content');
    });
  });

  describe('DialogClose', () => {
    it('should render close component', async () => {
      const user = userEvent.setup();
      const handleOpenChange = jest.fn();

      render(
        <Dialog open onOpenChange={handleOpenChange}>
          <DialogContent>
            <DialogTitle>With Close Button</DialogTitle>
            <DialogClose asChild>
              <button data-testid="custom-close">Close Me</button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      );

      const closeButton = screen.getByTestId('custom-close');
      await user.click(closeButton);

      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Accessibility', () => {
    it('should have dialog role when open', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Accessible Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should associate title with dialog', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Title for Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      const title = screen.getByText('Title for Dialog');

      // DialogTitle should be accessible
      expect(title.tagName).toBe('H2'); // Radix renders as h2 by default
    });

    it('should render overlay with backdrop', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>With Overlay</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      // Portal should render
      expect(screen.getByTestId('dialog-portal')).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should spread props to DialogContent', () => {
      render(
        <Dialog open>
          <DialogContent data-custom="value">
            <DialogTitle>Props Test</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      const content = screen.getByRole('dialog');
      expect(content).toHaveAttribute('data-custom', 'value');
    });
  });
});
