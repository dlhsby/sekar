/**
 * Schedule Events API Client
 * Rule-based recurring schedules (ADR-047)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { UserRole } from '@/types/models';

export type RecurrenceType = 'none' | 'daily' | 'every_n_days' | 'weekly' | 'specific_dates';
export type ScheduleScope = 'static' | 'mobile';
export type EditScope = 'this' | 'this_and_future' | 'series';

export interface RecurrenceConfig {
  interval_n?: number;
  weekdays?: number[];
  dates?: string[];
}

export interface CreateScheduleEventInput {
  title?: string;
  recurrence_type: RecurrenceType;
  start_date: string;
  end_date?: string | null;
  recurrence_config?: RecurrenceConfig;
  shift_definition_id: string;
  scope: ScheduleScope;
  location_id?: string | null;
  region_id?: string | null;
  is_team: boolean;
  user_id?: string | null;
  team_category_id?: string | null;
  pic_user_id?: string | null;
  member_ids?: string[];
  notes?: string;
}

export interface UpdateScheduleEventInput {
  title?: string;
  recurrence_type?: RecurrenceType;
  start_date?: string;
  end_date?: string | null;
  recurrence_config?: RecurrenceConfig;
  shift_definition_id?: string;
  scope?: ScheduleScope;
  location_id?: string | null;
  region_id?: string | null;
  member_ids?: string[];
  notes?: string;
}

export interface ScheduleEvent {
  id: string;
  title: string | null;
  recurrence_type: RecurrenceType;
  start_date: string;
  end_date: string | null;
  recurrence_config: RecurrenceConfig | null;
  shift_definition_id: string;
  scope: ScheduleScope;
  location_id: string | null;
  region_id: string | null;
  is_team: boolean;
  team_category_id: string | null;
  pic_user_id: string | null;
  user_id: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  shift_definition: {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    crosses_midnight?: boolean;
  };
  location?: {
    id: string;
    name: string;
  } | null;
  region?: {
    id: string;
    name: string;
  } | null;
  team_category?: {
    id: string;
    name: string;
    marker_image_url?: string | null;
    marker_color?: string | null;
  } | null;
  pic_user?: {
    id: string;
    full_name: string;
    username: string;
    role: UserRole;
  } | null;
  user?: {
    id: string;
    full_name: string;
    username: string;
    role: UserRole;
  } | null;
  members?: Array<{
    id: string;
    user_id: string;
    full_name: string;
    username: string;
    role: UserRole;
  }>;
}

export interface ScheduleOccurrence {
  id: string;
  user_id: string;
  schedule_date: string;
  shift_definition_id: string | null;
  scope: ScheduleScope;
  status: string;
  location_id?: string | null;
  region_id?: string | null;
  schedule_event_id?: string | null;
  is_detached: boolean;
  is_projected?: boolean;
  user: {
    id: string;
    full_name: string;
    username: string;
    role: UserRole;
  };
  shift_definition: {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    crosses_midnight?: boolean;
  } | null;
  team_category?: {
    id: string;
    name: string;
    marker_image_url?: string | null;
    marker_color?: string | null;
  } | null;
  location?: {
    id: string;
    name: string;
  } | null;
  region?: {
    id: string;
    name: string;
  } | null;
}

/** Raw roster row as the backend returns it (Schedule entity: locations ride in
 * `schedule_areas[].area`; there is no `scope` field). */
interface RawScheduleRangeRow {
  id: string;
  user_id: string;
  schedule_date: string;
  shift_definition_id: string | null;
  status: string;
  region_id?: string | null;
  team_category_id?: string | null;
  schedule_event_id?: string | null;
  is_detached?: boolean;
  is_projected?: boolean;
  user: ScheduleOccurrence['user'];
  shift_definition?: ScheduleOccurrence['shift_definition'];
  schedule_areas?: Array<{ location_id: string; area?: { id: string; name: string } | null }>;
  region?: ScheduleOccurrence['region'];
  team_category?: ScheduleOccurrence['team_category'];
}

/** Normalize a raw roster row to the calendar's occurrence shape. */
function toOccurrence(row: RawScheduleRangeRow): ScheduleOccurrence {
  const firstArea = row.schedule_areas?.[0];
  return {
    id: row.id,
    user_id: row.user_id,
    schedule_date: row.schedule_date,
    shift_definition_id: row.shift_definition_id,
    scope: row.region_id ? 'mobile' : 'static',
    status: row.status,
    location_id: firstArea?.location_id ?? null,
    region_id: row.region_id ?? null,
    schedule_event_id: row.schedule_event_id ?? null,
    is_detached: row.is_detached ?? false,
    is_projected: row.is_projected ?? false,
    user: row.user,
    shift_definition: row.shift_definition ?? null,
    team_category: row.team_category ?? null,
    location: firstArea?.area ?? null,
    region: row.region ?? null,
  };
}

/** Per-member/date entry for conflicts or skipped entries */
export interface MaterializationEntry {
  user_id: string;
  date: string;
  reason?: 'exists' | 'duplicate' | string;
  conflicting_shift?: string;
}

export interface MaterializationResult {
  created: number;
  skipped: MaterializationEntry[];
  conflicts?: MaterializationEntry[];
}

export interface CreateScheduleEventResponse {
  event: ScheduleEvent;
  materialization: MaterializationResult;
}

export interface UpdateScheduleEventResponse {
  event: ScheduleEvent;
  /** Present for edit_scope=this_and_future — the split-off series. */
  new_event?: ScheduleEvent;
  materialization: MaterializationResult;
}

/**
 * Query key factory for schedule events
 */
export const scheduleEventKeys = {
  all: ['schedule-events'] as const,
  lists: () => [...scheduleEventKeys.all, 'list'] as const,
  byRange: (from: string, to: string) =>
    [...scheduleEventKeys.lists(), { from, to }] as const,
  byId: (id: string) => [...scheduleEventKeys.all, 'detail', id] as const,
};

/**
 * Query key factory for schedule occurrences (materialized roster)
 */
export const scheduleOccurrenceKeys = {
  all: ['schedule-occurrences'] as const,
  lists: () => [...scheduleOccurrenceKeys.all, 'list'] as const,
  byRange: (from: string, to: string) =>
    [...scheduleOccurrenceKeys.lists(), { from, to }] as const,
};

/**
 * Fetch schedule occurrences (materialized roster) for a date range
 */
/** Calendar range filters (query-param names match the backend, camelCase). */
export interface ScheduleRangeFilters {
  rayonId?: string;
  regionId?: string;
  locationId?: string;
  userId?: string;
  shiftDefinitionId?: string;
  teamCategoryId?: string;
}

async function fetchScheduleRange(
  from: string,
  to: string,
  filters?: ScheduleRangeFilters,
): Promise<ScheduleOccurrence[]> {
  const params = new URLSearchParams();
  params.append('from', from);
  params.append('to', to);
  if (filters?.rayonId) params.append('rayonId', filters.rayonId);
  if (filters?.regionId) params.append('regionId', filters.regionId);
  if (filters?.locationId) params.append('locationId', filters.locationId);
  if (filters?.userId) params.append('userId', filters.userId);
  if (filters?.shiftDefinitionId) params.append('shiftDefinitionId', filters.shiftDefinitionId);
  if (filters?.teamCategoryId) params.append('teamCategoryId', filters.teamCategoryId);

  const response = await apiClient.get<RawScheduleRangeRow[]>(
    `/schedules/range?${params.toString()}`,
  );
  return (response.data || []).map(toOccurrence);
}

/**
 * Fetch schedule events for a date range
 */
async function fetchScheduleEvents(
  filters?: {
    from?: string;
    to?: string;
    rayon_id?: string;
    user_id?: string;
    team_id?: string;
    shift_definition_id?: string;
    is_team?: boolean;
  },
): Promise<ScheduleEvent[]> {
  const params = new URLSearchParams();
  if (filters?.from) params.append('from', filters.from);
  if (filters?.to) params.append('to', filters.to);
  if (filters?.rayon_id) params.append('rayon_id', filters.rayon_id);
  if (filters?.user_id) params.append('user_id', filters.user_id);
  if (filters?.team_id) params.append('team_id', filters.team_id);
  if (filters?.shift_definition_id) params.append('shift_definition_id', filters.shift_definition_id);
  if (filters?.is_team !== undefined) params.append('is_team', filters.is_team ? 'true' : 'false');

  const response = await apiClient.get<ScheduleEvent[]>(
    `/schedule-events?${params.toString()}`,
  );
  return response.data || [];
}

/**
 * Fetch a single schedule event
 */
async function fetchScheduleEvent(id: string): Promise<ScheduleEvent> {
  const response = await apiClient.get<ScheduleEvent>(`/schedule-events/${id}`);
  return response.data;
}

/**
 * Create a schedule event
 */
async function createScheduleEvent(
  input: CreateScheduleEventInput,
): Promise<CreateScheduleEventResponse> {
  const response = await apiClient.post<CreateScheduleEventResponse>('/schedule-events', input);
  return response.data;
}

/**
 * Update a schedule event
 */
async function updateScheduleEvent(
  id: string,
  input: UpdateScheduleEventInput,
  editScope?: EditScope,
  fromDate?: string,
): Promise<UpdateScheduleEventResponse> {
  const params = new URLSearchParams();
  if (editScope) params.append('edit_scope', editScope);
  if (fromDate) params.append('from_date', fromDate);

  const response = await apiClient.patch<UpdateScheduleEventResponse>(
    `/schedule-events/${id}?${params.toString()}`,
    input,
  );
  return response.data;
}

/**
 * Delete a schedule event
 */
async function deleteScheduleEvent(
  id: string,
  scope?: EditScope,
  date?: string,
): Promise<void> {
  const params = new URLSearchParams();
  if (scope) params.append('scope', scope);
  if (date) params.append('date', date);

  await apiClient.delete(`/schedule-events/${id}?${params.toString()}`);
}

/**
 * Hook: Fetch schedule occurrences (materialized roster) for a date range
 */
export function useScheduleRange(
  from: string,
  to: string,
  filters?: ScheduleRangeFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: [...scheduleOccurrenceKeys.byRange(from, to), filters ?? {}],
    queryFn: () => fetchScheduleRange(from, to, filters),
    enabled,
    staleTime: 30_000,
  });
}

/**
 * Hook: Fetch schedule events
 */
export function useScheduleEvents(
  filters?: {
    from?: string;
    to?: string;
    rayon_id?: string;
    user_id?: string;
    team_id?: string;
    shift_definition_id?: string;
    is_team?: boolean;
  },
  enabled = true,
) {
  return useQuery({
    queryKey: filters ? [scheduleEventKeys.lists(), filters] : scheduleEventKeys.lists(),
    queryFn: () => fetchScheduleEvents(filters),
    enabled,
    staleTime: 30_000,
  });
}

/**
 * Hook: Fetch a single schedule event
 */
export function useScheduleEvent(id: string, enabled = true) {
  return useQuery({
    queryKey: scheduleEventKeys.byId(id),
    queryFn: () => fetchScheduleEvent(id),
    enabled,
    staleTime: 60_000,
  });
}

/**
 * Hook: Create a schedule event
 */
export function useCreateScheduleEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createScheduleEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleEventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: scheduleOccurrenceKeys.lists() });
    },
  });
}

/**
 * Hook: Update a schedule event
 */
export function useUpdateScheduleEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
      editScope,
      fromDate,
    }: {
      id: string;
      input: UpdateScheduleEventInput;
      editScope?: EditScope;
      fromDate?: string;
    }) => updateScheduleEvent(id, input, editScope, fromDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleEventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: scheduleOccurrenceKeys.lists() });
    },
  });
}

/**
 * Hook: Delete a schedule event
 */
export function useDeleteScheduleEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scope, date }: { id: string; scope?: EditScope; date?: string }) =>
      deleteScheduleEvent(id, scope, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleEventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: scheduleOccurrenceKeys.lists() });
    },
  });
}
