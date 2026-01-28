import { render, screen, fireEvent } from '@testing-library/react';
import { NBBadge } from '../NBBadge';

describe('NBBadge', () => {
  it('renders children content', () => {
    render(<NBBadge>Active</NBBadge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders all variants', () => {
    const variants = ['primary', 'success', 'warning', 'danger', 'neutral'] as const;
    variants.forEach((variant) => {
      const { unmount } = render(<NBBadge variant={variant}>{variant}</NBBadge>);
      expect(screen.getByText(variant)).toBeInTheDocument();
      unmount();
    });
  });

  it('renders all sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    sizes.forEach((size) => {
      const { unmount } = render(<NBBadge size={size}>{size}</NBBadge>);
      expect(screen.getByText(size)).toBeInTheDocument();
      unmount();
    });
  });

  it('renders with dot indicator', () => {
    const { container } = render(<NBBadge dot>Online</NBBadge>);
    expect(container.querySelector('.w-2.h-2')).toBeInTheDocument();
  });

  it('renders with icon', () => {
    render(<NBBadge icon={<span data-testid="icon">★</span>}>Star</NBBadge>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders remove button when onRemove provided', () => {
    const handleRemove = jest.fn();
    render(<NBBadge onRemove={handleRemove}>Removable</NBBadge>);
    expect(screen.getByLabelText('Remove')).toBeInTheDocument();
  });

  it('calls onRemove when remove button clicked', () => {
    const handleRemove = jest.fn();
    render(<NBBadge onRemove={handleRemove}>Removable</NBBadge>);
    fireEvent.click(screen.getByLabelText('Remove'));
    expect(handleRemove).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    const { container } = render(<NBBadge className="custom">Badge</NBBadge>);
    expect(container.firstChild).toHaveClass('custom');
  });

  it('applies uppercase styling', () => {
    const { container } = render(<NBBadge>active</NBBadge>);
    expect(container.firstChild).toHaveClass('uppercase');
  });
});
