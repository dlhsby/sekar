import { render, screen, fireEvent } from '@testing-library/react';
import { NBButton } from '../NBButton';

describe('NBButton', () => {
  describe('Rendering', () => {
    it('renders with children', () => {
      render(<NBButton>Click me</NBButton>);
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('renders with default variant and size', () => {
      render(<NBButton>Button</NBButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-nb-primary');
      expect(button).toHaveClass('h-12');
    });

    it('renders all variants correctly', () => {
      const variants = ['primary', 'secondary', 'danger', 'ghost', 'text'] as const;
      variants.forEach((variant) => {
        const { unmount } = render(<NBButton variant={variant}>{variant}</NBButton>);
        expect(screen.getByText(variant)).toBeInTheDocument();
        unmount();
      });
    });

    it('renders all sizes correctly', () => {
      const sizes = ['sm', 'md', 'lg'] as const;
      sizes.forEach((size) => {
        const { unmount } = render(<NBButton size={size}>{size}</NBButton>);
        expect(screen.getByText(size)).toBeInTheDocument();
        unmount();
      });
    });

    it('renders with left icon', () => {
      render(
        <NBButton leftIcon={<span data-testid="left-icon">←</span>}>
          With Icon
        </NBButton>
      );
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('renders with right icon', () => {
      render(
        <NBButton rightIcon={<span data-testid="right-icon">→</span>}>
          With Icon
        </NBButton>
      );
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });
  });

  describe('States', () => {
    it('applies disabled attribute', () => {
      render(<NBButton disabled>Disabled</NBButton>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('renders loading state', () => {
      render(<NBButton loading>Loading</NBButton>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('hides icons when loading', () => {
      render(
        <NBButton loading leftIcon={<span data-testid="icon">←</span>}>
          Loading
        </NBButton>
      );
      expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
    });

    it('applies fullWidth class', () => {
      render(<NBButton fullWidth>Full Width</NBButton>);
      expect(screen.getByRole('button')).toHaveClass('w-full');
    });
  });

  describe('Interactions', () => {
    it('handles click events', () => {
      const handleClick = jest.fn();
      render(<NBButton onClick={handleClick}>Click me</NBButton>);
      fireEvent.click(screen.getByText('Click me'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not trigger click when disabled', () => {
      const handleClick = jest.fn();
      render(
        <NBButton disabled onClick={handleClick}>
          Disabled
        </NBButton>
      );
      fireEvent.click(screen.getByText('Disabled'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('does not trigger click when loading', () => {
      const handleClick = jest.fn();
      render(
        <NBButton loading onClick={handleClick}>
          Loading
        </NBButton>
      );
      fireEvent.click(screen.getByText('Loading'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has correct role', () => {
      render(<NBButton>Accessible</NBButton>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('supports custom aria labels', () => {
      render(<NBButton aria-label="Custom Label">Button</NBButton>);
      expect(screen.getByLabelText('Custom Label')).toBeInTheDocument();
    });

    it('can be focused', () => {
      render(<NBButton>Focus me</NBButton>);
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      render(<NBButton className="custom-class">Button</NBButton>);
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });

    it('ghost variant has no shadow', () => {
      render(<NBButton variant="ghost">Ghost</NBButton>);
      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('shadow-nb-md');
    });

    it('text variant has no shadow', () => {
      render(<NBButton variant="text">Text</NBButton>);
      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('shadow-nb-md');
    });
  });

  describe('HTML Attributes', () => {
    it('supports type attribute', () => {
      render(<NBButton type="submit">Submit</NBButton>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });

    it('forwards ref correctly', () => {
      const ref = jest.fn();
      render(<NBButton ref={ref}>Button</NBButton>);
      expect(ref).toHaveBeenCalled();
    });
  });
});
