import { getRecentSearches, addRecentSearch, clearRecentSearches } from '../recentSearches';
import type { MonitoringSearchResult } from '../useMonitoringSearch';

const mk = (id: string, type: MonitoringSearchResult['type'] = 'petugas'): MonitoringSearchResult => ({
  id,
  type,
  name: `Item ${id}`,
  latitude: -7.25,
  longitude: 112.75,
});

describe('recentSearches', () => {
  beforeEach(() => window.localStorage.clear());

  it('starts empty', () => {
    expect(getRecentSearches()).toEqual([]);
  });

  it('prepends most-recent first', () => {
    addRecentSearch(mk('a'));
    const list = addRecentSearch(mk('b'));
    expect(list.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('de-dupes by type+id, moving the item to the front', () => {
    addRecentSearch(mk('a'));
    addRecentSearch(mk('b'));
    const list = addRecentSearch(mk('a'));
    expect(list.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('keeps type+id distinct across types', () => {
    addRecentSearch(mk('x', 'petugas'));
    const list = addRecentSearch(mk('x', 'area'));
    expect(list).toHaveLength(2);
  });

  it('caps at 10 items', () => {
    for (let i = 0; i < 15; i++) addRecentSearch(mk(String(i)));
    expect(getRecentSearches()).toHaveLength(10);
  });

  it('clears all', () => {
    addRecentSearch(mk('a'));
    clearRecentSearches();
    expect(getRecentSearches()).toEqual([]);
  });
});
