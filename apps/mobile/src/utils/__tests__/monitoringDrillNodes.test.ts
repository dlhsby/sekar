/**
 * Tests for the PR2-visual drill-node composition: aggregate → NodeMarker adapter
 * and the per-scope node composition (regions ∪ region-less locations at district,
 * a region's locations at region scope).
 */

import {
  aggregateNodeToNodeMarker,
  composeDrillNodes,
  type DrillView,
} from '../monitoringDrillNodes';
import type { AggregateNode } from '../../types/monitoring.types';

function agg(over: Partial<AggregateNode>): AggregateNode {
  return {
    id: 'n1',
    name: 'Node',
    type: 'location',
    center_lat: -7.25,
    center_lng: 112.75,
    counts_by_status: { active: 0, offline: 0, absent: 0, outside_area: 0 },
    counts_by_role: {},
    worker_count: 0,
    online_count: 0,
    required: 0,
    is_understaffed: false,
    roster: { scheduled: 4, clocked_in: 2, not_clocked_in: 2 },
    presence: { aktif: { dalam: 0, luar: 0 }, tidak_aktif: { dalam: 0, luar: 0 } },
    ...over,
  };
}

const view = (over: Partial<DrillView>): DrillView => ({
  scope: 'city',
  id: null,
  districtId: null,
  regionId: null,
  ...over,
});

describe('aggregateNodeToNodeMarker', () => {
  it('maps center_lat/lng → lat/lng, type → variant, roster → ratio fields', () => {
    const m = aggregateNodeToNodeMarker(agg({ id: 'r1', name: 'Kawasan Darmo', type: 'region' }));
    expect(m).toEqual({
      id: 'r1',
      name: 'Kawasan Darmo',
      variant: 'region',
      lat: -7.25,
      lng: 112.75,
      scheduled: 4,
      clocked_in: 2,
      not_clocked_in: 2,
    });
  });

  it('returns null when the node has no center point', () => {
    expect(aggregateNodeToNodeMarker(agg({ center_lat: null }))).toBeNull();
    expect(aggregateNodeToNodeMarker(agg({ center_lng: null }))).toBeNull();
  });

  it('defaults roster counts to 0 when absent', () => {
    const m = aggregateNodeToNodeMarker(agg({ roster: undefined as unknown as AggregateNode['roster'] }));
    expect(m).toMatchObject({ scheduled: 0, clocked_in: 0, not_clocked_in: 0 });
  });
});

describe('composeDrillNodes', () => {
  const districtNode = agg({ id: 'd1', name: 'Rayon Pusat', type: 'district' });
  const regionA = agg({ id: 'reg-1', name: 'Kawasan A', type: 'region', center_lat: -7.2, center_lng: 112.7 });
  const locInRegion = agg({ id: 'loc-1', name: 'Lokasi in A', type: 'location', region_id: 'reg-1' });
  const locRegionless = agg({ id: 'loc-2', name: 'Lokasi bebas', type: 'location', region_id: null });

  it('city scope returns the district nodes', () => {
    const out = composeDrillNodes('city', view({ scope: 'city' }), [districtNode], [], []);
    expect(out.map(n => n.id)).toEqual(['d1']);
    expect(out[0].variant).toBe('district');
  });

  it('district scope returns regions ∪ region-LESS locations (not in-region ones)', () => {
    const out = composeDrillNodes(
      'district',
      view({ scope: 'district', id: 'd1', districtId: 'd1' }),
      [],
      [locInRegion, locRegionless],
      [regionA],
    );
    // regionA + locRegionless; locInRegion is hidden (it shows under its kawasan)
    expect(out.map(n => n.id).sort()).toEqual(['loc-2', 'reg-1']);
  });

  it('district scope with NO regions degrades to all locations (region-less fallback)', () => {
    const out = composeDrillNodes(
      'district',
      view({ scope: 'district', id: 'd1', districtId: 'd1' }),
      [],
      [locRegionless, agg({ id: 'loc-3', type: 'location', region_id: null })],
      [],
    );
    expect(out.map(n => n.id).sort()).toEqual(['loc-2', 'loc-3']);
  });

  it('region scope returns only the drilled kawasan’s locations', () => {
    const out = composeDrillNodes(
      'region',
      view({ scope: 'region', id: 'reg-1', districtId: 'd1', regionId: 'reg-1' }),
      [],
      [locInRegion, locRegionless, agg({ id: 'loc-4', type: 'location', region_id: 'reg-2' })],
      [regionA],
    );
    expect(out.map(n => n.id)).toEqual(['loc-1']);
  });

  it('location scope returns no child nodes', () => {
    const out = composeDrillNodes(
      'location',
      view({ scope: 'location', id: 'loc-1' }),
      [districtNode],
      [locInRegion],
      [regionA],
    );
    expect(out).toEqual([]);
  });

  it('district scope ignores stale district-type nodes (type guard, no wrong-tier flash)', () => {
    // Simulates the one-frame window where `aggregate` still holds city district
    // nodes right after a city→district drill — they must NOT render as locations.
    const out = composeDrillNodes(
      'district',
      view({ scope: 'district', id: 'd1', districtId: 'd1' }),
      [],
      [districtNode /* type:district */, locRegionless /* type:location */],
      [],
    );
    expect(out.map(n => n.id)).toEqual(['loc-2']); // only the real location
  });

  it('district scope treats undefined region_id as region-less', () => {
    const undef = agg({ id: 'loc-u', type: 'location', region_id: undefined });
    const out = composeDrillNodes(
      'district',
      view({ scope: 'district', id: 'd1', districtId: 'd1' }),
      [],
      [undef],
      [],
    );
    expect(out.map(n => n.id)).toEqual(['loc-u']);
  });

  it('region scope returns [] when regionId is missing (no null-region leak)', () => {
    const out = composeDrillNodes(
      'region',
      view({ scope: 'region', id: 'reg-1', districtId: 'd1', regionId: null }),
      [],
      [locRegionless, agg({ id: 'loc-x', type: 'location', region_id: null })],
      [],
    );
    expect(out).toEqual([]);
  });
});
