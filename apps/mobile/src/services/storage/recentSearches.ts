/**
 * recentSearches — persists the user's recently-selected monitoring search
 * results (petugas / area / district) so they can jump back to them quickly.
 *
 * FIFO, max 10, de-duplicated by type+id. Non-sensitive → plain AsyncStorage
 * (mirrors src/services/storage/asyncStorageKeys.ts conventions).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SearchResult } from '../../hooks/useMonitoringSearch';

const RECENT_SEARCHES_KEY = '@sekar:monitoring_recent_searches';
const MAX_RECENTS = 10;

export async function getRecentSearches(): Promise<SearchResult[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to read recent searches:', error);
    return [];
  }
}

/** Prepend an item (most-recent first), de-dupe by type+id, cap at MAX. Returns the new list. */
export async function addRecentSearch(item: SearchResult): Promise<SearchResult[]> {
  try {
    const current = await getRecentSearches();
    const deduped = current.filter((r) => !(r.type === item.type && r.id === item.id));
    const next = [item, ...deduped].slice(0, MAX_RECENTS);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    return next;
  } catch (error) {
    console.error('Failed to add recent search:', error);
    return [];
  }
}

export async function clearRecentSearches(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch (error) {
    console.error('Failed to clear recent searches:', error);
  }
}
