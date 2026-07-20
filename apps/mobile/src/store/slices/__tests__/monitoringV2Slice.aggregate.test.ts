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
  it('defaults to the Surabaya view', () => {
    const s = base();
    expect(s.view).toEqual({ scope: 'surabaya', id: null, districtId: null, name: null });
    expect(s.floor).toBe('surabaya');
  });

  it('enterCity moves Surabaya → the district list', () => {
    const s = reducer(base(), enterCity());
    expect(s.view.scope).toBe('city');
  });

  it('initMonitoringView sets view/floor from role', () => {
    const s = reducer(
      base(),
      initMonitoringView({
        view: { scope: 'district', id: 'ry', districtId: 'ry', name: null },
        floor: 'district',
      }),
    );
    expect(s.view.scope).toBe('district');
    expect(s.floor).toBe('district');
  });

  it('drillTo district node → district view', () => {
    const s = reducer(base(), drillTo({ id: 'ry', type: 'district', name: 'R', districtId: null }));
    expect(s.view).toEqual({ scope: 'district', id: 'ry', districtId: 'ry', name: 'R' });
  });

  it('drillTo location node → location view (carries districtId)', () => {
    let s = reducer(base(), drillTo({ id: 'ry', type: 'district', name: 'R', districtId: null }));
    s = reducer(s, drillTo({ id: 'a1', type: 'location', name: 'Area 1', districtId: 'ry' }));
    expect(s.view).toEqual({ scope: 'location', id: 'a1', districtId: 'ry', name: 'Area 1' });
  });

  it('drillBack location → district → city → surabaya, never above floor', () => {
    let s = reducer(base(), enterCity());
    s = reducer(s, drillTo({ id: 'ry', type: 'district', name: 'R', districtId: null }));
    s = reducer(s, drillTo({ id: 'a1', type: 'location', name: 'A', districtId: 'ry' }));
    s = reducer(s, drillBack());
    expect(s.view.scope).toBe('district');
    s = reducer(s, drillBack());
    expect(s.view.scope).toBe('city');
    s = reducer(s, drillBack());
    expect(s.view.scope).toBe('surabaya');
    // At the floor, further back is a no-op.
    s = reducer(s, drillBack());
    expect(s.view.scope).toBe('surabaya');
  });

  it('drillBack respects a district floor (kepala_rayon)', () => {
    let s = reducer(
      base(),
      initMonitoringView({
        view: { scope: 'district', id: 'ry', districtId: 'ry', name: null },
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
});
