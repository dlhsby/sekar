/**
 * monitoringV2Slice — unified drill state (view/floor/aggregate).
 */
import reducer, {
  initMonitoringView,
  enterCity,
  drillTo,
  drillBack,
  fetchAggregate,
} from '../monitoringV2Slice';

const base = () => reducer(undefined, { type: '@@INIT' });

describe('monitoringV2Slice drill', () => {
  it('defaults to the city view (the Surabaya bubble was retired, PR2)', () => {
    const s = base();
    expect(s.view).toEqual({
      scope: 'city',
      id: null,
      districtId: null,
      regionId: null,
      name: null,
    });
    expect(s.floor).toBe('city');
  });

  it('enterCity resets to the district list (city scope)', () => {
    const s = reducer(base(), enterCity());
    expect(s.view.scope).toBe('city');
    expect(s.view.regionId).toBeNull();
  });

  it('initMonitoringView sets view/floor from role', () => {
    const s = reducer(
      base(),
      initMonitoringView({
        view: { scope: 'district', id: 'ry', districtId: 'ry', regionId: null, name: null },
        floor: 'district',
      }),
    );
    expect(s.view.scope).toBe('district');
    expect(s.floor).toBe('district');
  });

  it('drillTo district node → district view', () => {
    const s = reducer(base(), drillTo({ id: 'ry', type: 'district', name: 'R', districtId: null }));
    expect(s.view).toEqual({
      scope: 'district',
      id: 'ry',
      districtId: 'ry',
      regionId: null,
      name: 'R',
    });
  });

  it('drillTo region (kawasan) node → region view carrying districtId + regionId', () => {
    let s = reducer(base(), drillTo({ id: 'ry', type: 'district', name: 'R', districtId: null }));
    s = reducer(s, drillTo({ id: 'kw', type: 'region', name: 'Kawasan 1', districtId: 'ry' }));
    expect(s.view).toEqual({
      scope: 'region',
      id: 'kw',
      districtId: 'ry',
      regionId: 'kw',
      name: 'Kawasan 1',
    });
  });

  it('drillTo location inside a kawasan carries the regionId (for back-drill)', () => {
    let s = reducer(base(), drillTo({ id: 'ry', type: 'district', name: 'R', districtId: null }));
    s = reducer(s, drillTo({ id: 'kw', type: 'region', name: 'K', districtId: 'ry' }));
    s = reducer(s, drillTo({ id: 'a1', type: 'location', name: 'Area 1', districtId: 'ry' }));
    expect(s.view.scope).toBe('location');
    expect(s.view.regionId).toBe('kw');
  });

  it('drillBack location → district → city (region-less bucket), never above floor', () => {
    let s = reducer(base(), enterCity());
    s = reducer(s, drillTo({ id: 'ry', type: 'district', name: 'R', districtId: null }));
    // Region-less: straight to a lokasi (no kawasan tapped) → regionId null.
    s = reducer(s, drillTo({ id: 'a1', type: 'location', name: 'A', districtId: 'ry' }));
    s = reducer(s, drillBack());
    expect(s.view.scope).toBe('district');
    s = reducer(s, drillBack());
    expect(s.view.scope).toBe('city');
    // City is the floor now (no Surabaya) — further back is a no-op.
    s = reducer(s, drillBack());
    expect(s.view.scope).toBe('city');
  });

  it('drillBack from a lokasi inside a kawasan returns to the kawasan, then district', () => {
    let s = reducer(base(), drillTo({ id: 'ry', type: 'district', name: 'R', districtId: null }));
    s = reducer(s, drillTo({ id: 'kw', type: 'region', name: 'K', districtId: 'ry' }));
    s = reducer(s, drillTo({ id: 'a1', type: 'location', name: 'A', districtId: 'ry' }));
    s = reducer(s, drillBack());
    expect(s.view.scope).toBe('region');
    expect(s.view.id).toBe('kw');
    s = reducer(s, drillBack());
    expect(s.view.scope).toBe('district');
  });

  it('drillBack respects a district floor (kepala_rayon)', () => {
    let s = reducer(
      base(),
      initMonitoringView({
        view: { scope: 'district', id: 'ry', districtId: 'ry', regionId: null, name: null },
        floor: 'district',
      }),
    );
    s = reducer(s, drillTo({ id: 'a1', type: 'location', name: 'A', districtId: 'ry' }));
    s = reducer(s, drillBack()); // area → district (floor)
    expect(s.view.scope).toBe('district');
    s = reducer(s, drillBack()); // no-op at floor
    expect(s.view.scope).toBe('district');
  });

  it('fetchAggregate.fulfilled stores the payload', () => {
    const payload = {
      scope: 'city' as const,
      scope_id: null,
      nodes: [],
      totals: {} as any,
      roster_totals: { scheduled: 0, clocked_in: 0, not_clocked_in: 0 },
      generated_at: '',
    };
    const s = reducer(base(), { type: fetchAggregate.fulfilled.type, payload });
    expect(s.aggregate).toEqual(payload);
    expect(s.aggregateLoading).toBe(false);
  });

  it('fetchAggregate.fulfilled routes a region scope into aggregateRegion (not aggregate)', () => {
    const payload = {
      scope: 'region' as const,
      scope_id: 'ry',
      nodes: [],
      totals: {} as any,
      roster_totals: { scheduled: 0, clocked_in: 0, not_clocked_in: 0 },
      generated_at: '',
    };
    // meta-driven (the real thunk supplies meta.arg.scope)
    const viaMeta = reducer(base(), {
      type: fetchAggregate.fulfilled.type,
      payload,
      meta: { arg: { scope: 'region', id: 'ry' } },
    });
    expect(viaMeta.aggregateRegion).toEqual(payload);
    expect(viaMeta.aggregate).toBeNull();

    // fallback: no meta → use the response's own scope
    const viaPayload = reducer(base(), { type: fetchAggregate.fulfilled.type, payload });
    expect(viaPayload.aggregateRegion).toEqual(payload);
    expect(viaPayload.aggregate).toBeNull();
  });
});
