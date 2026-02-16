/**
 * Unit Tests: Skeleton Component
 * Tests skeleton loading states, variants, animation, and composed skeletons
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Skeleton, SkeletonCard, SkeletonTable, SkeletonList } from '../skeleton';
import '@testing-library/jest-dom';

describe('Skeleton Component', () => {
  describe('Basic Rendering', () => {
    it('should render skeleton', () => {
      const { container } = render(<Skeleton />);

      const skeleton = container.firstChild;
      expect(skeleton).toBeInTheDocument();
    });

    it('should render with default variant', () => {
      const { container } = render(<Skeleton />);

      const skeleton = container.firstChild;
      expect(skeleton).toHaveClass('h-4', 'w-4/5');
    });

    it('should have animation class', () => {
      const { container } = render(<Skeleton />);

      const skeleton = container.firstChild;
      expect(skeleton).toHaveClass('animate-shimmer');
    });

    it('should have border and background', () => {
      const { container } = render(<Skeleton />);

      const skeleton = container.firstChild;
      expect(skeleton).toHaveClass('bg-nb-gray-300', 'border-2', 'border-nb-black');
    });
  });

  describe('Variants', () => {
    it('should render text variant', () => {
      const { container } = render(<Skeleton variant="text" />);

      const skeleton = container.firstChild;
      expect(skeleton).toHaveClass('h-4', 'w-4/5');
    });

    it('should render heading variant', () => {
      const { container } = render(<Skeleton variant="heading" />);

      const skeleton = container.firstChild;
      expect(skeleton).toHaveClass('h-8', 'w-3/5');
    });

    it('should render card variant', () => {
      const { container } = render(<Skeleton variant="card" />);

      const skeleton = container.firstChild;
      expect(skeleton).toHaveClass('h-32', 'w-full');
    });

    it('should render avatar variant', () => {
      const { container } = render(<Skeleton variant="avatar" />);

      const skeleton = container.firstChild;
      expect(skeleton).toHaveClass('h-12', 'w-12');
    });

    it('should render button variant', () => {
      const { container } = render(<Skeleton variant="button" />);

      const skeleton = container.firstChild;
      expect(skeleton).toHaveClass('h-12', 'w-24');
    });

    it('should render listItem variant', () => {
      const { container } = render(<Skeleton variant="listItem" />);

      const skeleton = container.firstChild;
      expect(skeleton).toHaveClass('h-16', 'w-full');
    });

    it('should render thumbnail variant', () => {
      const { container } = render(<Skeleton variant="thumbnail" />);

      const skeleton = container.firstChild;
      expect(skeleton).toHaveClass('h-20', 'w-20');
    });

    it('should render paragraph variant', () => {
      const { container } = render(<Skeleton variant="paragraph" />);

      const skeleton = container.firstChild;
      expect(skeleton).toHaveClass('h-20', 'w-full');
    });
  });

  describe('Count Property', () => {
    it('should render single skeleton by default', () => {
      const { container } = render(<Skeleton />);

      const skeletons = container.querySelectorAll('.animate-shimmer');
      expect(skeletons.length).toBe(1);
    });

    it('should render multiple skeletons when count > 1', () => {
      const { container } = render(<Skeleton count={3} />);

      const skeletons = container.querySelectorAll('.animate-shimmer');
      expect(skeletons.length).toBe(3);
    });

    it('should render 5 skeletons when count is 5', () => {
      const { container } = render(<Skeleton count={5} />);

      const skeletons = container.querySelectorAll('.animate-shimmer');
      expect(skeletons.length).toBe(5);
    });

    it('should wrap multiple skeletons in flex container', () => {
      const { container } = render(<Skeleton count={3} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'flex-col');
    });
  });

  describe('Gap Property', () => {
    it('should use medium gap by default', () => {
      const { container } = render(<Skeleton count={3} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('gap-4');
    });

    it('should apply small gap', () => {
      const { container } = render(<Skeleton count={3} gap="sm" />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('gap-2');
    });

    it('should apply medium gap', () => {
      const { container } = render(<Skeleton count={3} gap="md" />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('gap-4');
    });

    it('should apply large gap', () => {
      const { container } = render(<Skeleton count={3} gap="lg" />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('gap-6');
    });
  });

  describe('Custom Props', () => {
    it('should accept custom className', () => {
      const { container } = render(<Skeleton className="custom-skeleton" />);

      const skeleton = container.firstChild;
      expect(skeleton).toHaveClass('custom-skeleton');
    });

    it('should merge custom className with variant classes', () => {
      const { container } = render(<Skeleton variant="heading" className="w-full" />);

      const skeleton = container.firstChild;
      expect(skeleton).toHaveClass('h-8', 'w-full');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Skeleton ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should accept data attributes', () => {
      const { container } = render(<Skeleton data-testid="skeleton-test" />);

      expect(container.querySelector('[data-testid="skeleton-test"]')).toBeInTheDocument();
    });
  });

  describe('SkeletonCard Component', () => {
    it('should render skeleton card', () => {
      const { container } = render(<SkeletonCard />);

      const card = container.firstChild;
      expect(card).toBeInTheDocument();
    });

    it('should have card styling', () => {
      const { container } = render(<SkeletonCard />);

      const card = container.firstChild;
      expect(card).toHaveClass('border-2', 'border-nb-black', 'bg-nb-white', 'shadow-nb-sm');
    });

    it('should contain multiple skeleton elements', () => {
      const { container } = render(<SkeletonCard />);

      const skeletons = container.querySelectorAll('.animate-shimmer');
      expect(skeletons.length).toBeGreaterThan(1);
    });

    it('should contain heading skeleton', () => {
      const { container } = render(<SkeletonCard />);

      const heading = container.querySelector('.h-8');
      expect(heading).toBeInTheDocument();
    });

    it('should contain text skeletons', () => {
      const { container } = render(<SkeletonCard />);

      const textSkeletons = container.querySelectorAll('.h-4');
      expect(textSkeletons.length).toBeGreaterThan(0);
    });

    it('should contain button skeletons', () => {
      const { container } = render(<SkeletonCard />);

      const buttons = container.querySelectorAll('.h-12.w-24');
      expect(buttons.length).toBe(2);
    });

    it('should accept custom className', () => {
      const { container } = render(<SkeletonCard className="custom-card" />);

      const card = container.firstChild;
      expect(card).toHaveClass('custom-card');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<SkeletonCard ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('SkeletonTable Component', () => {
    it('should render skeleton table', () => {
      const { container } = render(<SkeletonTable />);

      const table = container.firstChild;
      expect(table).toBeInTheDocument();
    });

    it('should have table styling', () => {
      const { container } = render(<SkeletonTable />);

      const table = container.firstChild;
      expect(table).toHaveClass('border-2', 'border-nb-black', 'overflow-hidden');
    });

    it('should render header row', () => {
      const { container } = render(<SkeletonTable />);

      const header = container.querySelector('.bg-nb-gray-100');
      expect(header).toBeInTheDocument();
    });

    it('should render default 5 rows', () => {
      const { container } = render(<SkeletonTable />);

      const rows = container.querySelectorAll('.border-b-2');
      // Header row (1) + data rows (5) = 6 total
      expect(rows.length).toBe(6);
    });

    it('should render custom number of rows', () => {
      const { container } = render(<SkeletonTable rows={3} />);

      const rows = container.querySelectorAll('.border-b-2');
      // Header row (1) + data rows (3) = 4 total
      expect(rows.length).toBe(4);
    });

    it('should render 10 rows when specified', () => {
      const { container } = render(<SkeletonTable rows={10} />);

      const rows = container.querySelectorAll('.border-b-2');
      // Header row (1) + data rows (10) = 11 total
      expect(rows.length).toBe(11);
    });

    it('should render 4 columns per row', () => {
      const { container } = render(<SkeletonTable rows={1} />);

      const firstRow = container.querySelector('.border-b-2');
      const columns = firstRow?.querySelectorAll('.animate-shimmer');
      expect(columns?.length).toBe(4);
    });

    it('should accept custom className', () => {
      const { container } = render(<SkeletonTable className="custom-table" />);

      const table = container.firstChild;
      expect(table).toHaveClass('custom-table');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<SkeletonTable ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('SkeletonList Component', () => {
    it('should render skeleton list', () => {
      const { container } = render(<SkeletonList />);

      const list = container.firstChild;
      expect(list).toBeInTheDocument();
    });

    it('should have list styling', () => {
      const { container } = render(<SkeletonList />);

      const list = container.firstChild;
      expect(list).toHaveClass('space-y-3');
    });

    it('should render default 5 items', () => {
      const { container } = render(<SkeletonList />);

      // Use a more specific selector to target just the list items, not nested skeletons
      const items = container.querySelectorAll('.space-y-3 > div');
      expect(items.length).toBe(5);
    });

    it('should render custom number of items', () => {
      const { container } = render(<SkeletonList items={3} />);

      // Use a more specific selector to target just the list items, not nested skeletons
      const items = container.querySelectorAll('.space-y-3 > div');
      expect(items.length).toBe(3);
    });

    it('should render 8 items when specified', () => {
      const { container } = render(<SkeletonList items={8} />);

      // Use a more specific selector to target just the list items, not nested skeletons
      const items = container.querySelectorAll('.space-y-3 > div');
      expect(items.length).toBe(8);
    });

    it('should render avatar in each item', () => {
      const { container } = render(<SkeletonList items={3} />);

      const avatars = container.querySelectorAll('.h-12.w-12');
      expect(avatars.length).toBe(3);
    });

    it('should render text skeletons in each item', () => {
      const { container } = render(<SkeletonList items={1} />);

      const item = container.querySelector('.space-y-3 > div');
      const textSkeletons = item?.querySelectorAll('.h-4');
      expect(textSkeletons?.length).toBe(2);
    });

    it('should accept custom className', () => {
      const { container } = render(<SkeletonList className="custom-list" />);

      const list = container.firstChild;
      expect(list).toHaveClass('custom-list');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<SkeletonList ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Neo Brutalism Styles', () => {
    it('should have 2px border on skeleton', () => {
      const { container } = render(<Skeleton />);

      const skeleton = container.firstChild;
      expect(skeleton).toHaveClass('border-2', 'border-nb-black');
    });

    it('should have 2px border on composed skeletons', () => {
      const { container } = render(<SkeletonCard />);

      const card = container.firstChild;
      expect(card).toHaveClass('border-2', 'border-nb-black');
    });

    it('should have hard shadow on skeleton card', () => {
      const { container } = render(<SkeletonCard />);

      const card = container.firstChild;
      expect(card).toHaveClass('shadow-nb-sm');
    });

    it('should have gray background', () => {
      const { container } = render(<Skeleton />);

      const skeleton = container.firstChild;
      expect(skeleton).toHaveClass('bg-nb-gray-300');
    });
  });

  describe('Multiple Skeleton Combinations', () => {
    it('should render multiple text skeletons with different widths', () => {
      const { container } = render(
        <div>
          <Skeleton variant="text" />
          <Skeleton variant="text" className="w-3/4" />
          <Skeleton variant="text" className="w-1/2" />
        </div>
      );

      const skeletons = container.querySelectorAll('.animate-shimmer');
      expect(skeletons.length).toBe(3);
    });

    it('should combine different skeleton types', () => {
      const { container } = render(
        <div>
          <Skeleton variant="avatar" />
          <Skeleton variant="heading" />
          <Skeleton variant="text" count={2} />
          <Skeleton variant="button" />
        </div>
      );

      const avatar = container.querySelector('.h-12.w-12');
      const heading = container.querySelector('.h-8');
      const button = container.querySelector('.h-12.w-24');

      expect(avatar).toBeInTheDocument();
      expect(heading).toBeInTheDocument();
      expect(button).toBeInTheDocument();
    });
  });

  describe('Loading State Simulation', () => {
    it('should simulate user profile loading', () => {
      const { container } = render(
        <div className="flex gap-4">
          <Skeleton variant="avatar" />
          <div className="flex-1">
            <Skeleton variant="heading" className="mb-2" />
            <Skeleton variant="text" count={2} />
          </div>
        </div>
      );

      const avatar = container.querySelector('.h-12.w-12');
      const heading = container.querySelector('.h-8');

      expect(avatar).toBeInTheDocument();
      expect(heading).toBeInTheDocument();
    });

    it('should simulate card grid loading', () => {
      const { container } = render(
        <div className="grid grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      );

      const cards = container.querySelectorAll('.border-2.border-nb-black.bg-nb-white');
      expect(cards.length).toBe(3);
    });

    it('should simulate data table loading', () => {
      render(<SkeletonTable rows={10} />);

      const { container } = render(<SkeletonTable rows={10} />);
      const rows = container.querySelectorAll('.border-b-2');
      // Header row (1) + data rows (10) = 11 total
      expect(rows.length).toBe(11);
    });
  });

  describe('Accessibility', () => {
    it('should be non-interactive', () => {
      const { container } = render(<Skeleton />);

      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton.tagName).toBe('DIV');
    });

    it('should have screen reader support', () => {
      const { container } = render(<Skeleton />);

      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveAttribute('role', 'status');
      expect(skeleton).toHaveAttribute('aria-label', 'Memuat...');
    });

    it('should be visually distinct as loading state', () => {
      const { container } = render(<Skeleton />);

      const skeleton = container.firstChild;
      expect(skeleton).toHaveClass('animate-shimmer');
    });
  });

  describe('Animation', () => {
    it('should have shimmer animation class', () => {
      const { container } = render(<Skeleton />);

      const skeleton = container.firstChild;
      expect(skeleton).toHaveClass('animate-shimmer');
    });

    it('should apply animation to all skeleton variants', () => {
      const variants = ['text', 'heading', 'card', 'avatar', 'button'] as const;

      variants.forEach((variant) => {
        const { container } = render(<Skeleton variant={variant} />);
        const skeleton = container.firstChild;
        expect(skeleton).toHaveClass('animate-shimmer');
      });
    });

    it('should apply animation to multiple skeletons', () => {
      const { container } = render(<Skeleton count={3} />);

      const skeletons = container.querySelectorAll('.animate-shimmer');
      skeletons.forEach((skeleton) => {
        expect(skeleton).toHaveClass('animate-shimmer');
      });
    });
  });
});
