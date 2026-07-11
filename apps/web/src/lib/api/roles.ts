import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

export type MonitoringScope = 'city' | 'district' | 'region' | 'location' | 'none';

export interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_system: boolean;
  monitoring_scope: MonitoringScope;
  marker_icon?: string;
  marker_image_url?: string | null;
  /** Role accent colour (hex #RRGGBB) — tints the user pill/avatar. */
  marker_color?: string | null;
  permissionKeys: string[];
  permissionCount: number;
  userCount: number;
  created_at: string;
  updated_at: string;
}

export interface PermissionCatalogAction {
  key: string;
  action: string;
  label: string;
  description: string;
}
export interface PermissionCatalogResource {
  resource: string;
  label: string;
  actions: PermissionCatalogAction[];
}
export interface PermissionCatalogCategory {
  category: string;
  label: string;
  resources: PermissionCatalogResource[];
}

export interface RolePayload {
  name?: string;
  description?: string;
  monitoring_scope?: MonitoringScope;
  marker_icon?: string;
  marker_image_url?: string | null;
  marker_color?: string;
  permissionKeys?: string[];
}

export const roleKeys = {
  all: ['roles'] as const,
  list: () => [...roleKeys.all, 'list'] as const,
  catalog: ['permission-catalog'] as const,
};

export function useRoles() {
  return useQuery({
    queryKey: roleKeys.list(),
    queryFn: async () => (await apiClient.get<Role[]>('/roles')).data,
  });
}

export function usePermissionCatalog() {
  return useQuery({
    queryKey: roleKeys.catalog,
    queryFn: async () =>
      (await apiClient.get<PermissionCatalogCategory[]>('/permissions')).data,
    staleTime: 60 * 60 * 1000, // catalog is static (code-side)
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RolePayload) =>
      (await apiClient.post<Role>('/roles', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.all }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: RolePayload }) =>
      (await apiClient.patch<Role>(`/roles/${id}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.all }),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/roles/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.all }),
  });
}
