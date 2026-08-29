/**
 * Notable-plant pins.
 *
 * Lokasi scope only, because the endpoint is per-location — drawing city-wide
 * would be one request per lokasi. The gating lives in the map; this tests what
 * the layer itself draws.
 */
import { render } from '@testing-library/react';
import { PlantMarkerLayer } from '../PlantMarkerLayer';
import type { NotablePlantRow } from '@/lib/api/plants';

interface Captured {
  content: HTMLElement;
  onClick?: () => void;
  title?: string;
}
const markers: Captured[] = [];
jest.mock('@/components/maps/AdvancedMarker', () => ({
  AdvancedMarker: (p: Captured) => {
    markers.push(p);
    return <button data-testid="marker" title={p.title} onClick={() => p.onClick?.()} />;
  },
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

beforeEach(() => {
  markers.length = 0;
});

const plant = (over: Partial<NotablePlantRow> = {}): NotablePlantRow =>
  ({
    id: 'p1',
    areaId: 'a1',
    speciesId: 's1',
    gpsLat: -7.29,
    gpsLng: 112.73,
    label: 'Trembesi Tua',
    heritage: false,
    photoUrls: [],
    notes: null,
    species: { id: 's1', nameId: 'Trembesi', category: 'peneduh' },
    ...over,
  }) as NotablePlantRow;

describe('PlantMarkerLayer', () => {
  it('draws one pin per plant', () => {
    render(<PlantMarkerLayer plants={[plant(), plant({ id: 'p2' })]} />);
    expect(markers).toHaveLength(2);
  });

  it('rings a heritage tree differently from an ordinary specimen', () => {
    // The distinction an operator is scanning for; the rest is in the callout.
    render(<PlantMarkerLayer plants={[plant({ heritage: true })]} />);
    const heritage = markers[0].content.outerHTML;
    markers.length = 0;
    render(<PlantMarkerLayer plants={[plant({ heritage: false })]} />);
    expect(markers[0].content.outerHTML).not.toBe(heritage);
  });

  it('falls back to the species name when a plant has no label', () => {
    render(<PlantMarkerLayer plants={[plant({ label: null })]} />);
    expect(markers[0].title).toBe('Trembesi');
  });

  it('skips a plant with unusable coordinates, INCLUDING null', () => {
    // `Number(null)` is 0, not NaN, so a bare isFinite guard pins a plant with
    // no fix at (0, 0) — in the Atlantic. The same trap was already fixed once
    // in `useGeoIndex`; both cases are pinned here so it cannot come back.
    render(
      <PlantMarkerLayer
        plants={[
          plant(),
          plant({ id: 'nan', gpsLat: NaN as unknown as number }),
          plant({ id: 'null', gpsLat: null as unknown as number }),
          plant({ id: 'undef', gpsLng: undefined as unknown as number }),
        ]}
      />,
    );
    expect(markers).toHaveLength(1);
  });

  it('reports the tapped plant, so a callout can open', () => {
    const onSelect = jest.fn();
    render(<PlantMarkerLayer plants={[plant()]} onSelect={onSelect} />);
    markers[0].onClick?.();
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
  });
});
