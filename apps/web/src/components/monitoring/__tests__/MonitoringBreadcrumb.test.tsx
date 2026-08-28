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

  it('shows ONLY the current level in the compact panel variant', () => {
    // The panel is narrow at every size, so a trail there could only be shown by
    // scrolling it sideways — and a breadcrumb you have to scroll has stopped
    // answering the question it exists for. Ancestors are reachable from the
    // map's bar above, and ‹ still goes up one.
    render(<MonitoringBreadcrumb crumbs={trail()} canGoBack onBack={jest.fn()} compact />);
    expect(screen.getByText('Kawasan Tandes')).toBeInTheDocument();
    expect(screen.queryByText('Surabaya')).toBeNull();
    expect(screen.queryByText('Rayon Barat 2')).toBeNull();
  });

  it('never scrolls, in either variant', () => {
    // Scrolling was the old answer to a trail that did not fit. It reads as a
    // stray scrollbar under the crumbs and hides the level you are on.
    for (const compact of [true, false]) {
      const { container, unmount } = render(
        <MonitoringBreadcrumb crumbs={trail()} canGoBack onBack={jest.fn()} compact={compact} />
      );
      expect(container.querySelector('.overflow-x-auto')).toBeNull();
      unmount();
    }
  });

  it('gives the current level the leftover width, and caps only the ancestors', () => {
    // The clipping defect: every crumb had a fixed max width, so the level you
    // are actually reading was cut ("Jl. Genteng Kali - Reto…") while ancestors
    // sat comfortably. Ancestors are context and may truncate; the current level
    // is the answer and truncates last.
    render(<MonitoringBreadcrumb crumbs={trail()} canGoBack onBack={jest.fn()} />);
    const current = screen.getAllByText('Kawasan Tandes').at(-1)!;
    expect(current.className).not.toMatch(/max-w-/);
    expect(screen.getByText('Surabaya').className).toMatch(/max-w-/);
  });

  it('survives an empty trail', () => {
    render(<MonitoringBreadcrumb crumbs={[]} canGoBack={false} onBack={jest.fn()} />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});
