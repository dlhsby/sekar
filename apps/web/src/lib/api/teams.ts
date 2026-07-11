import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import { makeCrudHooks } from './crud-hooks';

export interface TeamType {
  id: string;
  name: string;
  is_active: boolean;
}

export interface Team {
  id: string;
  name: string;
  team_type_id: string;
  team_type?: TeamType;
  marker_icon?: string | null;
  marker_color?: string | null;
  marker_image_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTeamDto {
  name: string;
  team_type_id: string;
  marker_icon?: string | null;
  marker_color?: string | null;
  marker_image_url?: string | null;
}
export type UpdateTeamDto = Partial<CreateTeamDto> & { is_active?: boolean };

export const teamKeys = {
  all: ['teams'] as const,
  lists: () => [...teamKeys.all, 'list'] as const,
  detail: (id: string) => [...teamKeys.all, 'detail', id] as const,
  types: ['team-types'] as const,
};

export function useTeams() {
  return useQuery({
    queryKey: teamKeys.lists(),
    queryFn: async () => (await apiClient.get<Team[]>('/teams')).data,
  });
}

export function useTeamTypes() {
  return useQuery({
    queryKey: teamKeys.types,
    queryFn: async () => (await apiClient.get<TeamType[]>('/team-types')).data,
    staleTime: 30 * 60 * 1000, // catalog rarely changes
  });
}

const teamCrudHooks = makeCrudHooks<Team, CreateTeamDto, UpdateTeamDto>({
  resource: 'teams',
  listKey: teamKeys.lists(),
  detailKeyFn: (id) => teamKeys.detail(id),
});

export const useCreateTeam = teamCrudHooks.useCreate;
export const useUpdateTeam = teamCrudHooks.useUpdate;
export const useDeleteTeam = teamCrudHooks.useDelete;
