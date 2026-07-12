import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import { makeCrudHooks } from './crud-hooks';

export interface TeamType {
  id: string;
  name: string;
  is_active: boolean;
  marker_image_url?: string | null;
  marker_color?: string | null;
}

export interface CreateTeamTypeDto {
  name: string;
  is_active: boolean;
  marker_image_url?: string | null;
  marker_color?: string | null;
}
export type UpdateTeamTypeDto = Partial<CreateTeamTypeDto>;

export const teamKeys = {
  all: ['teams'] as const,
  types: ['team-types'] as const,
  typesList: () => [...teamKeys.types, 'list'] as const,
  typesDetail: (id: string) => [...teamKeys.types, 'detail', id] as const,
};

export function useTeamTypes(enabled = true) {
  return useQuery({
    queryKey: teamKeys.typesList(),
    queryFn: async () => (await apiClient.get<TeamType[]>('/team-types')).data,
    enabled,
    staleTime: 30 * 60 * 1000, // catalog rarely changes
  });
}

const teamTypeCrudHooks = makeCrudHooks<TeamType, CreateTeamTypeDto, UpdateTeamTypeDto>({
  resource: 'team-types',
  listKey: teamKeys.typesList(),
  detailKeyFn: (id) => teamKeys.typesDetail(id),
});

export const useCreateTeamType = teamTypeCrudHooks.useCreate;
export const useUpdateTeamType = teamTypeCrudHooks.useUpdate;
export const useDeleteTeamType = teamTypeCrudHooks.useDelete;
