/**
 * Unit tests: NodeMarkerLayer node markers (ADR-051). Each district/kawasan/lokasi
 * renders ONE unified pin — a code-drawn teardrop filled with the area's identity
 * color, its glyph, a staffing-health outline + active-count badge — the same
 * builder the editor uses. Empty lokasi draw their glyph pin (no muted dot).
 *
 * Rendered on AdvancedMarkerElement: the pin SVG + name label live in the marker's
 * `content` DOM element, which these tests inspect (was: a legacy `Marker` icon URL).
 */
/* eslint-disable sekar-design/no-inline-hex-colors -- test fixtures for marker fill colors, not UI tokens */
import { render } from '@testing-library/react';
import { NodeMarkerLayer, type NodeMarker } from '../NodeMarkerLayer';
import { HEALTH_COLORS, MARKER_NEUTRAL_OUTLINE } from '@/lib/monitoring/markers';

interface CapturedMarker {
  content: HTMLElement;
  onClick?: () => void;
  zIndex?: number;
  title?: string;
}
const markers: CapturedMarker[] = [];
jest.mock('@/components/maps/AdvancedMarker', () => ({
  AdvancedMarker: (p: CapturedMarker) => {
    markers.push(p);
    return <button data-testid="marker" onClick={() => p.onClick?.()} />;
  },
}));

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

beforeEach(() => {
  markers.length = 0;
});

const makeNode = (over: Partial<NodeMarker>): NodeMarker => ({
  id: 'n1',
  name: 'Rayon X',
  variant: 'district',
  lat: -7.2,
  lng: 112.7,
  scheduled: 2,
  clocked_in: 2,
  belum_hadir: 0, tidak_hadir: 0,
  active: 2,
  active_inside: 1,
  ...over,
});

// The pin SVG lives inside the marker's content element.
const svg = (i = 0) => markers[i].content.innerHTML;
const labelEl = (i = 0) => markers[i].content.querySelector('.am-label') as HTMLElement | null;
const labelText = (i = 0) => labelEl(i)?.textContent ?? undefined;
const opacity = (i = 0) => markers[i].content.style.opacity;
// Normalize an expected color through jsdom's CSSOM so the comparison is agnostic
// to whether it stores hex or rgb().
const asCss = (color: string) => {
  const d = document.createElement('div');
  d.style.color = color;
  return d.style.color;
};

describe('NodeMarkerLayer unified pin', () => {
  it('draws a white pin whose glyph identifies the type (district → building)', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ variant: 'district' })]} />);
    const s = svg();
    expect(s).toContain('#FFFFFF'); // fill is white for all area types
    expect(s).toContain('M6 22V4'); // building glyph identifies district
  });

  it('keeps the ring NEUTRAL (identity = fill_color) with staffing health on the badge', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ scheduled: 2, clocked_in: 2, active: 2 })]} />);
    const s = svg();
    expect(s).toContain(`stroke="${MARKER_NEUTRAL_OUTLINE}"`); // ring is neutral, not health/border
    expect(s).not.toContain(`stroke="${HEALTH_COLORS.ok}"`); // health never rides the ring
    expect(s).toContain(HEALTH_COLORS.ok); // health lives on the count badge instead
  });

  it('draws the configured glyph over the default (marker_icon = star)', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ marker_icon: 'star', fill_color: '#9333EA' })]} />);
    expect(svg()).toContain('M12 2.5l2.9'); // star path fragment
  });

  it('rides the active count on a health-colored badge', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ active: 3, scheduled: 4, clocked_in: 4 })]} />);
    const s = svg();
    expect(s).toContain('>3<'); // count badge
    expect(s).toContain(HEALTH_COLORS.ok); // badge/outline health color (fully attended)
  });

  it('signals "nobody clocked in" via the health-tinted name label (ring stays neutral)', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ scheduled: 3, clocked_in: 0, active: 0 })]} />);
    // No active count → no badge; the neutral ring carries no health color, so the
    // understaffed (none) signal reads from the health-tinted name label.
    expect(svg()).toContain(`stroke="${MARKER_NEUTRAL_OUTLINE}"`);
    expect(labelEl()?.style.color).toBe(asCss(HEALTH_COLORS.none));
  });

  it('labels the node with its name, colored by staffing health', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ scheduled: 2, clocked_in: 2 })]} />);
    expect(labelText()).toBe('Rayon X');
    expect(labelEl()?.style.color).toBe(asCss(HEALTH_COLORS.ok));
  });

  it('dims non-matching nodes when a geo filter spotlights one (labels stay)', () => {
    render(
      <NodeMarkerLayer
        nodes={[makeNode({ id: 'r1', name: 'Match' }), makeNode({ id: 'r2', name: 'Other' })]}
        activeGeoId="r1"
      />
    );
    expect([opacity(0), opacity(1)]).toEqual(['1', '0.3']); // match full, other dimmed
    // Every node keeps its name label (dimming only lowers the container opacity).
    expect(labelText(0)).toBe('Match');
    expect(labelText(1)).toBe('Other');
  });

  it('keeps every node at full opacity when no geo filter is set', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ id: 'r1' }), makeNode({ id: 'r2' })]} />);
    expect([opacity(0), opacity(1)]).toEqual(['1', '1']);
  });

  it('labels kawasan at every zoom, like district', () => {
    const kawasan = makeNode({ variant: 'region', name: 'Kawasan Mulyosari', active: 1 });
    const { rerender } = render(<NodeMarkerLayer nodes={[kawasan]} zoom={13} />);
    expect(labelText()).toBe('Kawasan Mulyosari');
    markers.length = 0;
    rerender(<NodeMarkerLayer nodes={[kawasan]} zoom={15} />);
    expect(labelText()).toBe('Kawasan Mulyosari');
  });

  it('renders an empty lokasi as its glyph pin (no white-dot fallback) with a label', () => {
    render(
      <NodeMarkerLayer
        nodes={[makeNode({ variant: 'location', name: 'Taman Kosong', scheduled: 0, clocked_in: 0, active: 0 })]}
        zoom={16}
      />
    );
    // The unified teardrop pin, not the old 12px muted dot.
    expect(svg()).toContain('M24 2C12.4 2');
    expect(svg()).not.toContain('width="12"');
    expect(labelText()).toBe('Taman Kosong');
  });

  it('renders a custom-glyph location even when empty (not a muted dot)', () => {
    render(
      <NodeMarkerLayer
        nodes={[makeNode({ variant: 'location', scheduled: 0, active: 0, marker_icon: 'star' })]}
        zoom={16}
      />
    );
    expect(svg()).toContain('M12 2.5l2.9'); // star, not a dot
  });
});
