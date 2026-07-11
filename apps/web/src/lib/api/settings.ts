import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

export type ConfigValueType = 'string' | 'number' | 'boolean' | 'select';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SettingDescription {
  key: string;
  group: string;
  /** Optional sub-section within a group (SWAT-style). */
  subgroup?: string;
  valueType: ConfigValueType;
  isSecret: boolean;
  label: string;
  help?: string;
  source: 'db' | 'env' | 'unset';
  isSet: boolean;
  /** Effective value for non-secret keys only. */
  value?: string | number | boolean;
  /** Allowed options for `select` value types. */
  options?: SelectOption[];
}

export const settingsKeys = {
  all: ['system-settings'] as const,
};

export function useSystemSettings(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: async () => (await apiClient.get<SettingDescription[]>('/settings')).data,
    enabled,
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) =>
      (await apiClient.patch<SettingDescription>(`/settings/${key}`, { value })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.all }),
  });
}

export function useClearSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (key: string) =>
      (await apiClient.delete<SettingDescription>(`/settings/${key}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.all }),
  });
}
