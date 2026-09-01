/**
 * Unit tests: GoogleBoundaryEditor
 * The real component needs Google Maps JS + WebGL, so @react-google-maps/api and
 * the global `google` namespace are mocked. GoogleMapsGate is mocked to render
 * its children (key present). Drawing is manual map-click based (no deprecated
 * DrawingManager).
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { GoogleBoundaryEditor } from '../GoogleBoundaryEditor';

jest.mock('@/components/maps/GoogleMapsGate', () => ({
  GoogleMapsGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Each map click reports a slightly different point so a valid polygon forms.
let clickIndex = 0;
const CLICK_POINTS = [
  { lat: -7.28, lng: 112.74 },
  { lat: -7.28, lng: 112.75 },
  { lat: -7.29, lng: 112.75 },
];

jest.mock('@react-google-maps/api', () => ({
  GoogleMap: ({
    children,
    onClick,
  }: {
    children?: React.ReactNode;
    onClick?: (e: unknown) => void;
  }) => (
    <div
      data-testid="gmap"
      onClick={() => {
        const p = CLICK_POINTS[clickIndex % CLICK_POINTS.length];
        clickIndex += 1;
        onClick?.({ latLng: { lat: () => p.lat, lng: () => p.lng } });
      }}
    >
      {children}
    </div>
  ),
  Marker: ({ onDragEnd }: { onDragEnd?: (e: unknown) => void }) => (
    <div
      data-testid="marker"
      onClick={() => onDragEnd?.({ latLng: { lat: () => -7.31, lng: () => 112.81 } })}
    />
  ),
  Polygon: () => <div data-testid="polygon" />,
  Polyline: () => <div data-testid="polyline" />,
}));

// The editor now renders our imperative AdvancedMarker (not the lib's <Marker>).
// Mock it to a testable div that fires onDragEnd with a plain coord on click.
jest.mock('@/components/maps/AdvancedMarker', () => ({
  AdvancedMarker: ({ onDragEnd }: { onDragEnd?: (p: { lat: number; lng: number }) => void }) => (
    <div data-testid="marker" onClick={() => onDragEnd?.({ lat: -7.31, lng: 112.81 })} />
  ),
}));

// useMapId hits react-query/config; stub it (a Map ID isn't needed in unit tests).
jest.mock('@/lib/api/config', () => ({ useMapId: () => null }));

beforeAll(() => {
  (global as unknown as { google: unknown }).google = {
    maps: {
      Geocoder: class {
        geocode = jest
          .fn()
          .mockResolvedValue({ results: [{ geometry: { location: { lat: () => -7.2, lng: () => 112.7 } } }] });
      },
      LatLngBounds: class {
        extend = jest.fn();
      },
    },
  };
});

beforeEach(() => {
  clickIndex = 0;
});

const validPolygon: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [112.74, -7.28],
      [112.75, -7.28],
      [112.75, -7.29],
      [112.74, -7.28],
    ],
  ],
};

describe('GoogleBoundaryEditor', () => {
  it('renders draw toolbar + search when editable', () => {
    render(
      <GoogleBoundaryEditor pin={null} onPolygonChange={jest.fn()} onPinChange={jest.fn()} />
    );
    expect(screen.getByRole('button', { name: /gambar batas/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/cari lokasi/i)).toBeInTheDocument();
  });

  it('hides the toolbar in readonly mode', () => {
    render(<GoogleBoundaryEditor readonly initialPolygon={validPolygon} pin={{ lat: -7.28, lng: 112.74 }} />);
    expect(screen.queryByRole('button', { name: /gambar batas/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/cari lokasi/i)).not.toBeInTheDocument();
  });

  it('emits a GeoJSON polygon after drawing vertices and finishing', () => {
    const onPolygonChange = jest.fn();
    render(<GoogleBoundaryEditor pin={null} onPolygonChange={onPolygonChange} onPinChange={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /gambar batas/i }));
    const gmap = screen.getByTestId('gmap');
    fireEvent.click(gmap); // vertex 1
    fireEvent.click(gmap); // vertex 2
    fireEvent.click(gmap); // vertex 3

    fireEvent.click(screen.getByRole('button', { name: /selesai/i }));

    expect(onPolygonChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'Polygon' })
    );
    const poly = onPolygonChange.mock.calls.at(-1)![0] as GeoJSON.Polygon;
    const ring = poly.coordinates[0];
    expect(ring.length).toBe(4); // 3 vertices + closing point
    expect(ring[0]).toEqual(ring[ring.length - 1]); // ring is closed
  });

  it('keeps "Selesai" disabled until at least 3 vertices exist', () => {
    render(<GoogleBoundaryEditor pin={null} onPolygonChange={jest.fn()} onPinChange={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /gambar batas/i }));
    const gmap = screen.getByTestId('gmap');
    fireEvent.click(gmap);
    fireEvent.click(gmap);
    expect(screen.getByRole('button', { name: /selesai/i })).toBeDisabled();
    fireEvent.click(gmap);
    expect(screen.getByRole('button', { name: /selesai/i })).toBeEnabled();
  });

  it('does NOT move the pin on a plain map click (only drawing consumes clicks)', () => {
    const onPinChange = jest.fn();
    render(
      <GoogleBoundaryEditor
        pin={{ lat: -7.28, lng: 112.74 }}
        onPolygonChange={jest.fn()}
        onPinChange={onPinChange}
      />
    );

    fireEvent.click(screen.getByTestId('gmap'));
    expect(onPinChange).not.toHaveBeenCalled();
  });

  it('emits pin coordinates when the marker is dragged', () => {
    const onPinChange = jest.fn();
    render(
      <GoogleBoundaryEditor
        pin={{ lat: -7.28, lng: 112.74 }}
        onPolygonChange={jest.fn()}
        onPinChange={onPinChange}
      />
    );

    // The Marker mock fires onDragEnd on click.
    fireEvent.click(screen.getByTestId('marker'));
    expect(onPinChange).toHaveBeenCalledWith({ lat: -7.31, lng: 112.81 });
  });

  it('renders an existing polygon + pin', () => {
    render(
      <GoogleBoundaryEditor
        readonly
        initialPolygon={validPolygon}
        pin={{ lat: -7.28, lng: 112.74 }}
      />
    );
    expect(screen.getByTestId('polygon')).toBeInTheDocument();
    expect(screen.getByTestId('marker')).toBeInTheDocument();
  });

  it('renders every part of a MultiPolygon boundary without crashing', () => {
    const multi: GeoJSON.MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [
        [[[112.74, -7.28], [112.75, -7.28], [112.75, -7.29], [112.74, -7.28]]],
        [[[112.76, -7.30], [112.77, -7.30], [112.77, -7.31], [112.76, -7.30]]],
      ],
    };
    render(<GoogleBoundaryEditor onPolygonChange={jest.fn()} pin={null} initialPolygon={multi} />);
    // one <Polygon> per part (renders without crashing)
    expect(screen.getAllByTestId('polygon')).toHaveLength(2);
    // an existing boundary means the primary action is "redraw"
    expect(screen.getByRole('button', { name: /gambar ulang batas/i })).toBeInTheDocument();
  });

  it('coerces string-serialized coordinates to numbers', () => {
    // Some API responses serialize coords as strings — must not crash.
    const stringy = {
      type: 'Polygon',
      coordinates: [[['112.74', '-7.28'], ['112.75', '-7.28'], ['112.75', '-7.29'], ['112.74', '-7.28']]],
    } as unknown as GeoJSON.Polygon;
    render(<GoogleBoundaryEditor readonly initialPolygon={stringy} pin={null} />);
    expect(screen.getByTestId('polygon')).toBeInTheDocument();
  });
});
