import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import { makeCrudHooks } from './crud-hooks';

export interface TeamCategory {
  id: string;
  name: string;
  is_active: boolean;
  marker_image_url?: string | null;
  marker_color?: string | null;
}

export interface CreateTeamCategoryDto {
  name: string;
  is_active: boolean;
  marker_image_url?: string | null;
  marker_color?: string | null;
}
export type UpdateTeamCategoryDto = Partial<CreateTeamCategoryDto>;

export const teamKeys = {
  all: ['teams'] as const,
  types: ['team-categories'] as const,
  typesList: () => [...teamKeys.types, 'list'] as const,
  typesDetail: (id: string) => [...teamKeys.types, 'detail', id] as const,
};

export function useTeamCategories(enabled = true) {
  return useQuery({
    queryKey: teamKeys.typesList(),
    queryFn: async () => (await apiClient.get<TeamCategory[]>('/team-categories')).data,
    enabled,
    staleTime: 30 * 60 * 1000, // catalog rarely changes
  });
}

const teamCategoryCrudHooks = makeCrudHooks<TeamCategory, CreateTeamCategoryDto, UpdateTeamCategoryDto>({
  resource: 'team-categories',
  listKey: teamKeys.typesList(),
  detailKeyFn: (id) => teamKeys.typesDetail(id),
});

export const useCreateTeamCategory = teamCategoryCrudHooks.useCreate;
export const useUpdateTeamCategory = teamCategoryCrudHooks.useUpdate;
export const useDeleteTeamCategory = teamCategoryCrudHooks.useDelete;
