/* eslint-disable sekar-design/no-inline-hex-colors -- fixture colours stand in for an entity's stored ADR-045 styling, not rendered tokens */
/**
 * Unit tests: AreaMapModal — the day board's boundary view.
 *
 * The decision this pins is fetch-on-demand. `BoardMasterData` deliberately does
 * NOT carry boundaries: the board holds ~9 districts, ~130 kawasan and ~800 lokasi,
 * and threading every polygon through it to serve an occasional button would
 * weigh down every board load. So the load-bearing assertions are about what is
 * fetched and when — not about the map, which is a lazy browser-only component.
 */
import { render, screen } from '@testing-library/react';
import { AreaMapModal } from '../AreaMapModal';
import { useDistrict } from '@/lib/api/districts';
import { useRegion } from '@/lib/api/regions';
import { useLocation } from '@/lib/api/locations';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/lib/api/districts', () => ({ useDistrict: jest.fn() }));
jest.mock('@/lib/api/regions', () => ({ useRegion: jest.fn() }));
jest.mock('@/lib/api/locations', () => ({ useLocation: jest.fn() }));

// The map is lazy + browser-only; capture its props instead of rendering Google.
const mapProps: Array<Record<string, unknown>> = [];
jest.mock('@/components/maps/AreaBoundaryMapLazy', () => ({
  AreaBoundaryMap: (props: Record<string, unknown>) => {
    mapProps.push(props);
    return <div data-testid="area-map" />;
  },
}));

const BOUNDARY = {
  type: 'Polygon',
  coordinates: [
    [
      [112.7, -7.2],
      [112.8, -7.2],
      [112.8, -7.3],
      [112.7, -7.2],
    ],
  ],
} as GeoJSON.Polygon;

const idle = { data: undefined, isLoading: false };

beforeEach(() => {
  mapProps.length = 0;
  (useDistrict as jest.Mock).mockReturnValue(idle);
  (useRegion as jest.Mock).mockReturnValue(idle);
  (useLocation as jest.Mock).mockReturnValue(idle);
});

describe('AreaMapModal — fetches only what was asked for', () => {
  it('fetches nothing at all while closed', () => {
    render(<AreaMapModal subject={null} onOpenChange={jest.fn()} />);

    // Every hook is called (rules of hooks) but each must be disabled/id-less,
    // so no request goes out for a modal nobody opened.
    expect(useDistrict).toHaveBeenCalledWith('');
    expect(useRegion).toHaveBeenCalledWith('', false);
    expect(useLocation).toHaveBeenCalledWith('', expect.objectContaining({ enabled: false }));
  });

  it('fetches the district only, when a district is asked for', () => {
    render(
      <AreaMapModal
        subject={{ level: 'district', id: 'ry1', name: 'Rayon Pusat' }}
        onOpenChange={jest.fn()}
      />
    );

    expect(useDistrict).toHaveBeenCalledWith('ry1');
    // The other two tiers stay switched off — one click, one request.
    expect(useRegion).toHaveBeenCalledWith('', true);
    expect(useLocation).toHaveBeenCalledWith('', expect.objectContaining({ enabled: false }));
  });

  it('fetches the kawasan only, when a kawasan is asked for', () => {
    render(
      <AreaMapModal
        subject={{ level: 'region', id: 'kw1', name: 'Kawasan Pusat' }}
        onOpenChange={jest.fn()}
      />
    );

    expect(useRegion).toHaveBeenCalledWith('kw1', true);
    expect(useDistrict).toHaveBeenCalledWith('');
  });
});

describe('AreaMapModal — drawing', () => {
  it('passes the entity’s own colours through (ADR-045), not a fixed palette', () => {
    (useDistrict as jest.Mock).mockReturnValue({
      data: {
        boundary_polygon: BOUNDARY,
        center_lat: -7.25,
        center_lng: 112.75,
        border_color: '#123456',
        fill_color: '#654321',
        border_opacity: 0.5,
        fill_opacity: 0.2,
      },
      isLoading: false,
    });

    render(
      <AreaMapModal
        subject={{ level: 'district', id: 'ry1', name: 'Rayon Pusat' }}
        onOpenChange={jest.fn()}
      />
    );

    expect(screen.getByTestId('area-map')).toBeInTheDocument();
    expect(mapProps.at(-1)).toMatchObject({
      level: 'district',
      borderColor: '#123456',
      fillColor: '#654321',
      borderOpacity: 0.5,
      fillOpacity: 0.2,
      pin: { lat: -7.25, lng: 112.75 },
    });
  });

  it('reads a lokasi’s pin from gps_*, which is where a lokasi keeps it', () => {
    (useLocation as jest.Mock).mockReturnValue({
      data: { boundary_polygon: null, gps_lat: '-7.29', gps_lng: '112.73' },
      isLoading: false,
    });

    render(
      <AreaMapModal
        subject={{ level: 'location', id: 'loc1', name: 'Taman Bungkul' }}
        onOpenChange={jest.fn()}
      />
    );

    // Coordinates arrive as strings from the API — a raw string would put the
    // pin nowhere.
    expect(mapProps.at(-1)).toMatchObject({ pin: { lat: -7.29, lng: 112.73 } });
  });

  it('says so plainly when an area has neither boundary nor coordinates', () => {
    (useRegion as jest.Mock).mockReturnValue({
      data: { boundary_polygon: null },
      isLoading: false,
    });

    render(
      <AreaMapModal
        subject={{ level: 'region', id: 'kw1', name: 'Kawasan Pusat' }}
        onOpenChange={jest.fn()}
      />
    );

    expect(screen.getByText('schedules:board.mapNoGeometry')).toBeInTheDocument();
    expect(screen.queryByTestId('area-map')).not.toBeInTheDocument();
  });
});
