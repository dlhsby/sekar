/**
 * Unit Tests: Card Component
 * Tests card variants, composition, and styling
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card';
import '@testing-library/jest-dom';

describe('Card Component', () => {
  describe('Basic Rendering', () => {
    it('should render card with content', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should render with default variant', () => {
      render(<Card data-testid="card">Content</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('border-3', 'border-nb-black', 'shadow-nb-sm');
    });

    it('should render with elevated variant', () => {
      render(
        <Card variant="elevated" data-testid="card">
          Content
        </Card>
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('shadow-nb-md');
    });

    it('should render with outlined variant', () => {
      render(
        <Card variant="outlined" data-testid="card">
          Content
        </Card>
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('border-3', 'shadow-none');
    });

    it('should render with filled variant', () => {
      render(
        <Card variant="filled" data-testid="card">
          Content
        </Card>
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('border-0', 'bg-nb-gray-50');
    });
  });

  describe('Interactive Card', () => {
    it('should render as interactive when prop is set', () => {
      render(
        <Card interactive={true} data-testid="card">
          Interactive
        </Card>
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('cursor-pointer');
    });

    it('should handle click when interactive', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      render(
        <Card interactive={true} onClick={handleClick} data-testid="card">
          Clickable
        </Card>
      );

      const card = screen.getByTestId('card');
      await user.click(card);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not have cursor pointer when not interactive', () => {
      render(
        <Card interactive={false} data-testid="card">
          Not Interactive
        </Card>
      );
      const card = screen.getByTestId('card');
      expect(card).not.toHaveClass('cursor-pointer');
    });
  });

  describe('Card Composition', () => {
    it('should render complete card with all sub-components', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>Card Content</CardContent>
          <CardFooter>Card Footer</CardFooter>
        </Card>
      );

      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card Description')).toBeInTheDocument();
      expect(screen.getByText('Card Content')).toBeInTheDocument();
      expect(screen.getByText('Card Footer')).toBeInTheDocument();
    });

    it('should render card with only title and content', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Title Only</CardTitle>
          </CardHeader>
          <CardContent>Content Only</CardContent>
        </Card>
      );

      expect(screen.getByText('Title Only')).toBeInTheDocument();
      expect(screen.getByText('Content Only')).toBeInTheDocument();
    });

    it('should render card with only content', () => {
      render(
        <Card>
          <CardContent>Just Content</CardContent>
        </Card>
      );

      expect(screen.getByText('Just Content')).toBeInTheDocument();
    });
  });

  describe('CardHeader', () => {
    it('should render with border bottom', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>);
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('border-b-2', 'border-nb-black');
    });

    it('should accept custom className', () => {
      render(
        <CardHeader className="custom-header" data-testid="header">
          Header
        </CardHeader>
      );
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('custom-header');
    });
  });

  describe('CardTitle', () => {
    it('should render with bold font', () => {
      render(<CardTitle data-testid="title">Title</CardTitle>);
      const title = screen.getByTestId('title');
      expect(title).toHaveClass('font-bold');
    });

    it('should accept custom className', () => {
      render(
        <CardTitle className="text-2xl" data-testid="title">
          Large Title
        </CardTitle>
      );
      const title = screen.getByTestId('title');
      expect(title).toHaveClass('text-2xl');
    });
  });

  describe('CardDescription', () => {
    it('should render with muted color', () => {
      render(<CardDescription data-testid="desc">Description</CardDescription>);
      const desc = screen.getByTestId('desc');
      expect(desc).toHaveClass('text-muted-foreground');
    });

    it('should have smaller text size', () => {
      render(<CardDescription data-testid="desc">Small text</CardDescription>);
      const desc = screen.getByTestId('desc');
      expect(desc).toHaveClass('text-sm');
    });
  });

  describe('CardContent', () => {
    it('should have padding', () => {
      render(<CardContent data-testid="content">Content</CardContent>);
      const content = screen.getByTestId('content');
      expect(content).toHaveClass('p-4');
    });

    it('should accept custom className for different padding', () => {
      render(
        <CardContent className="p-8" data-testid="content">
          Large Padding
        </CardContent>
      );
      const content = screen.getByTestId('content');
      expect(content).toHaveClass('p-8');
    });
  });

  describe('CardFooter', () => {
    it('should render with border top', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);
      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('border-t-2', 'border-nb-black');
    });

    it('should display as flex container', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);
      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('flex', 'items-center', 'gap-2');
    });

    it('should render multiple buttons in footer', () => {
      render(
        <CardFooter>
          <button>Cancel</button>
          <button>Submit</button>
        </CardFooter>
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should accept data attributes', () => {
      render(<Card data-testid="custom-card">Content</Card>);
      expect(screen.getByTestId('custom-card')).toBeInTheDocument();
    });

    it('should accept custom className', () => {
      render(
        <Card className="custom-class" data-testid="card">
          Content
        </Card>
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('custom-class');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Card ref={ref}>Content</Card>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Neo Brutalism Styles', () => {
    it('should have thick borders', () => {
      render(<Card data-testid="card">Content</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('border-3', 'border-nb-black');
    });

    it('should have Neo Brutalism shadow', () => {
      render(<Card data-testid="card">Content</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('shadow-nb-sm');
    });

    it('should have hover animation when interactive', () => {
      render(
        <Card interactive={true} data-testid="card">
          Interactive
        </Card>
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('hover:shadow-nb-hover');
    });
  });

  describe('Real-world Usage', () => {
    it('should render area card layout', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Taman Bungkul</CardTitle>
            <CardDescription>Rayon Selatan</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Luas: 1000m²</p>
            <p>Status: Aktif</p>
          </CardContent>
          <CardFooter>
            <button>Lihat Detail</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByText('Taman Bungkul')).toBeInTheDocument();
      expect(screen.getByText('Rayon Selatan')).toBeInTheDocument();
      expect(screen.getByText('Luas: 1000m²')).toBeInTheDocument();
      expect(screen.getByText('Status: Aktif')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /lihat detail/i })).toBeInTheDocument();
    });

    it('should render dashboard stat card', () => {
      render(
        <Card>
          <CardContent>
            <h3>Total Workers</h3>
            <p className="text-3xl font-bold">142</p>
          </CardContent>
        </Card>
      );

      expect(screen.getByText('Total Workers')).toBeInTheDocument();
      expect(screen.getByText('142')).toBeInTheDocument();
    });
  });
});
