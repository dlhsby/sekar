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
    expect(s.view).toEqual({ scope: 'surabaya', id: null, rayonId: null, name: null });
    expect(s.floor).toBe('surabaya');
  });

  it('enterCity moves Surabaya → the rayon list', () => {
    const s = reducer(base(), enterCity());
    expect(s.view.scope).toBe('city');
  });

  it('initMonitoringView sets view/floor from role', () => {
    const s = reducer(
      base(),
      initMonitoringView({
        view: { scope: 'rayon', id: 'ry', rayonId: 'ry', name: null },
        floor: 'rayon',
      }),
    );
    expect(s.view.scope).toBe('rayon');
    expect(s.floor).toBe('rayon');
  });

  it('drillTo rayon node → rayon view', () => {
    const s = reducer(base(), drillTo({ id: 'ry', type: 'rayon', name: 'R', rayonId: null }));
    expect(s.view).toEqual({ scope: 'rayon', id: 'ry', rayonId: 'ry', name: 'R' });
  });

  it('drillTo location node → location view (carries rayonId)', () => {
    let s = reducer(base(), drillTo({ id: 'ry', type: 'rayon', name: 'R', rayonId: null }));
    s = reducer(s, drillTo({ id: 'a1', type: 'location', name: 'Location 1', rayonId: 'ry' }));
    expect(s.view).toEqual({ scope: 'location', id: 'a1', rayonId: 'ry', name: 'Location 1' });
  });

  it('drillBack location → rayon → city → surabaya, never above floor', () => {
    let s = reducer(base(), enterCity());
    s = reducer(s, drillTo({ id: 'ry', type: 'rayon', name: 'R', rayonId: null }));
    s = reducer(s, drillTo({ id: 'a1', type: 'location', name: 'A', rayonId: 'ry' }));
    s = reducer(s, drillBack());
    expect(s.view.scope).toBe('rayon');
    s = reducer(s, drillBack());
    expect(s.view.scope).toBe('city');
    s = reducer(s, drillBack());
    expect(s.view.scope).toBe('surabaya');
    // At the floor, further back is a no-op.
    s = reducer(s, drillBack());
    expect(s.view.scope).toBe('surabaya');
  });

  it('drillBack respects a rayon floor (kepala_rayon)', () => {
    let s = reducer(
      base(),
      initMonitoringView({
        view: { scope: 'rayon', id: 'ry', rayonId: 'ry', name: null },
        floor: 'rayon',
      }),
    );
    s = reducer(s, drillTo({ id: 'a1', type: 'location', name: 'A', rayonId: 'ry' }));
    s = reducer(s, drillBack()); // location → rayon (floor)
    expect(s.view.scope).toBe('rayon');
    s = reducer(s, drillBack()); // no-op at floor
    expect(s.view.scope).toBe('rayon');
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
