import type { PaginatedResponse } from '@/types/models';

/**
 * Walk every page of a paginated list endpoint and return one combined response.
 *
 * The backend hard-caps `limit` (areas at 100, users at 1000) and orders by `id`,
 * so a single "load all" request with a big `limit` silently drops the tail —
 * whole rayons vanish from tables/dropdowns (e.g. Rayon Barat 2's areas, whose
 * ids sort past the first 100). Any caller that wants the complete set should
 * fetch through this instead of trusting one large-`limit` request.
 *
 * `fetchPage(page)` must request that 1-based page and return a
 * `PaginatedResponse<T>` (with `meta.totalPages`). The result is flattened to a
 * single page (`totalPages: 1`) holding every row.
 */
export async function collectAllPages<T>(
  fetchPage: (page: number) => Promise<PaginatedResponse<T>>,
): Promise<PaginatedResponse<T>> {
  const first = await fetchPage(1);
  const all = [...first.data];
  const totalPages = first.meta?.totalPages ?? 1;
  for (let page = 2; page <= totalPages; page++) {
    const next = await fetchPage(page);
    all.push(...next.data);
  }
  return {
    data: all,
    meta: { total: first.meta?.total ?? all.length, page: 1, limit: all.length, totalPages: 1 },
  };
}
