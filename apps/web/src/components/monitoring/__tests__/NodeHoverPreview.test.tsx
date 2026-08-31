/**
 * Unit Tests: NodeHoverPreview (parity W5)
 *
 * Mobile shows a preview when a marker is TAPPED, because a tap is imprecise and
 * the map recenters first. Web keeps click → drill and puts the same information
 * on hover, so the value ("see what this is before you commit") arrives without
 * an extra click.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NodeHoverPreview } from '../NodeHoverPreview';
import type { NodeMarker } from '../NodeMarkerLayer';

const node = (over: Partial<NodeMarker> = {}): NodeMarker =>
  ({
    id: 'n1',
    name: 'Taman Bungkul',
    variant: 'location',
    lat: -7.29,
    lng: 112.73,
    scheduled: 3,
    clocked_in: 1,
    belum_hadir: 2,
    tidak_hadir: 0,
    active: 1,
    active_inside: 1,
    ...over,
  }) as NodeMarker;

const CURSOR = { x: 100, y: 100 };

describe('NodeHoverPreview', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  });

  it('renders nothing without a node', () => {
    render(<NodeHoverPreview node={null} cursor={CURSOR} />);
    expect(screen.queryByTestId('node-hover-preview')).not.toBeInTheDocument();
  });

  it('renders nothing without a cursor', () => {
    render(<NodeHoverPreview node={node()} cursor={null} />);
    expect(screen.queryByTestId('node-hover-preview')).not.toBeInTheDocument();
  });

  it('names the node and its roster', () => {
    render(<NodeHoverPreview node={node()} cursor={CURSOR} />);
    expect(screen.getByText('Taman Bungkul')).toBeInTheDocument();
    expect(screen.getByTestId('node-hover-preview')).toHaveTextContent('3');
    expect(screen.getByTestId('node-hover-preview')).toHaveTextContent('1');
  });

  /**
   * Regression: the type label reads `areaDetail.${variant}`, and the locale
   * carried `area` (a leftover from the Area→Location rename) while the variant
   * is `location`. Every lokasi therefore rendered the raw key
   * "areaDetail.location". The i18n call-site guard cannot see this — the key is
   * a template literal, which it skips rather than guess at.
   */
  it.each(['district', 'region', 'location', 'surabaya'] as const)(
    'resolves a real label for the %s variant, never a raw key',
    (variant) => {
      render(<NodeHoverPreview node={node({ variant })} cursor={CURSOR} />);
      const card = screen.getByTestId('node-hover-preview');
      expect(card).not.toHaveTextContent('areaDetail.');
    },
  );

  it('flips left of the cursor near the right edge, so it is not clipped', () => {
    render(<NodeHoverPreview node={node()} cursor={{ x: 1270, y: 100 }} />);
    const card = screen.getByTestId('node-hover-preview');
    expect(parseInt(card.style.left, 10)).toBeLessThan(1270);
  });

  it('flips above the cursor near the bottom edge', () => {
    render(<NodeHoverPreview node={node()} cursor={{ x: 100, y: 790 }} />);
    const card = screen.getByTestId('node-hover-preview');
    expect(parseInt(card.style.top, 10)).toBeLessThan(790);
  });

  it('never becomes a hover target itself', () => {
    // If the card could receive the pointer it would sit under the cursor, fire
    // mouseleave on the pin, and flicker between shown and hidden.
    render(<NodeHoverPreview node={node()} cursor={CURSOR} />);
    expect(screen.getByTestId('node-hover-preview').className).toContain('pointer-events-none');
  });
});
