/**
 * Unit tests: NodeMarkerLayer node markers (ADR-051). Each rayon/kawasan/lokasi
 * renders ONE unified pin — a code-drawn teardrop filled with the area's identity
 * color, its glyph, a staffing-health outline + active-count badge — the same
 * builder the editor uses. Empty lokasi collapse to a muted dot.
 */
/* eslint-disable sekar-design/no-inline-hex-colors -- test fixtures for marker fill colors, not UI tokens */
import { render } from '@testing-library/react';
import { NodeMarkerLayer, type NodeMarker } from '../NodeMarkerLayer';
import { HEALTH_COLORS } from '@/lib/monitoring/markers';

const mockIcons: Array<{ url: string }> = [];
const mockLabels: Array<{ text: string; color?: string } | undefined> = [];
const mockOpacities: Array<number | undefined> = [];
jest.mock('@react-google-maps/api', () => ({
  Marker: ({
    icon,
    label,
    opacity,
    onClick,
  }: {
    icon: { url: string };
    label?: { text: string; color?: string };
    opacity?: number;
    onClick?: () => void;
  }) => {
    mockIcons.push(icon);
    mockLabels.push(label);
    mockOpacities.push(opacity);
    return <button data-testid="marker" onClick={() => onClick?.()} />;
  },
  InfoWindow: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

beforeAll(() => {
  (global as unknown as { google: unknown }).google = {
    maps: { Size: class {}, Point: class {} },
  };
});

beforeEach(() => {
  mockIcons.length = 0;
  mockLabels.length = 0;
  mockOpacities.length = 0;
});

const makeNode = (over: Partial<NodeMarker>): NodeMarker => ({
  id: 'n1',
  name: 'Rayon X',
  variant: 'rayon',
  lat: -7.2,
  lng: 112.7,
  scheduled: 2,
  clocked_in: 2,
  belum_hadir: 0, tidak_hadir: 0,
  active: 2,
  active_inside: 1,
  ...over,
});

const svg = () => decodeURIComponent(mockIcons[0].url);

describe('NodeMarkerLayer unified pin', () => {
  it('draws a white pin whose glyph identifies the type (rayon → building)', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ variant: 'rayon' })]} />);
    const s = svg();
    expect(s).toContain('fill="#FFFFFF"'); // fill is white for all area types
    expect(s).toContain('M6 22V4'); // building glyph identifies rayon
  });

  it('puts staffing health on the outline ring, not the fill', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ scheduled: 2, clocked_in: 2 })]} />);
    expect(svg()).toContain(`stroke="${HEALTH_COLORS.ok}"`); // health = outline
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

  it('outlines red when nobody clocked in for a scheduled node', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ scheduled: 3, clocked_in: 0, active: 0 })]} />);
    expect(svg()).toContain(HEALTH_COLORS.none);
  });

  it('labels the node with its name, colored by staffing health', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ scheduled: 2, clocked_in: 2 })]} />);
    expect(mockLabels[0]?.text).toBe('Rayon X');
    expect(mockLabels[0]?.color).toBe(HEALTH_COLORS.ok);
  });

  it('dims non-matching nodes when a geo filter spotlights one (labels stay)', () => {
    render(
      <NodeMarkerLayer
        nodes={[makeNode({ id: 'r1', name: 'Match' }), makeNode({ id: 'r2', name: 'Other' })]}
        activeGeoId="r1"
      />
    );
    expect(mockOpacities).toEqual([1, 0.3]); // match full, other dimmed
    // Every node keeps its name label (dimming only lowers the icon opacity).
    expect(mockLabels[0]?.text).toBe('Match');
    expect(mockLabels[1]?.text).toBe('Other');
  });

  it('keeps every node at full opacity when no geo filter is set', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ id: 'r1' }), makeNode({ id: 'r2' })]} />);
    expect(mockOpacities).toEqual([1, 1]);
  });

  it('labels kawasan at every zoom, like rayon', () => {
    const kawasan = makeNode({ variant: 'region', name: 'Kawasan Mulyosari', active: 1 });
    const { rerender } = render(<NodeMarkerLayer nodes={[kawasan]} zoom={13} />);
    expect(mockLabels[0]?.text).toBe('Kawasan Mulyosari');
    mockLabels.length = 0;
    rerender(<NodeMarkerLayer nodes={[kawasan]} zoom={15} />);
    expect(mockLabels[0]?.text).toBe('Kawasan Mulyosari');
  });

  it('renders an empty lokasi as its glyph pin (no white-dot fallback) with a label', () => {
    render(
      <NodeMarkerLayer
        nodes={[makeNode({ variant: 'area', name: 'Taman Kosong', scheduled: 0, clocked_in: 0, active: 0 })]}
        zoom={16}
      />
    );
    // The unified teardrop pin, not the old 12px muted dot.
    expect(svg()).toContain('M24 2C12.4 2');
    expect(svg()).not.toContain('width="12"');
    expect(mockLabels[0]?.text).toBe('Taman Kosong');
  });

  it('renders a custom-glyph area even when empty (not a muted dot)', () => {
    render(
      <NodeMarkerLayer
        nodes={[makeNode({ variant: 'area', scheduled: 0, active: 0, marker_icon: 'star' })]}
        zoom={16}
      />
    );
    expect(svg()).toContain('M12 2.5l2.9'); // star, not a dot
  });
});
