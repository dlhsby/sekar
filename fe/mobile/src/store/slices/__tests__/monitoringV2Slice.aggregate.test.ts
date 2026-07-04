/**
 * monitoringV2Slice — aggregate-first drill state (mode/view/floor/aggregate).
 */
import reducer, {
  setMode,
  initMonitoringView,
  drillTo,
  drillBack,
  fetchAggregate,
} from '../monitoringV2Slice';

const base = () => reducer(undefined, { type: '@@INIT' });

describe('monitoringV2Slice aggregate drill', () => {
  it('defaults to city aggregate view', () => {
    const s = base();
    expect(s.mode).toBe('aggregate');
    expect(s.view).toEqual({ scope: 'city', id: null, rayonId: null, name: null });
    expect(s.floor).toBe('city');
  });

  it('setMode switches mode', () => {
    const s = reducer(base(), setMode('workers'));
    expect(s.mode).toBe('workers');
  });

  it('initMonitoringView sets view/floor/mode from role', () => {
    const s = reducer(
      base(),
      initMonitoringView({
        view: { scope: 'rayon', id: 'ry', rayonId: 'ry', name: null },
        floor: 'rayon',
        mode: 'aggregate',
      }),
    );
    expect(s.view.scope).toBe('rayon');
    expect(s.floor).toBe('rayon');
  });

  it('drillTo rayon node → rayon aggregate view', () => {
    const s = reducer(base(), drillTo({ id: 'ry', type: 'rayon', name: 'R', rayonId: null }));
    expect(s.view).toEqual({ scope: 'rayon', id: 'ry', rayonId: 'ry', name: 'R' });
    expect(s.mode).toBe('aggregate');
  });

  it('drillTo area node → area workers view (carries rayonId)', () => {
    let s = reducer(base(), drillTo({ id: 'ry', type: 'rayon', name: 'R', rayonId: null }));
    s = reducer(s, drillTo({ id: 'a1', type: 'area', name: 'Area 1', rayonId: 'ry' }));
    expect(s.view).toEqual({ scope: 'area', id: 'a1', rayonId: 'ry', name: 'Area 1' });
    expect(s.mode).toBe('workers');
  });

  it('drillBack area → rayon → city, never above floor', () => {
    // Drill city → rayon → area, then back twice.
    let s = reducer(base(), drillTo({ id: 'ry', type: 'rayon', name: 'R', rayonId: null }));
    s = reducer(s, drillTo({ id: 'a1', type: 'area', name: 'A', rayonId: 'ry' }));
    s = reducer(s, drillBack());
    expect(s.view.scope).toBe('rayon');
    expect(s.mode).toBe('aggregate');
    s = reducer(s, drillBack());
    expect(s.view.scope).toBe('city');
    // At the floor, further back is a no-op.
    s = reducer(s, drillBack());
    expect(s.view.scope).toBe('city');
  });

  it('drillBack respects a rayon floor (kepala_rayon)', () => {
    let s = reducer(
      base(),
      initMonitoringView({
        view: { scope: 'rayon', id: 'ry', rayonId: 'ry', name: null },
        floor: 'rayon',
        mode: 'aggregate',
      }),
    );
    s = reducer(s, drillTo({ id: 'a1', type: 'area', name: 'A', rayonId: 'ry' }));
    s = reducer(s, drillBack()); // area → rayon (floor)
    expect(s.view.scope).toBe('rayon');
    s = reducer(s, drillBack()); // no-op at floor
    expect(s.view.scope).toBe('rayon');
  });

  it('fetchAggregate.fulfilled stores the payload', () => {
    const payload = { scope: 'city' as const, scope_id: null, nodes: [], totals: {} as any, generated_at: '' };
    const s = reducer(base(), { type: fetchAggregate.fulfilled.type, payload });
    expect(s.aggregate).toEqual(payload);
    expect(s.aggregateLoading).toBe(false);
  });
});
