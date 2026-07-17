/**
 * Unit tests: NodeMarkerLayer node markers (ADR-046). The rayon/kawasan/lokasi
 * markers render a status-tinted count marker (active worker count + health ring)
 * — NOT the old attendance-ratio bubble. The ring health still derives from the
 * roster (clocked_in vs scheduled), so an area whose workers went offline still
 * reads green, and empty lokasi collapse to a muted dot to fight clutter.
 */
import { render } from '@testing-library/react';
import { NodeMarkerLayer, type NodeMarker } from '../NodeMarkerLayer';
import { HEALTH_COLORS } from '@/lib/monitoring/markers';

const mockIcons: Array<{ url: string }> = [];
const mockLabels: Array<{ text: string } | undefined> = [];
jest.mock('@react-google-maps/api', () => ({
  Marker: ({
    icon,
    label,
    onClick,
  }: {
    icon: { url: string };
    label?: { text: string };
    onClick?: () => void;
  }) => {
    mockIcons.push(icon);
    mockLabels.push(label);
    return <button data-testid="marker" onClick={() => onClick?.()} />;
  },
  InfoWindow: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

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

const iconSvg = () => decodeURIComponent(mockIcons[0].url);

describe('NodeMarkerLayer count marker', () => {
  it('shows the active worker count, not an attendance ratio', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ active: 3, scheduled: 4, clocked_in: 4 })]} />);
    const svg = iconSvg();
    expect(svg).toContain('>3<'); // active count
    expect(svg).not.toMatch(/>\d+\/\d+</); // no ratio "3/4"
  });

  it('colors the ring by roster health (green when clocked_in >= scheduled, even if offline)', () => {
    // Two scheduled, both clocked in but only 1 active-inside → still fully attended.
    render(<NodeMarkerLayer nodes={[makeNode({ scheduled: 2, clocked_in: 2, active: 1 })]} />);
    expect(iconSvg()).toContain(HEALTH_COLORS.ok);
  });

  it('colors the ring red (none) when nobody clocked in for a scheduled area', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ scheduled: 3, clocked_in: 0, active: 0 })]} />);
    expect(iconSvg()).toContain(HEALTH_COLORS.none);
  });

  it('renders a configured marker_icon (glyph) with the active count as a badge', () => {
    render(
      <NodeMarkerLayer nodes={[makeNode({ variant: 'region', marker_icon: 'trees', active: 3 })]} />
    );
    const svg = iconSvg();
    expect(svg).toContain('<path'); // the glyph is drawn
    expect(svg).toContain('>3<'); // active count rides a badge
  });

  it('renders a configured icon even when nothing is scheduled (no muted dot)', () => {
    render(
      <NodeMarkerLayer
        nodes={[makeNode({ variant: 'region', marker_icon: 'trees', scheduled: 0, active: 0 })]}
      />
    );
    const svg = iconSvg();
    expect(svg).toContain('<path');
    expect(svg).not.toContain('width="12"'); // not the muted dot
  });

  it('renders the system-default glyph per kind when no marker_icon is set (rayon → building)', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ variant: 'rayon', marker_icon: null, active: 2 })]} />);
    const svg = iconSvg();
    expect(svg).toContain('<path'); // building glyph, not a bare number
    expect(svg).toContain('>2<'); // active count badge
  });

  it('labels a rayon marker with its name (always, regardless of zoom)', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ variant: 'rayon', name: 'Rayon Timur 2' })]} zoom={11} />);
    expect(mockLabels[0]?.text).toBe('Rayon Timur 2');
  });

  it('hides a kawasan label at drill-fit zoom and reveals it when zoomed in', () => {
    const kawasan = makeNode({ variant: 'region', name: 'Kawasan Mulyosari', marker_icon: 'trees', active: 1 });
    const { rerender } = render(<NodeMarkerLayer nodes={[kawasan]} zoom={13} />);
    expect(mockLabels[0]).toBeUndefined(); // collides at fit zoom → hidden
    mockLabels.length = 0;
    rerender(<NodeMarkerLayer nodes={[kawasan]} zoom={15} />);
    expect(mockLabels[0]?.text).toBe('Kawasan Mulyosari'); // spread out → shown
  });

  it('never labels an empty muted-dot lokasi', () => {
    render(
      <NodeMarkerLayer nodes={[makeNode({ variant: 'area', scheduled: 0, clocked_in: 0, active: 0 })]} zoom={16} />
    );
    expect(mockLabels[0]).toBeUndefined();
  });

  it('renders a custom marker_image_url literally as the pin icon', () => {
    render(
      <NodeMarkerLayer
        nodes={[makeNode({ variant: 'area', marker_image_url: 'https://cdn.example/park.png', active: 0 })]}
        zoom={16}
      />
    );
    expect(mockIcons[0].url).toBe('https://cdn.example/park.png');
  });

  it('renders an empty lokasi as a muted dot with no count', () => {
    render(
      <NodeMarkerLayer nodes={[makeNode({ variant: 'area', scheduled: 0, clocked_in: 0, active: 0 })]} />
    );
    const svg = iconSvg();
    expect(svg).toContain('width="12"'); // small dot
    expect(svg).not.toContain('<text'); // no number
  });
});
