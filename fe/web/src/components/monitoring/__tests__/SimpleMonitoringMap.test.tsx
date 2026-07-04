/**
 * Unit tests: SimpleMonitoringMap (Google Maps). @react-google-maps/api,
 * GoogleMapsGate, and the global `google` namespace are mocked.
 */
import { useEffect } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SimpleMonitoringMap, type SimpleWorker } from '../SimpleMonitoringMap';
import type { BoundariesResponse } from '@/lib/api/monitoring-types';

// Native control stack — createLocateControl pushes the My-Location button here.
const controlStack: HTMLElement[] = [];
const fakeMap = {
  fitBounds: jest.fn(),
  panTo: jest.fn(),
  setZoom: jest.fn(),
  getZoom: () => 16,
  controls: { 3: controlStack },
  getBounds: () => ({
    getNorthEast: () => ({ lat: () => -7.0, lng: () => 113.0 }),
    getSouthWest: () => ({ lat: () => -7.5, lng: () => 112.5 }),
  }),
};

jest.mock('@/components/maps/GoogleMapsGate', () => ({
  GoogleMapsGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// supercluster ships ESM (kdbush) which next/jest won't transform; mock it as a
// passthrough that returns each loaded point as an un-clustered leaf feature.
jest.mock('supercluster', () =>
  jest.fn().mockImplementation(() => {
    let features: Array<Record<string, unknown>> = [];
    return {
      load: (f: Array<Record<string, unknown>>) => {
        features = f;
      },
      getClusters: () => features,
      getClusterExpansionZoom: () => 14,
    };
  })
);

jest.mock('@react-google-maps/api', () => ({
  GoogleMap: ({
    children,
    onLoad,
    onIdle,
  }: {
    children?: React.ReactNode;
    onLoad?: (map: unknown) => void;
    onIdle?: () => void;
  }) => {
    // Fire once (like the real map) to avoid an onLoad→setState→render loop.
    useEffect(() => {
      onLoad?.(fakeMap);
      onIdle?.();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
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
      ControlPosition: { RIGHT_BOTTOM: 3 },
    },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  controlStack.length = 0;
});

const boundaries: BoundariesResponse = {
  generated_at: '2026-01-01T00:00:00Z',
  rayons: [
    {
      id: 'r1',
      name: 'Rayon 1',
      color: '#7FBC8C',
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

// Far apart so supercluster keeps them as separate leaves at the test zoom.
const workers: SimpleWorker[] = [
  { user_id: 'w1', full_name: 'Budi', lat: -7.1, lng: 112.6, status: 'active' },
  { user_id: 'w2', full_name: 'Sari', lat: -7.45, lng: 112.95, status: 'missing' },
];

const aggregateNodes = [
  {
    id: 'r1',
    name: 'Rayon 1',
    type: 'rayon' as const,
    center_lat: -7.29,
    center_lng: 112.75,
    counts_by_status: { active: 4, inactive: 0, outside_area: 0, missing: 1, offline: 0 },
    counts_by_role: { satgas: 4 },
    worker_count: 5,
    online_count: 4,
    required: 6,
    is_understaffed: true,
    area_count: 2,
  },
];

describe('SimpleMonitoringMap', () => {
  it('renders rayon + area boundary polygons', () => {
    render(<SimpleMonitoringMap mode="aggregate" workers={[]} boundaries={boundaries} />);
    // 1 rayon polygon + 1 area polygon
    expect(screen.getAllByTestId('polygon')).toHaveLength(2);
  });

  it('aggregate mode renders one bubble per node and no area pins', () => {
    render(
      <SimpleMonitoringMap
        mode="aggregate"
        aggregateNodes={aggregateNodes}
        workers={[]}
        boundaries={boundaries}
      />
    );
    // Only the aggregate bubble marker (no area centre pins in aggregate mode).
    expect(screen.getAllByTestId('marker')).toHaveLength(1);
  });

  it('drills when an aggregate bubble is clicked', () => {
    const onDrillNode = jest.fn();
    render(
      <SimpleMonitoringMap
        mode="aggregate"
        aggregateNodes={aggregateNodes}
        onDrillNode={onDrillNode}
        workers={[]}
        boundaries={boundaries}
      />
    );
    fireEvent.click(screen.getByTestId('marker'));
    expect(onDrillNode).toHaveBeenCalledWith(aggregateNodes[0]);
  });

  it('worker mode renders area pin + clustered worker markers', () => {
    render(<SimpleMonitoringMap mode="workers" workers={workers} boundaries={boundaries} />);
    // 1 area pin + 2 (unclustered, far-apart) workers.
    expect(screen.getAllByTestId('marker')).toHaveLength(3);
  });

  it('calls onSelect when a worker marker is clicked', () => {
    const onSelect = jest.fn();
    render(
      <SimpleMonitoringMap
        mode="workers"
        workers={workers}
        boundaries={boundaries}
        onSelect={onSelect}
      />
    );
    const markers = screen.getAllByTestId('marker');
    fireEvent.click(markers[markers.length - 1]);
    expect(onSelect).toHaveBeenCalledWith(expect.stringMatching(/^w[12]$/));
  });

  it('pans to the selected worker', () => {
    render(
      <SimpleMonitoringMap
        mode="workers"
        workers={workers}
        boundaries={boundaries}
        selectedId="w1"
      />
    );
    expect(fakeMap.panTo).toHaveBeenCalledWith({ lat: -7.1, lng: 112.6 });
  });

  it('registers a native My-Location control (stacked with zoom, no overlap)', () => {
    render(<SimpleMonitoringMap mode="aggregate" workers={[]} boundaries={null} />);
    // createLocateControl pushes the button into the RIGHT_BOTTOM control stack.
    expect(controlStack).toHaveLength(1);
    expect(controlStack[0].getAttribute('aria-label')).toMatch(/fokus ke lokasi saya/i);
  });

  it('hides worker markers when the petugas layer is off', () => {
    render(
      <SimpleMonitoringMap
        mode="workers"
        workers={workers}
        boundaries={boundaries}
        layers={{
          rayonBorder: true,
          rayonFill: true,
          areaBorder: true,
          areaPins: false,
          petugas: false,
          overdue: false,
        }}
      />
    );
    // Only the rayon + area polygons (no worker/area markers).
    expect(screen.queryAllByTestId('marker')).toHaveLength(0);
  });
});
