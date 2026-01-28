import { render, screen, fireEvent } from '@testing-library/react';
import { NBCard, NBCardHeader, NBCardContent, NBCardFooter } from '../NBCard';

describe('NBCard', () => {
  describe('Rendering', () => {
    it('renders children content', () => {
      render(<NBCard>Card Content</NBCard>);
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('renders with header prop', () => {
      render(<NBCard header={<div>Header Content</div>}>Content</NBCard>);
      expect(screen.getByText('Header Content')).toBeInTheDocument();
    });

    it('renders with footer prop', () => {
      render(<NBCard footer={<div>Footer Content</div>}>Content</NBCard>);
      expect(screen.getByText('Footer Content')).toBeInTheDocument();
    });

    it('renders all variants correctly', () => {
      const variants = ['elevated', 'outlined', 'filled'] as const;
      variants.forEach((variant) => {
        const { unmount } = render(<NBCard variant={variant}>{variant}</NBCard>);
        expect(screen.getByText(variant)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Interactive Mode', () => {
    it('applies interactive classes when interactive prop is true', () => {
      const { container } = render(<NBCard interactive>Interactive</NBCard>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('cursor-pointer');
    });

    it('handles click when interactive', () => {
      const handleClick = jest.fn();
      render(
        <NBCard interactive onClick={handleClick}>
          Click me
        </NBCard>
      );
      fireEvent.click(screen.getByText('Click me'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not apply interactive classes by default', () => {
      const { container } = render(<NBCard>Not Interactive</NBCard>);
      const card = container.firstChild as HTMLElement;
      expect(card).not.toHaveClass('cursor-pointer');
    });
  });

  describe('Card Sections', () => {
    it('renders NBCardHeader with border', () => {
      const { container } = render(<NBCardHeader>Header</NBCardHeader>);
      const header = container.firstChild as HTMLElement;
      expect(header).toHaveClass('border-b-2');
      expect(header).toHaveClass('font-bold');
    });

    it('renders NBCardContent with padding', () => {
      const { container } = render(<NBCardContent>Content</NBCardContent>);
      const content = container.firstChild as HTMLElement;
      expect(content).toHaveClass('p-4');
    });

    it('renders NBCardFooter with border and flex', () => {
      const { container } = render(<NBCardFooter>Footer</NBCardFooter>);
      const footer = container.firstChild as HTMLElement;
      expect(footer).toHaveClass('border-t-2');
      expect(footer).toHaveClass('flex');
    });

    it('renders complete card structure', () => {
      render(
        <NBCard>
          <NBCardHeader>Title</NBCardHeader>
          <NBCardContent>Main content here</NBCardContent>
          <NBCardFooter>
            <button>Action</button>
          </NBCardFooter>
        </NBCard>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Main content here')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies elevated variant styles', () => {
      const { container } = render(<NBCard variant="elevated">Content</NBCard>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('border-3');
      expect(card).toHaveClass('shadow-nb-sm');
    });

    it('applies outlined variant styles', () => {
      const { container } = render(<NBCard variant="outlined">Content</NBCard>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('border-3');
      expect(card).toHaveClass('shadow-none');
    });

    it('applies filled variant styles', () => {
      const { container } = render(<NBCard variant="filled">Content</NBCard>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('bg-nb-gray-50');
    });

    it('applies custom className', () => {
      const { container } = render(<NBCard className="custom-class">Content</NBCard>);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('forwards ref correctly', () => {
      const ref = jest.fn();
      render(<NBCard ref={ref}>Content</NBCard>);
      expect(ref).toHaveBeenCalled();
    });

    it('supports aria attributes', () => {
      render(
        <NBCard aria-label="Custom Card" role="article">
          Content
        </NBCard>
      );
      expect(screen.getByLabelText('Custom Card')).toBeInTheDocument();
      expect(screen.getByRole('article')).toBeInTheDocument();
    });
  });
});
