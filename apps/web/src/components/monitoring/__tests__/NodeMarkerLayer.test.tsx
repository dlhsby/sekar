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
jest.mock('@react-google-maps/api', () => ({
  Marker: ({
    icon,
    label,
    onClick,
  }: {
    icon: { url: string };
    label?: { text: string; color?: string };
    onClick?: () => void;
  }) => {
    mockIcons.push(icon);
    mockLabels.push(label);
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
});

const makeNode = (over: Partial<NodeMarker>): NodeMarker => ({
  id: 'n1',
  name: 'Rayon X',
  variant: 'rayon',
  lat: -7.2,
  lng: 112.7,
  scheduled: 2,
  clocked_in: 2,
  not_clocked_in: 0,
  active: 2,
  active_inside: 1,
  ...over,
});

const svg = () => decodeURIComponent(mockIcons[0].url);

describe('NodeMarkerLayer unified pin', () => {
  it('fills the pin with the area identity color and its default glyph (rayon → building)', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ variant: 'rayon', marker_color: '#1b6f1c' })]} />);
    const s = svg();
    expect(s).toContain('fill="#1b6f1c"'); // teardrop filled with identity color
    expect(s).toContain('M6 22V4'); // building glyph
  });

  it('draws the configured glyph over the default (marker_icon = star)', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ marker_icon: 'star', marker_color: '#9333EA' })]} />);
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

  it('labels kawasan at every zoom, like rayon', () => {
    const kawasan = makeNode({ variant: 'region', name: 'Kawasan Mulyosari', active: 1 });
    const { rerender } = render(<NodeMarkerLayer nodes={[kawasan]} zoom={13} />);
    expect(mockLabels[0]?.text).toBe('Kawasan Mulyosari');
    mockLabels.length = 0;
    rerender(<NodeMarkerLayer nodes={[kawasan]} zoom={15} />);
    expect(mockLabels[0]?.text).toBe('Kawasan Mulyosari');
  });

  it('renders an empty lokasi as a muted dot with no label', () => {
    render(
      <NodeMarkerLayer nodes={[makeNode({ variant: 'area', scheduled: 0, clocked_in: 0, active: 0 })]} zoom={16} />
    );
    expect(svg()).toContain('width="12"'); // muted dot
    expect(mockLabels[0]).toBeUndefined();
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
