/**
 * Unit tests: NodeMarkerLayer node markers. Each rayon/kawasan/lokasi renders the
 * SAME marker the settings/edit screens show — its configured `marker_image_url`,
 * or the per-kind system default pin (rayon → orange, kawasan → yellow, lokasi →
 * green) — with a staffing-health-tinted name label. Empty lokasi collapse to a
 * muted dot to fight clutter.
 */
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

const url = () => mockIcons[0].url;

describe('NodeMarkerLayer marker image', () => {
  it('renders the per-kind default pin when no custom marker is set (rayon → orange)', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ variant: 'rayon' })]} />);
    expect(url()).toContain('pin-orange.svg');
  });

  it('renders the kawasan (yellow) and lokasi (green) defaults', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ variant: 'region' })]} zoom={15} />);
    expect(url()).toContain('pin-yellow.svg');
    mockIcons.length = 0;
    render(<NodeMarkerLayer nodes={[makeNode({ variant: 'area', scheduled: 1, active: 1 })]} zoom={15} />);
    expect(url()).toContain('pin-green.svg');
  });

  it('renders a configured custom marker image over the default', () => {
    render(
      <NodeMarkerLayer nodes={[makeNode({ variant: 'rayon', marker_image_url: '/uploads/custom.png' })]} />
    );
    expect(url()).toBe('/uploads/custom.png');
  });

  it('labels the node with its name, colored by staffing health (green when fully attended)', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ scheduled: 2, clocked_in: 2 })]} />);
    expect(mockLabels[0]?.text).toBe('Rayon X');
    expect(mockLabels[0]?.color).toBe(HEALTH_COLORS.ok);
  });

  it('colors the label red when nobody clocked in for a scheduled node', () => {
    render(<NodeMarkerLayer nodes={[makeNode({ scheduled: 3, clocked_in: 0, active: 0 })]} />);
    expect(mockLabels[0]?.color).toBe(HEALTH_COLORS.none);
  });

  it('labels kawasan at every zoom, just like rayon', () => {
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
    expect(decodeURIComponent(url())).toContain('width="12"'); // muted dot SVG
    expect(mockLabels[0]).toBeUndefined();
  });

  it('renders a custom marker on an otherwise-empty area (not a muted dot)', () => {
    render(
      <NodeMarkerLayer
        nodes={[makeNode({ variant: 'area', scheduled: 0, active: 0, marker_image_url: '/uploads/x.png' })]}
        zoom={16}
      />
    );
    expect(url()).toBe('/uploads/x.png');
  });
});
