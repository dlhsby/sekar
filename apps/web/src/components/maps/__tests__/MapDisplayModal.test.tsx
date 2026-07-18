/**
 * Unit tests: MapDisplayModal boundary + marker preview. When given a boundary
 * and entity styling it draws the polygon with the configured border/fill colors
 * and renders the entity's marker image (or the per-kind system default), instead
 * of a bare Google pin. Google Maps JS + the `google` global are mocked.
 */
/* eslint-disable sekar-design/no-inline-hex-colors -- test fixtures for Google Maps overlay colors, not UI tokens */
import { render, screen } from '@testing-library/react';
import { MapDisplayModal } from '../MapDisplayModal';

let lastPolygonOptions: google.maps.PolygonOptions | undefined;

jest.mock('@/components/maps/GoogleMapsGate', () => ({
  GoogleMapsGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('@react-google-maps/api', () => ({
  GoogleMap: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Polygon: ({ options }: { options: google.maps.PolygonOptions }) => {
    lastPolygonOptions = options;
    return <div data-testid="polygon" />;
  },
}));
jest.mock('../AdvancedMarker', () => ({
  AdvancedMarker: ({ content }: { content?: HTMLImageElement | null }) => (
    <div data-testid="marker" data-src={content?.src ?? ''} />
  ),
}));
jest.mock('@/lib/api/config', () => ({ useMapId: () => null }));
jest.mock('@/components/ui', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

const boundary: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [[[112.7, -7.25], [112.76, -7.25], [112.76, -7.29], [112.7, -7.29], [112.7, -7.25]]],
};

beforeEach(() => {
  lastPolygonOptions = undefined;
});

describe('MapDisplayModal preview', () => {
  it('draws the boundary polygon with the configured border + fill colors', () => {
    render(
      <MapDisplayModal
        open
        onOpenChange={() => {}}
        lat={-7.26}
        lng={112.74}
        boundary={boundary}
        borderColor="#1b6f1c"
        fillColor="#1b6f1c"
        fillOpacity={0.3}
        entityKind="rayon"
      />
    );
    expect(screen.getByTestId('polygon')).toBeInTheDocument();
    expect(lastPolygonOptions?.strokeColor).toBe('#1b6f1c');
    expect(lastPolygonOptions?.fillColor).toBe('#1b6f1c');
    expect(lastPolygonOptions?.fillOpacity).toBe(0.3);
  });

  it('previews the per-kind default marker when none is configured (rayon → pin-orange)', () => {
    render(
      <MapDisplayModal open onOpenChange={() => {}} lat={-7.26} lng={112.74} entityKind="rayon" />
    );
    expect(screen.getByTestId('marker').getAttribute('data-src')).toContain('pin-orange.svg');
  });

  it('previews a configured custom marker image over the default', () => {
    render(
      <MapDisplayModal
        open
        onOpenChange={() => {}}
        lat={-7.26}
        lng={112.74}
        entityKind="rayon"
        markerImageUrl="/uploads/custom-rayon.png"
      />
    );
    expect(screen.getByTestId('marker').getAttribute('data-src')).toContain('custom-rayon.png');
  });

  it('renders no polygon when no boundary is given', () => {
    render(<MapDisplayModal open onOpenChange={() => {}} lat={-7.26} lng={112.74} />);
    expect(screen.queryByTestId('polygon')).not.toBeInTheDocument();
  });
});
