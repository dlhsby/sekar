/**
 * CRUD Hooks Factory
 * DRY factory for create/update/delete TanStack Query mutation hooks
 * Reduces boilerplate while preserving exact behavior and invalidation patterns
 */

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { apiClient } from './client';

/**
 * Configuration for a CRUD resource
 */
export interface CrudHookConfig<TEntity extends { id?: string }> {
  /** Resource name (e.g., 'rayons', 'areas', 'users') */
  resource: string;
  /** Query key for list invalidation (e.g., rayonKeys.lists()) */
  listKey: QueryKey;
  /** Optional callback to get detail key for a given ID (e.g., (id) => rayonKeys.detail(id)) */
  detailKeyFn?: (id: string) => QueryKey;
  /** Optional callback to extract ID from response data for update detail invalidation */
  getDetailIdFromResponse?: (data: TEntity) => string;
}

/**
 * Factory function to create CRUD mutation hooks with consistent behavior
 *
 * @example
 * ```ts
 * const { useCreate, useUpdate, useDelete } = makeCrudHooks<Rayon, CreateRayonDto, UpdateRayonDto>({
 *   resource: 'rayons',
 *   listKey: rayonKeys.lists(),
 *   detailKeyFn: (id) => rayonKeys.detail(id),
 * });
 * ```
 */
export function makeCrudHooks<TEntity extends { id?: string }, TCreate, TUpdate>(
  config: CrudHookConfig<TEntity>,
) {
  const useCreate = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (data: TCreate) =>
        apiClient.post<TEntity>(`/${config.resource}`, data).then((r) => r.data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: config.listKey });
      },
    });
  };

  const useUpdate = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: ({ id, data }: { id: string; data: TUpdate }) =>
        apiClient.patch<TEntity>(`/${config.resource}/${id}`, data).then((r) => r.data),
      onSuccess: (responseData, variables) => {
        queryClient.invalidateQueries({ queryKey: config.listKey });
        if (config.detailKeyFn) {
          const detailId = config.getDetailIdFromResponse
            ? config.getDetailIdFromResponse(responseData)
            : variables.id;
          queryClient.invalidateQueries({ queryKey: config.detailKeyFn(detailId) });
        }
      },
    });
  };

  const useDelete = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (id: string) =>
        apiClient.delete(`/${config.resource}/${id}`).then(() => undefined),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: config.listKey });
      },
    });
  };

  return { useCreate, useUpdate, useDelete };
}
