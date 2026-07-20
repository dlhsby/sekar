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
  getCenter: () => ({ lat: () => -7.29, lng: () => 112.75 }),
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
  Polyline: () => <div data-testid="polyline" />,
  InfoWindow: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="infowindow">{children}</div>
  ),
  useGoogleMap: () => fakeMap,
}));

// The node/worker layers + current-node pin now render AdvancedMarker; mock it to
// a clickable button so the existing marker-count/click assertions still apply.
jest.mock('@/components/maps/AdvancedMarker', () => ({
  AdvancedMarker: ({ onClick }: { onClick?: () => void }) => (
    <button data-testid="marker" onClick={() => onClick?.()} />
  ),
}));

// AdvancedMarkers need a vector Map ID; stub the resolver so no react-query
// provider is required in this unit test.
jest.mock('@/lib/api/config', () => ({ useMapId: () => 'test-map-id' }));

beforeAll(() => {
  (global as unknown as { google: unknown }).google = {
    maps: {
      SymbolPath: { CIRCLE: 0 },
      LatLngBounds: class {
        extend = jest.fn();
      },
      Size: class {},
      Point: class {},
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
  districts: [
    {
      id: 'r1',
      name: 'Rayon 1',
      border_color: 'var(--color-nb-primary)',
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
      regions: [],
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
          district_id: 'r1',
          district_name: 'Rayon 1',
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
  { user_id: 'w1', full_name: 'Budi', lat: -7.1, lng: 112.6, status: 'active', role: 'satgas', is_within_area: true, is_scheduled: true },
  { user_id: 'w2', full_name: 'Sari', lat: -7.45, lng: 112.95, status: 'absent', role: 'linmas', is_within_area: false, is_scheduled: false },
];

const nodeMarkers = [
  {
    id: 'r1',
    name: 'Rayon 1',
    variant: 'district' as const,
    lat: -7.29,
    lng: 112.75,
    scheduled: 6,
    clocked_in: 4,
    belum_hadir: 0, tidak_hadir: 2,
    active: 3,
    active_inside: 3,
  },
];

describe('SimpleMonitoringMap', () => {
  it('draws only the district outline at district scope (area borders are on-demand)', () => {
    // Area outlines are deferred to area scope; at district scope only the district
    // outline draws + its area BUBBLES (the area polygons stay hidden).
    render(<SimpleMonitoringMap scope="district" workers={[]} boundaries={boundaries} />);
    expect(screen.getAllByTestId('polygon')).toHaveLength(1);
  });

  it('draws the district outline + only the SELECTED location polygon at location scope', () => {
    render(
      <SimpleMonitoringMap

        scope="location"
        areaId="a1"
        workers={[]}
        boundaries={boundaries}
      />
    );
    // 1 district polygon + 1 selected-location polygon (a1).
    expect(screen.getAllByTestId('polygon')).toHaveLength(2);
  });

  it('hides area boundaries at the top (Surabaya) scope', () => {
    render(<SimpleMonitoringMap scope="surabaya" workers={[]} boundaries={boundaries} />);
    // Neither district nor area outlines at the Surabaya summary level.
    expect(screen.queryAllByTestId('polygon')).toHaveLength(0);
  });

  it('at region scope draws ONLY the drilled kawasan boundary (others hidden)', () => {
    const poly = (n: number) => ({
      type: 'Polygon' as const,
      coordinates: [[[112.74 + n, -7.28], [112.75 + n, -7.28], [112.75 + n, -7.29], [112.74 + n, -7.28]]],
    });
    const withRegions: BoundariesResponse = {
      generated_at: '2026-01-01T00:00:00Z',
      districts: [
        {
          id: 'r1', name: 'Rayon 1', border_color: null, boundary_polygon: poly(0),
          center_lat: -7.29, center_lng: 112.75, area_count: 0,
          is_understaffed: false, understaffed_area_count: 0,
          regions: [
            { id: 'k1', name: 'Kawasan 1', border_color: null, boundary_polygon: poly(0), center_lat: -7.28, center_lng: 112.74 },
            { id: 'k2', name: 'Kawasan 2', border_color: null, boundary_polygon: poly(0.1), center_lat: -7.28, center_lng: 112.84 },
          ],
          areas: [],
        },
      ],
    };
    render(
      <SimpleMonitoringMap

        scope="region"
        regionId="k1"
        workers={[]}
        boundaries={withRegions}
      />
    );
    // district outline (1) + only kawasan k1 (1); k2 is hidden = 2 polygons total.
    expect(screen.getAllByTestId('polygon')).toHaveLength(2);
  });

  it('node view renders one marker per node and no area pins', () => {
    render(
      <SimpleMonitoringMap

        nodeMarkers={nodeMarkers}
        workers={[]}
        boundaries={boundaries}
      />
    );
    // Only the node marker (no area centre pins in the node view).
    expect(screen.getAllByTestId('marker')).toHaveLength(1);
  });

  it('draws worker pins ALONGSIDE node markers at district scope (no zoom gate)', () => {
    // At district scope the map now shows the kawasan/lokasi node bubbles AND the
    // workers on the ground at once — workers no longer replace nodes, and there
    // is no zoom threshold to cross.
    render(
      <SimpleMonitoringMap

        scope="district"
        nodeMarkers={nodeMarkers}
        workers={workers}
        boundaries={boundaries}
      />
    );
    // Node markers + worker pins coexist.
    expect(screen.getAllByTestId('marker')).toHaveLength(nodeMarkers.length + workers.length);
  });

  it('draws worker pins ALONGSIDE node markers at city scope too', () => {
    render(
      <SimpleMonitoringMap
        scope="city"
        nodeMarkers={nodeMarkers}
        workers={workers}
        boundaries={boundaries}
      />
    );
    // Workers now render at EVERY level, including city — the district node bubbles
    // and the people on the ground show together.
    expect(screen.getAllByTestId('marker')).toHaveLength(nodeMarkers.length + workers.length);
  });

  it('drills when a node marker is clicked', () => {
    const onDrillNode = jest.fn();
    render(
      <SimpleMonitoringMap

        nodeMarkers={nodeMarkers}
        onDrillNode={onDrillNode}
        workers={[]}
        boundaries={boundaries}
      />
    );
    fireEvent.click(screen.getByTestId('marker'));
    expect(onDrillNode).toHaveBeenCalledWith(nodeMarkers[0]);
  });

  it('worker view renders just the workers (no scattered area pins)', () => {
    render(<SimpleMonitoringMap workers={workers} boundaries={boundaries} />);
    // Area centre pins are now the overdue-plant overlay only, so without
    // overdueByArea the worker view shows just the 2 (far-apart) worker markers.
    expect(screen.getAllByTestId('marker')).toHaveLength(2);
  });

  it('calls onSelect when a worker marker is clicked', () => {
    const onSelect = jest.fn();
    render(
      <SimpleMonitoringMap

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

        workers={workers}
        boundaries={boundaries}
        selectedId="w1"
      />
    );
    expect(fakeMap.panTo).toHaveBeenCalledWith({ lat: -7.1, lng: 112.6 });
  });

  it('registers a native My-Location control (stacked with zoom, no overlap)', () => {
    render(<SimpleMonitoringMap workers={[]} boundaries={null} />);
    // createLocateControl pushes the button into the RIGHT_BOTTOM control stack.
    expect(controlStack).toHaveLength(1);
    expect(controlStack[0].getAttribute('aria-label')).toMatch(/fokus ke lokasi saya/i);
  });

  it('hides worker markers when the petugas layer is off', () => {
    render(
      <SimpleMonitoringMap

        workers={workers}
        boundaries={boundaries}
        layers={{
          district: true,
          kawasan: true,
          lokasi: true,
          petugas: false,
          teamBubbles: true,
        }}
      />
    );
    // Only the district + area polygons (no worker markers).
    expect(screen.queryAllByTestId('marker')).toHaveLength(0);
  });
});
