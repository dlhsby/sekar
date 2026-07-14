import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

export type StaffRole = 'satgas' | 'linmas';
export type DayType = 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY';

export interface StaffRequirement {
  id: string;
  /** Exactly one of location/region/rayon is set (or none = city-wide). */
  location_id: string | null;
  region_id?: string | null;
  rayon_id?: string | null;
  shift_definition_id: string;
  role: StaffRole;
  day_type: DayType;
  required_count: number;
}

/** The subject a requirement attaches to (drives the editor's endpoint). */
export type StaffSubjectType = 'location' | 'region' | 'rayon';
export interface StaffSubject {
  type: StaffSubjectType;
  id: string;
  name: string;
}

/** REST base for a subject's requirements: /areas|regions|rayons/:id/... */
function subjectBase(type: StaffSubjectType, id: string): string {
  const seg = type === 'location' ? 'areas' : type === 'region' ? 'regions' : 'rayons';
  return `/${seg}/${id}/staff-requirements`;
}

export interface StaffRequirementItem {
  shift_definition_id: string;
  role: StaffRole;
  day_type: DayType;
  required_count: number;
}

export const staffRequirementKeys = {
  all: ['staff-requirements'] as const,
  location: (id: string) => ['staff-requirements', id] as const,
  subject: (type: StaffSubjectType, id: string) => ['staff-requirements', type, id] as const,
};

/** WEEKEND on Sat/Sun, else WEEKDAY (holiday detection is a follow-up). */
export function dayTypeOf(isoDate: string): DayType {
  const d = new Date(`${isoDate}T00:00:00`).getDay();
  return d === 0 || d === 6 ? 'WEEKEND' : 'WEEKDAY';
}

/** All staffing requirements (bulk) — feeds the board's understaffing pills. */
export function useStaffRequirements(enabled = true) {
  return useQuery({
    queryKey: staffRequirementKeys.all,
    queryFn: async () => (await apiClient.get<StaffRequirement[]>('/staff-requirements')).data,
    enabled,
    staleTime: 60_000,
  });
}

/** Per-location requirements (for the editor). */
export function useLocationStaffRequirements(locationId: string, enabled = true) {
  return useQuery({
    queryKey: staffRequirementKeys.location(locationId),
    queryFn: async () =>
      (await apiClient.get<StaffRequirement[]>(`/areas/${locationId}/staff-requirements`)).data,
    enabled: enabled && !!locationId,
  });
}

export function useSetStaffRequirements() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      locationId,
      items,
    }: {
      locationId: string;
      items: StaffRequirementItem[];
    }) =>
      (
        await apiClient.put<StaffRequirement[]>(`/areas/${locationId}/staff-requirements`, {
          items,
        })
      ).data,
    onSuccess: (_data, { locationId }) => {
      qc.invalidateQueries({ queryKey: staffRequirementKeys.all });
      qc.invalidateQueries({ queryKey: staffRequirementKeys.location(locationId) });
    },
  });
}

/** A subject's requirements (for the editor), polymorphic over location/region/rayon. */
export function useSubjectStaffRequirements(subject: StaffSubject | null, enabled = true) {
  return useQuery({
    queryKey: subject
      ? staffRequirementKeys.subject(subject.type, subject.id)
      : ['staff-requirements', 'none'],
    queryFn: async () =>
      (await apiClient.get<StaffRequirement[]>(subjectBase(subject!.type, subject!.id))).data,
    enabled: enabled && !!subject,
  });
}

/** Bulk-set a subject's requirements (location/region/rayon). */
export function useSetSubjectStaffRequirements() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      subject,
      items,
    }: {
      subject: StaffSubject;
      items: StaffRequirementItem[];
    }) =>
      (await apiClient.put<StaffRequirement[]>(subjectBase(subject.type, subject.id), { items }))
        .data,
    onSuccess: (_data, { subject }) => {
      qc.invalidateQueries({ queryKey: staffRequirementKeys.all });
      qc.invalidateQueries({ queryKey: staffRequirementKeys.subject(subject.type, subject.id) });
    },
  });
}

/**
 * Subject-prefixed key → total required (satgas + linmas) for the given day type
 * — the board's understaffing threshold. Keys: `loc:{id}:{shift}` for
 * location-level, `reg:{id}:{shift}` for region (kawasan)-level, `ray:{id}:{shift}`
 * for rayon-level. A requirement is rendered wherever its subject appears on the
 * board, so grouped rayons flag understaffing on the kawasan row and Taman Aktif
 * on the park row.
 */
export function requirementTotalMap(
  rows: StaffRequirement[],
  dayType: DayType
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    if (r.day_type !== dayType) continue;
    const key = r.region_id
      ? `reg:${r.region_id}:${r.shift_definition_id}`
      : r.rayon_id
        ? `ray:${r.rayon_id}:${r.shift_definition_id}`
        : r.location_id
          ? `loc:${r.location_id}:${r.shift_definition_id}`
          : null;
    if (!key) continue;
    m.set(key, (m.get(key) ?? 0) + r.required_count);
  }
  return m;
}
