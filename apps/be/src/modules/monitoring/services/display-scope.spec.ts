import { pickDisplayScope, presenceLokasi, type ScopeCandidate } from './display-scope';

const loc = (id: string, team = false): ScopeCandidate => ({
  scope: 'location',
  scope_id: id,
  team,
});
const reg = (id: string, team = false): ScopeCandidate => ({ scope: 'region', scope_id: id, team });
const dis = (id: string, team = false): ScopeCandidate => ({
  scope: 'district',
  scope_id: id,
  team,
});
const noLive = { location_id: null, region_id: null, district_id: null };

describe('pickDisplayScope', () => {
  it('returns undefined without candidates', () => {
    expect(pickDisplayScope([], noLive)).toBeUndefined();
  });

  it('shows the worker where they are: the live lokasi wins', () => {
    const picked = pickDisplayScope([loc('A'), loc('B', true)], { ...noLive, location_id: 'B' });
    expect(picked).toEqual({ scope: 'location', scope_id: 'B' });
  });

  it('a live kawasan match beats a deeper lokasi elsewhere', () => {
    // Alone at lokasi A, with a roaming team in kawasan R — standing in R now.
    const picked = pickDisplayScope([loc('A'), reg('R', true)], {
      location_id: 'X',
      region_id: 'R',
      district_id: 'D',
    });
    expect(picked).toEqual({ scope: 'region', scope_id: 'R' });
  });

  it('not yet located: the individual assignment is shown first (UAT)', () => {
    expect(pickDisplayScope([loc('B', true), loc('A')], noLive)).toEqual({
      scope: 'location',
      scope_id: 'A',
    });
  });

  it('otherwise deepest wins', () => {
    expect(pickDisplayScope([dis('D'), reg('R'), loc('A', true)], noLive)).toEqual({
      scope: 'location',
      scope_id: 'A',
    });
  });

  it('is deterministic between equal individual candidates (lowest id)', () => {
    expect(pickDisplayScope([loc('B'), loc('A')], noLive)).toEqual({
      scope: 'location',
      scope_id: 'A',
    });
    expect(pickDisplayScope([loc('A'), loc('B')], noLive)).toEqual({
      scope: 'location',
      scope_id: 'A',
    });
  });
});

describe('presenceLokasi', () => {
  it('credits presence where the worker is attributed', () => {
    expect(presenceLokasi(['A', 'B'], 'B')).toBe('B');
  });

  it('credits the first rostered lokasi when attributed elsewhere', () => {
    expect(presenceLokasi(['A', 'B'], 'Z')).toBe('A');
  });

  it('credits nothing when nothing is rostered', () => {
    expect(presenceLokasi([], 'A')).toBeNull();
  });
});
