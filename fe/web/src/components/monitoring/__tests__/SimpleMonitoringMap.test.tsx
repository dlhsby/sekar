/**
 * Unit tests: SimpleMonitoringMap (Google Maps). @react-google-maps/api,
 * GoogleMapsGate, and the global `google` namespace are mocked.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { SimpleMonitoringMap, type SimpleWorker } from '../SimpleMonitoringMap';
import type { BoundariesResponse } from '@/lib/api/monitoring-types';

const fakeMap = {
  fitBounds: jest.fn(),
  panTo: jest.fn(),
  setZoom: jest.fn(),
  getZoom: () => 12,
};

jest.mock('@/components/maps/GoogleMapsGate', () => ({
  GoogleMapsGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@react-google-maps/api', () => ({
  GoogleMap: ({
    children,
    onLoad,
  }: {
    children?: React.ReactNode;
    onLoad?: (map: unknown) => void;
  }) => {
    onLoad?.(fakeMap);
    return <div data-testid="gmap">{children}</div>;
  },
  Polygon: () => <div data-testid="polygon" />,
  Marker: ({ onClick }: { onClick?: () => void }) => (
    <button data-testid="marker" onClick={() => onClick?.()} />
  ),
  InfoWindow: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="infowindow">{children}</div>
  ),
}));

beforeAll(() => {
  (global as unknown as { google: unknown }).google = {
    maps: {
      SymbolPath: { CIRCLE: 0 },
      LatLngBounds: class {
        extend = jest.fn();
      },
      Size: class {},
    },
  };
});

beforeEach(() => jest.clearAllMocks());

const boundaries: BoundariesResponse = {
  generated_at: '2026-01-01T00:00:00Z',
  rayons: [
    {
      id: 'r1',
      name: 'Rayon 1',
      boundary_polygon: {
        type: 'Polygon',
        coordinates: [
          [
            [112.74, -7.28],
            [112.76, -7.28],
            [112.76, -7.3],
            [112.74, -7.28],
          ],
        ],
      },
      center_lat: -7.29,
      center_lng: 112.75,
      area_count: 1,
      is_understaffed: false,
      understaffed_area_count: 0,
      areas: [
        {
          id: 'a1',
          name: 'Taman A',
          boundary_polygon: {
            type: 'Polygon',
            coordinates: [
              [
                [112.745, -7.285],
                [112.75, -7.285],
                [112.75, -7.29],
                [112.745, -7.285],
              ],
            ],
          },
          center_lat: -7.287,
          center_lng: 112.747,
          rayon_id: 'r1',
          rayon_name: 'Rayon 1',
          radius_meters: 100,
          assigned_count: 2,
          is_understaffed: false,
          staffing_summary: [],
        },
      ],
    },
  ],
};

const workers: SimpleWorker[] = [
  { user_id: 'w1', full_name: 'Budi', lat: -7.28, lng: 112.75, status: 'active' },
  { user_id: 'w2', full_name: 'Sari', lat: -7.29, lng: 112.76, status: 'missing' },
];

describe('SimpleMonitoringMap', () => {
  it('renders rayon + area boundary polygons', () => {
    render(<SimpleMonitoringMap workers={[]} boundaries={boundaries} />);
    // 1 rayon polygon + 1 area polygon
    expect(screen.getAllByTestId('polygon')).toHaveLength(2);
  });

  it('renders area centre + worker markers', () => {
    render(<SimpleMonitoringMap workers={workers} boundaries={boundaries} />);
    // 1 area pin + 2 workers
    expect(screen.getAllByTestId('marker')).toHaveLength(3);
  });

  it('calls onSelect when a worker marker is clicked', () => {
    const onSelect = jest.fn();
    render(<SimpleMonitoringMap workers={workers} boundaries={boundaries} onSelect={onSelect} />);
    const markers = screen.getAllByTestId('marker');
    // Worker markers render after the area pin.
    fireEvent.click(markers[markers.length - 1]);
    expect(onSelect).toHaveBeenCalledWith('w2');
  });

  it('pans to the selected worker', () => {
    render(<SimpleMonitoringMap workers={workers} boundaries={boundaries} selectedId="w1" />);
    expect(fakeMap.panTo).toHaveBeenCalledWith({ lat: -7.28, lng: 112.75 });
  });

  it('renders a locate-me control', () => {
    render(<SimpleMonitoringMap workers={[]} boundaries={null} />);
    expect(screen.getByRole('button', { name: /fokus ke lokasi saya/i })).toBeInTheDocument();
  });
});
