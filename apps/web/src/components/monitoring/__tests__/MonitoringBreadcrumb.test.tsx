/**
 * The drill breadcrumb — rendered both above the map and in the list panel's
 * header. It exists as one component precisely so those two can never disagree
 * about where the operator is.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { MonitoringBreadcrumb, type Crumb } from '../MonitoringBreadcrumb';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

const trail = (onCity = jest.fn(), onRayon = jest.fn()): Crumb[] => [
  { key: 'city', label: 'Surabaya', onClick: onCity },
  { key: 'district', label: 'Rayon Barat 2', onClick: onRayon },
  // No onClick — this is where you already are.
  { key: 'region', label: 'Kawasan Tandes' },
];

describe('MonitoringBreadcrumb', () => {
  it('marks the deepest crumb as the current page, and does not make it a link', () => {
    render(<MonitoringBreadcrumb crumbs={trail()} canGoBack onBack={jest.fn()} />);
    // Two nodes carry the current label in the map variant — the mobile-only
    // span and the desktop trail — with CSS choosing between them. Both must
    // agree that this is where you are, and neither may be clickable.
    const current = screen.getAllByText('Kawasan Tandes');
    expect(current).toHaveLength(2);
    for (const el of current) {
      expect(el).toHaveAttribute('aria-current', 'page');
      expect(el.tagName).not.toBe('BUTTON');
    }
  });

  it('jumps straight to an ancestor rather than stepping back to it', () => {
    // The reason the trail is clickable at all: from three levels deep, getting
    // back to Surabaya should be one press, not three.
    const onCity = jest.fn();
    render(<MonitoringBreadcrumb crumbs={trail(onCity)} canGoBack onBack={jest.fn()} />);
    fireEvent.click(screen.getByText('Surabaya'));
    expect(onCity).toHaveBeenCalled();
  });

  it('goes back one step from the back button', () => {
    const onBack = jest.fn();
    render(<MonitoringBreadcrumb crumbs={trail()} canGoBack onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: 'monitoring:page.backLabel' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('hides the back button at the top of the operator\'s own hierarchy', () => {
    // A rayon-scoped operator floors at their rayon; there is nothing above it
    // for them, so offering a way up would lead somewhere they cannot go.
    render(<MonitoringBreadcrumb crumbs={trail()} canGoBack={false} onBack={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'monitoring:page.backLabel' })).toBeNull();
  });

  it('keeps the whole trail in the compact panel variant', () => {
    // The map's bar can drop intermediate crumbs on a narrow screen because the
    // ‹ button covers going up. The panel is narrow at EVERY size, so dropping
    // them there would mean never showing a trail at all — it scrolls instead.
    const { container } = render(
      <MonitoringBreadcrumb crumbs={trail()} canGoBack onBack={jest.fn()} compact />
    );
    expect(container.querySelector('.sm\\:hidden')).toBeNull();
    for (const label of ['Surabaya', 'Rayon Barat 2', 'Kawasan Tandes']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('survives an empty trail', () => {
    render(<MonitoringBreadcrumb crumbs={[]} canGoBack={false} onBack={jest.fn()} />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});
