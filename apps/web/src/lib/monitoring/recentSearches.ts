/**
 * Recent monitoring searches — persists the user's recently-selected results
 * (petugas / area / district) to localStorage so they can jump back quickly.
 * FIFO, max 10, de-duplicated by type+id (mirrors the mobile implementation).
 */
import type { MonitoringSearchResult } from './useMonitoringSearch';

const STORAGE_KEY = 'monitoring.recentSearches.v1';
const MAX_RECENTS = 10;

export function getRecentSearches(): MonitoringSearchResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as MonitoringSearchResult[]) : [];
  } catch {
    return [];
  }
}

/** Prepend an item (most-recent first), de-dupe by type+id, cap at MAX. Returns the new list. */
export function addRecentSearch(item: MonitoringSearchResult): MonitoringSearchResult[] {
  try {
    const current = getRecentSearches();
    const deduped = current.filter((r) => !(r.type === item.type && r.id === item.id));
    const next = [item, ...deduped].slice(0, MAX_RECENTS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return getRecentSearches();
  }
}

export function clearRecentSearches(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
