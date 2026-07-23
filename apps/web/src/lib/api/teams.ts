import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import { makeCrudHooks } from './crud-hooks';

export interface TeamCategory {
  id: string;
  name: string;
  is_active: boolean;
  marker_color?: string | null;
  /**
   * Alpha for `marker_color`, 0–1. A team category has ONE colour (no boundary
   * to outline, unlike the geography tiers' border/fill pair), so this is the
   * single opacity applied wherever it is drawn. Null → opaque.
   */
  marker_opacity?: number | null;
  marker_icon?: string | null;
}

export interface CreateTeamCategoryDto {
  name: string;
  is_active: boolean;
  marker_color?: string | null;
  marker_opacity?: number | null;
  marker_icon?: string | null;
}
export type UpdateTeamCategoryDto = Partial<CreateTeamCategoryDto>;

export const teamKeys = {
  all: ['teams'] as const,
  types: ['team-categories'] as const,
  typesList: (includeInactive = false) =>
    [...teamKeys.types, 'list', { includeInactive }] as const,
  typesDetail: (id: string) => [...teamKeys.types, 'detail', id] as const,
};

/**
 * Team-category catalog. Active-only by default so pickers never offer a
 * deactivated category; the catalog-management grid opts in to see them all.
 */
export function useTeamCategories(enabled = true, includeInactive = false) {
  return useQuery({
    queryKey: teamKeys.typesList(includeInactive),
    queryFn: async () =>
      (
        await apiClient.get<TeamCategory[]>('/team-categories', {
          params: includeInactive ? { include_inactive: 'true' } : undefined,
        })
      ).data,
    enabled,
    staleTime: 30 * 60 * 1000, // catalog rarely changes
  });
}

const teamCategoryCrudHooks = makeCrudHooks<TeamCategory, CreateTeamCategoryDto, UpdateTeamCategoryDto>({
  resource: 'team-categories',
  // Invalidate the whole catalog prefix: the list key is parameterized by
  // `includeInactive`, so the narrower key would leave the management grid
  // (includeInactive: true) stale after a mutation.
  listKey: teamKeys.types,
  detailKeyFn: (id) => teamKeys.typesDetail(id),
});

export const useCreateTeamCategory = teamCategoryCrudHooks.useCreate;
export const useUpdateTeamCategory = teamCategoryCrudHooks.useUpdate;
export const useDeleteTeamCategory = teamCategoryCrudHooks.useDelete;
