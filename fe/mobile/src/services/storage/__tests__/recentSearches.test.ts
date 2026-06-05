/**
 * recentSearches tests — Phase 4 M3 (CP-S2).
 * AsyncStorage is globally mocked (jest.setup.js → official async-storage mock).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRecentSearches, addRecentSearch, clearRecentSearches } from '../recentSearches';
import type { SearchResult } from '../../../hooks/useMonitoringSearch';

const mk = (id: string, type: SearchResult['type'] = 'petugas'): SearchResult => ({
  id,
  type,
  name: `Name ${id}`,
  latitude: 0,
  longitude: 0,
});

describe('recentSearches', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns [] when nothing is stored', async () => {
    expect(await getRecentSearches()).toEqual([]);
  });

  it('adds items most-recent-first', async () => {
    await addRecentSearch(mk('a'));
    await addRecentSearch(mk('b'));
    const r = await getRecentSearches();
    expect(r.map((x) => x.id)).toEqual(['b', 'a']);
  });

  it('dedupes by type+id, moving the re-added item to the front', async () => {
    await addRecentSearch(mk('a'));
    await addRecentSearch(mk('b'));
    await addRecentSearch(mk('a'));
    const r = await getRecentSearches();
    expect(r.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('keeps same id under different types as separate entries', async () => {
    await addRecentSearch(mk('1', 'area'));
    await addRecentSearch(mk('1', 'rayon'));
    expect(await getRecentSearches()).toHaveLength(2);
  });

  it('caps the list at 10 (FIFO)', async () => {
    for (let i = 0; i < 12; i++) {
      await addRecentSearch(mk(String(i)));
    }
    const r = await getRecentSearches();
    expect(r).toHaveLength(10);
    expect(r[0].id).toBe('11');
    expect(r.find((x) => x.id === '0')).toBeUndefined();
  });

  it('clears all entries', async () => {
    await addRecentSearch(mk('a'));
    await clearRecentSearches();
    expect(await getRecentSearches()).toEqual([]);
  });
});
