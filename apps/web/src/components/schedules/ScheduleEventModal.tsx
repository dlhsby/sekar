'use client';

/**
 * Create/edit a ScheduleEvent (ADR-047): individual or team, static (location)
 * or mobile (region) scope, and structured recurrence (none / daily / every N
 * days / weekly / specific dates). On save the backend materializes in-horizon
 * occurrences and reports per-member conflicts, surfaced here as a warning.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  Button,
  DatePicker,
  FormInput,
  FormSelect,
  FormCombobox,
  Label,
} from '@/components/ui';
import { AsyncUserCombobox, type PickedUser } from '@/components/forms/AsyncUserCombobox';
import { TeamFields } from '@/components/schedules/TeamFields';
import { RecurrenceFields } from '@/components/schedules/RecurrenceFields';
import { ScopeFields } from '@/components/schedules/ScopeFields';
import {
  useCreateScheduleEvent,
  useUpdateScheduleEvent,
  type CreateScheduleEventInput,
  type UpdateScheduleEventInput,
  type EditScope,
  type MaterializationEntry,
  type RecurrenceType,
  type ScheduleEvent,
} from '@/lib/api/schedule-events';
import { useShiftDefinitions } from '@/lib/api/shift-definitions';
import { useTeamCategories } from '@/lib/api/teams';
import { useLocations } from '@/lib/api/locations';
import { useRegions } from '@/lib/api/regions';
import { useDistricts } from '@/lib/api/districts';
import { usePermissions } from '@/lib/auth/usePermissions';
import { getErrorMessage } from '@/lib/api/client';

export interface ScheduleEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: ScheduleEvent;
  editScope?: EditScope;
  fromDate?: string;
  initialDate?: string;
  /** Pre-fill the assignment cascade when created from a specific board row. */
  initialDistrictId?: string;
  initialRegionId?: string;
  initialLocationId?: string;
  initialShiftId?: string;
  initialCityWide?: boolean;
  /** Open on the TEAM target (from the board's Tim column "+ Tugaskan"). */
  initialTeam?: boolean;
  /** Role column the assign came from — pins kind=individual and the role. */
  initialRole?: string;
  /**
   * Prefill the worker — used by "Belum Dijadwalkan" (ADR-054), where the admin
   * has already picked WHO from the gap list and only needs to say where/when.
   * Implies an individual assignment, so `kind` and `role` follow from it.
   */
  initialUserId?: string;
  /**
   * Display name for `initialUserId`. The worker combobox is server-paged, so
   * nothing in this form knows a user's name until it has been searched — set
   * the id alone and the field renders an empty "…" while silently holding a
   * valid value, which reads as "nothing selected". Passing the name is what
   * makes the prefill visible.
   */
  initialUserName?: string;
  /**
   * Whether the SHIFT and GEOGRAPHY prefills are facts or suggestions.
   *
   * From the board's "+ Tugaskan" they are facts — the operator clicked a
   * specific cell — so they lock. From "Belum Dijadwalkan" they are the panel's
   * filters, which describe a target the operator may well revise once they see
   * the form; locking them there turns a helpful prefill into a dead end.
   * The WORKER and their role stay locked either way: those come from an
   * explicit person choice, not a filter.
   */
  lockPrefill?: boolean;
  onSuccess?: () => void;
}

/** Roles that can appear on a schedule (ADR-047). */
/**
 * Schedulable roles, ordered by RANK (highest first), then alphabetically within
 * a rank. A flat source order made the picker read as an arbitrary list; rank
 * order matches how the org actually reads its own roles.
 */
const ROLE_RANK: Record<string, number> = {
  superadmin: 0,
  admin_system: 1,
  management: 2,
  kepala_rayon: 3,
  admin_rayon: 4,
  korlap: 5,
  linmas: 6,
  satgas: 7,
};
export const byRoleRank = (a: string, b: string): number =>
  (ROLE_RANK[a] ?? 99) - (ROLE_RANK[b] ?? 99) || a.localeCompare(b);

const SCHEDULABLE_ROLES = ['satgas', 'linmas', 'korlap'].sort(byRoleRank);

/** Display order Mon..Sun; values are JS getDay() (0=Sunday). */

type TFn = (key: string, opts?: Record<string, unknown>) => string;

function createSchema(t: TFn) {
  return z
    .object({
      title: z.string().max(120).optional(),
      // '' is the un-chosen state: the form preselects nothing, so every select
      // must tolerate it and be *required* rather than silently defaulted.
      kind: z.enum(['individual', 'team']).or(z.literal('')),
      /** Narrows the worker list; not sent to the API (the user carries a role). */
      role: z.string().optional(),
      /** Same, for the team's PIC. */
      pic_role: z.string().optional(),
      user_id: z.string().optional(),
      team_category_id: z.string().optional(),
      pic_user_id: z.string().optional(),
      member_ids: z.array(z.string()),
      shift_definition_id: z.string().min(1, t('validation:required')),
      // Explicit scope ("Ruang Lingkup") drives which geography selects show and
      // which are required: city → none · district → district · region → district+kawasan ·
      // location → district+kawasan+lokasi. Maps to the API scope on save.
      scope: z.enum(['city', 'district', 'region', 'location']).or(z.literal('')),
      location_id: z.string().optional(),
      region_id: z.string().optional(),
      district_id: z.string().optional(),
      recurrence_type: z
        .enum(['none', 'daily', 'every_n_days', 'weekly', 'specific_dates'])
        .or(z.literal('')),
      // Registered with valueAsNumber (plain z.number keeps RHF input/output
      // types aligned — z.coerce diverges them and breaks the resolver types).
      interval_n: z.number().int().optional(),
      weekdays: z.array(z.number()),
      dates: z.array(z.string()),
      start_date: z.string().min(1, t('validation:required')),
      end_date: z.string().optional(),
      notes: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      for (const field of ['kind', 'scope', 'recurrence_type'] as const) {
        if (!data[field]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: t('validation:required'),
          });
        }
      }
      if (data.kind === 'individual' && !data.role) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['role'],
          message: t('validation:required'),
        });
      }
      if (data.kind === 'individual' && !data.user_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['user_id'],
          message: t('validation:required'),
        });
      }
      if (data.kind === 'team') {
        if (!data.team_category_id) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['team_category_id'],
            message: t('validation:required'),
          });
        }
        if (!data.pic_role) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['pic_role'],
            message: t('validation:required'),
          });
        }
        if (!data.pic_user_id) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['pic_user_id'],
            message: t('validation:required'),
          });
        }
      }
      // Each scope requires the geography down to its level. No scope chosen yet
      // → the scope's own "required" above is the message; don't pile on.
      if (data.scope && data.scope !== 'city' && !data.district_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['district_id'],
          message: t('validation:required'),
        });
      }
      // Only the mobile (kawasan-wide) scope needs a kawasan. For a lokasi scope
      // it is just a filter — demanding it made district-direct lokasi impossible.
      if (data.scope === 'region' && !data.region_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['region_id'],
          message: t('validation:required'),
        });
      }
      if (data.scope === 'location' && !data.location_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['location_id'],
          message: t('validation:required'),
        });
      }
      if (data.recurrence_type === 'every_n_days') {
        if (!data.interval_n || data.interval_n < 2 || data.interval_n > 30) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['interval_n'],
            message: t('schedules:calendar.validation.intervalRange'),
          });
        }
      }
      if (data.recurrence_type === 'weekly' && data.weekdays.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['weekdays'],
          message: t('schedules:calendar.validation.weekdaysRequired'),
        });
      }
      if (data.recurrence_type === 'specific_dates' && data.dates.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dates'],
          message: t('schedules:calendar.validation.datesRequired'),
        });
      }
      if (data.end_date && data.start_date && data.end_date < data.start_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['end_date'],
          message: t('schedules:calendar.validation.endBeforeStart'),
        });
      }
    });
}

/** Exported so the extracted sub-forms type against the real shape rather than
 *  `any` — a type-only import, so the cycle is erased at build. */
export type FormValues = z.infer<ReturnType<typeof createSchema>>;
type ScopeValue = FormValues['scope'];

/** Map an event's API scope (static/mobile/district/city) to the form scope. */
function eventToFormScope(scope: ScheduleEvent['scope']): ScopeValue {
  if (scope === 'static') return 'location';
  if (scope === 'mobile') return 'region';
  if (scope === 'city') return 'city';
  return 'district';
}

/**
 * The scope a fresh event starts on, derived from the board row it was created
 * from. Returns '' when there is no prefill: the form preselects nothing, so an
 * operator can't save a default they never looked at.
 */
function initialFormScope(opts: {
  cityWide?: boolean;
  locationId?: string;
  regionId?: string;
  districtId?: string;
}): ScopeValue | '' {
  if (opts.locationId) return 'location';
  if (opts.regionId) return 'region';
  if (opts.cityWide) return 'city';
  if (opts.districtId) return 'district';
  return '';
}

export function ScheduleEventModal({
  open,
  onOpenChange,
  event,
  editScope = 'series',
  fromDate,
  initialDate,
  initialDistrictId,
  initialRegionId,
  initialLocationId,
  initialShiftId,
  initialCityWide,
  initialTeam,
  initialRole,
  initialUserId,
  initialUserName,
  lockPrefill = true,
  onSuccess,
}: ScheduleEventModalProps) {
  const { t } = useTranslation(['schedules', 'common', 'validation', 'roles']);
  const { can } = usePermissions();

  const isEditing = !!event;
  const isDisabled = isEditing ? !can('schedule:update') : !can('schedule:create');

  const schema = useMemo(() => createSchema(t as TFn), [t]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: event?.title ?? '',
      // Nothing is preselected. A prefill from a board row is the only thing
      // that chooses for you — and then it's locked, not merely defaulted.
      kind: event
        ? event.is_team
          ? 'team'
          : 'individual'
        : initialTeam
          ? 'team'
          : initialRole || initialUserId
            ? 'individual'
            : '',
      role: initialRole ?? '',
      pic_role: event?.pic_user?.role ?? '',
      user_id: event?.user_id ?? initialUserId ?? '',
      team_category_id: event?.team_category_id ?? '',
      pic_user_id: event?.pic_user_id ?? '',
      member_ids: event?.members?.map((m) => m.user_id) ?? [],
      shift_definition_id: event?.shift_definition_id ?? initialShiftId ?? '',
      location_id: event?.location_id ?? initialLocationId ?? '',
      region_id: event?.region_id ?? initialRegionId ?? '',
      district_id: event?.district_id ?? initialDistrictId ?? '',
      scope: event
        ? eventToFormScope(event.scope)
        : initialFormScope({
            cityWide: initialCityWide,
            locationId: initialLocationId,
            regionId: initialRegionId,
            districtId: initialDistrictId,
          }),
      // 'Sekali' was preselected, so a one-off could be saved without the
      // operator ever choosing the recurrence.
      recurrence_type: event?.recurrence_type ?? '',
      interval_n: event?.recurrence_config?.interval_n ?? 2,
      weekdays: event?.recurrence_config?.weekdays ?? [],
      dates: event?.recurrence_config?.dates ?? [],
      start_date: event?.start_date ?? initialDate ?? '',
      end_date: event?.end_date ?? '',
      notes: event?.notes ?? '',
    },
  });

  const createMutation = useCreateScheduleEvent();
  const updateMutation = useUpdateScheduleEvent();

  const { data: shifts = [] } = useShiftDefinitions();
  const { data: teamCategories = [] } = useTeamCategories(
    can('schedule:create') || can('schedule:update')
  );
  const { data: locationsResp } = useLocations({ limit: 1000 });
  const { data: regions = [] } = useRegions();
  const { data: districts = [] } = useDistricts();

  /**
   * Names/roles of users this form has actually touched — picked from a combobox
   * or carried on the event being edited. The comboboxes are server-paged, so
   * nothing else knows a user's name; keeping a small map here is what lets the
   * member list render without preloading the whole roster (~3000 workers) just
   * to resolve labels.
   */
  const [userMeta, setUserMeta] = useState<Record<string, PickedUser>>({});
  const rememberUser = useCallback((u: PickedUser) => {
    setUserMeta((prev) => (prev[u.id] ? prev : { ...prev, [u.id]: u }));
  }, []);

  // Member draft: role first, then the worker, then Add.
  const [memberRole, setMemberRole] = useState('');
  const [memberDraftId, setMemberDraftId] = useState('');

  // Editing: the event carries its members' names/roles, so seed the map from it
  // rather than looking 3000 users up.
  useEffect(() => {
    if (!event) return;
    const seed: PickedUser[] = [
      ...(event.members ?? []).map((m) => ({
        id: m.user_id,
        full_name: m.full_name,
        role: m.role as string,
      })),
      ...(event.pic_user
        ? [{ id: event.pic_user.id, full_name: event.pic_user.full_name, role: event.pic_user.role as string }]
        : []),
    ];
    if (seed.length) setUserMeta((prev) => ({ ...Object.fromEntries(seed.map((u) => [u.id, u])), ...prev }));
  }, [event]);

  const userNameById = useMemo(
    () => new Map(Object.values(userMeta).map((u) => [u.id, u.full_name])),
    [userMeta]
  );
  const locations = locationsResp?.data ?? [];

  const formKind = watch('kind');
  const formScope = watch('scope');
  const formDistrict = watch('district_id');
  const formRegion = watch('region_id');
  const formRecurrence = watch('recurrence_type');
  const formPic = watch('pic_user_id');
  const [dateDraft, setDateDraft] = useState('');

  // Created from a specific district/kawasan/lokasi board row → the schedule belongs
  // to that geography, so "Surabaya" (city) isn't a sensible option.
  const lockGeoScope = !isEditing && !!(initialDistrictId || initialRegionId || initialLocationId);

  /**
   * Assigning from a board cell answers the where/when/who-kind already — the
   * operator clicked "+ Tugaskan" in a specific shift, role and container. Those
   * are facts, not defaults, so they are shown and DISABLED: leaving them
   * editable invites a silent mismatch between the cell clicked and the schedule
   * saved. Only the genuinely open fields stay fillable.
   */
  const lockShift = !isEditing && lockPrefill && !!initialShiftId;
  const lockKind = !isEditing && !!(initialTeam || initialRole || initialUserId);
  const lockRole = !isEditing && !!initialRole;
  // The worker is a FACT wherever a prefill supplies one — they were chosen from
  // a list before this form opened, so re-picking them here is only a way to
  // contradict that choice.
  const lockUser = !isEditing && !!initialUserId;
  const lockScope = !isEditing && lockPrefill && !!(lockGeoScope || initialCityWide);
  const lockDistrict = !isEditing && lockPrefill && !!initialDistrictId;
  const lockRegion = !isEditing && lockPrefill && !!initialRegionId;
  const lockLocation = !isEditing && lockPrefill && !!initialLocationId;
  const scopeOptions: Array<{ value: ScopeValue; label: string }> = [
    ...(lockGeoScope
      ? []
      : [{ value: 'city' as const, label: t('schedules:calendar.event.scopeCity') }]),
    { value: 'district', label: t('schedules:calendar.event.scopeDistrict') },
    { value: 'region', label: t('schedules:calendar.event.scopeKawasan') },
    { value: 'location', label: t('schedules:calendar.event.scopeLokasi') },
  ];

  const handleScopeChange = (v: ScopeValue) => {
    setValue('scope', v, { shouldValidate: true });
    // Clear geography deeper than the new scope so stale ids don't leak on save.
    if (v === 'city') {
      setValue('district_id', '');
      setValue('region_id', '');
      setValue('location_id', '');
    } else if (v === 'district') {
      setValue('region_id', '');
      setValue('location_id', '');
    } else if (v === 'region') {
      setValue('location_id', '');
    }
  };

  const shiftOptions = shifts.map((s) => ({ value: s.id, label: s.name }));
  const teamCategoryOptions = teamCategories
    .filter((tt) => tt.is_active)
    .map((tt) => ({ value: tt.id, label: tt.name }));
  const districtOptions = districts.map((r) => ({ value: r.id, label: r.name }));
  // Kawasan options cascade from the chosen district; lokasi from the chosen kawasan.
  const regionOptions = regions
    .filter((r) => r.district_id === formDistrict)
    .map((r) => ({ value: r.id, label: r.name }));
  // A lokasi belongs to a RAYON; a kawasan is an optional parent (ADR-045), so
  // Rayon Taman Aktif hangs its lokasi straight off the district with region_id
  // NULL. Filtering on `region_id === formRegion` therefore matched nothing for
  // them and made every district-direct lokasi unreachable — the board renders them
  // as `looseLocations`, but this form could not offer them at all.
  // Kawasan is a NARROWING filter here, not a required step.
  const locationOptions = locations
    .filter((l) => l.district_id === formDistrict)
    .filter((l) => !formRegion || l.region_id === formRegion)
    .map((l) => ({ value: l.id, label: l.name }));

  // Editing a static/mobile event: backfill the district → kawasan cascade from the
  // event's location/region once master data is loaded, so the selects show the
  // current assignment (the event only carries the deepest id).
  const backfilled = useRef(false);
  useEffect(() => {
    if (!event || backfilled.current) return;
    if (event.location_id) {
      const loc = locations.find((l) => l.id === event.location_id);
      if (!loc) {
        // Still loading → retry next render. Loaded but genuinely missing →
        // surface it (the cascade can't be resolved) instead of failing silent.
        if (locations.length === 0) return;
        backfilled.current = true;
        toast.warning(t('schedules:calendar.event.assignmentUnresolved'));
        return;
      }
      if (loc.region_id) setValue('region_id', loc.region_id);
      setValue('district_id', loc.district_id);
      backfilled.current = true;
    } else if (event.region_id) {
      const reg = regions.find((r) => r.id === event.region_id);
      if (!reg) {
        if (regions.length === 0) return;
        backfilled.current = true;
        toast.warning(t('schedules:calendar.event.assignmentUnresolved'));
        return;
      }
      setValue('district_id', reg.district_id);
      backfilled.current = true;
    } else {
      backfilled.current = true; // district/city scope or manual — defaults already suffice
    }
  }, [event, locations, regions, setValue, t]);
  const recurrenceOptions: Array<{ value: RecurrenceType; label: string }> = [
    { value: 'none', label: t('schedules:calendar.event.recurrenceNone') },
    { value: 'daily', label: t('schedules:calendar.event.recurrenceDaily') },
    { value: 'every_n_days', label: t('schedules:calendar.event.recurrenceEveryNDays') },
    { value: 'weekly', label: t('schedules:calendar.event.recurrenceWeekly') },
    { value: 'specific_dates', label: t('schedules:calendar.event.recurrenceSpecificDates') },
  ];

  const warnConflicts = (result: {
    skipped?: MaterializationEntry[];
    conflicts?: MaterializationEntry[];
  }) => {
    const { skipped = [], conflicts = [] } = result;
    const hasWarnings = conflicts.length > 0 || skipped.length > 0;
    if (!hasWarnings) return false;

    const messages: string[] = [];

    if (conflicts.length > 0) {
      const conflictLines = conflicts
        .slice(0, 3)
        .map(
          (c) =>
            `${userNameById.get(c.user_id) ?? c.user_id} ${c.date}${c.conflicting_shift ? ` (${c.conflicting_shift})` : ''}`
        )
        .join('; ');
      const conflictMore =
        conflicts.length > 3
          ? ` ${t('schedules:calendar.conflicts.more', { count: conflicts.length - 3 })}`
          : '';
      messages.push(
        `${t('schedules:calendar.conflicts.createdWarning')} ${conflictLines}${conflictMore}`
      );
    }

    if (skipped.length > 0) {
      const skipLines = skipped
        .slice(0, 3)
        .map((s) => `${userNameById.get(s.user_id) ?? s.user_id} ${s.date}`)
        .join('; ');
      const skipMore =
        skipped.length > 3
          ? ` ${t('schedules:calendar.conflicts.more', { count: skipped.length - 3 })}`
          : '';
      messages.push(`${t('schedules:calendar.conflicts.skipped')} ${skipLines}${skipMore}`);
    }

    toast.warning(messages.join(' · '));
    return true;
  };

  const onSubmit = async (data: FormValues) => {
    // The schema requires all three (nothing is preselected any more), so this
    // is unreachable — it exists to narrow '' away for the payload below.
    if (!data.kind || !data.scope || !data.recurrence_type) return;
    try {
      const recurrenceConfig =
        data.recurrence_type === 'every_n_days'
          ? { interval_n: data.interval_n }
          : data.recurrence_type === 'weekly'
            ? { weekdays: [...data.weekdays].sort((a, b) => a - b) }
            : data.recurrence_type === 'specific_dates'
              ? { dates: [...data.dates].sort() }
              : undefined;

      // Map the explicit form scope to the API scope:
      // location → static · region (kawasan) → mobile · district → district · city → city.
      const scope =
        data.scope === 'location'
          ? 'static'
          : data.scope === 'region'
            ? 'mobile'
            : data.scope === 'city'
              ? 'city'
              : 'district';

      const payload: CreateScheduleEventInput = {
        title: data.title || undefined,
        recurrence_type: data.recurrence_type,
        start_date: data.start_date,
        end_date: data.end_date || null,
        recurrence_config: recurrenceConfig,
        shift_definition_id: data.shift_definition_id,
        scope,
        location_id: scope === 'static' ? data.location_id : null,
        region_id: scope === 'mobile' ? data.region_id : null,
        district_id: scope === 'district' ? data.district_id : null,
        is_team: data.kind === 'team',
        user_id: data.kind === 'individual' ? data.user_id : null,
        team_category_id: data.kind === 'team' ? data.team_category_id : null,
        pic_user_id: data.kind === 'team' ? data.pic_user_id : null,
        member_ids:
          data.kind === 'team' ? data.member_ids.filter((id) => id !== data.pic_user_id) : [],
        notes: data.notes || undefined,
      };

      if (isEditing && event) {
        // Kind (individual/team target) is immutable on the backend — strip it.

        const {
          is_team: _,
          user_id: __,
          team_category_id: ___,
          pic_user_id: ____,
          ...updatable
        } = payload;
        const result = await updateMutation.mutateAsync({
          id: event.id,
          // member_ids only applies to team events — the backend rejects it
          // on individual events.
          input: {
            ...updatable,
            ...(event.is_team ? { member_ids: payload.member_ids } : {}),
          } as UpdateScheduleEventInput,
          editScope,
          fromDate,
        });
        if (!warnConflicts(result.materialization)) {
          toast.success(t('schedules:calendar.messages.updateSuccess'));
        }
      } else {
        const result = await createMutation.mutateAsync(payload);
        if (!warnConflicts(result.materialization)) {
          toast.success(t('schedules:calendar.messages.createSuccess'));
        }
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t('schedules:calendar.event.editTitle')
              : t('schedules:calendar.event.createTitle')}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form id="event-form" className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <ScopeFields
              t={t}
              errors={errors}
              setValue={setValue}
              scope={formScope}
              onScopeChange={handleScopeChange}
              scopeOptions={scopeOptions}
              districtId={formDistrict || ''}
              regionId={formRegion || ''}
              locationId={watch('location_id') || ''}
              districtOptions={districtOptions}
              regionOptions={regionOptions}
              locationOptions={locationOptions}
              lockScope={lockScope}
              lockDistrict={lockDistrict}
              lockRegion={lockRegion}
              lockLocation={lockLocation}
            />

            {/* Kind: individual vs team (immutable when editing) */}
            <FormSelect
              label={t('schedules:calendar.event.kindLabel')}
              options={[
                { value: 'individual', label: t('schedules:calendar.event.kindIndividual') },
                { value: 'team', label: t('schedules:calendar.event.kindTeam') },
              ]}
              value={formKind}
              placeholder={t('schedules:calendar.event.kindPlaceholder')}
              onChange={(v) => {
                setValue('kind', v as 'individual' | 'team', { shouldValidate: true });
                // Switching target clears the other side's picks so a hidden
                // field can't ride along to the API.
                setValue('role', '');
                setValue('user_id', '');
              }}
              error={errors.kind?.message}
              required
              disabled={isEditing || lockKind}
            />

            {/* Peran + Pekerja read as one decision — "which satgas?" — so they
                sit on one row. Peran is REQUIRED and gates Pekerja: "Semua peran"
                would fetch every schedulable user before the operator has said
                what they want. Not sent to the API — the chosen user carries
                their own role. */}
            {formKind === 'individual' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormSelect
                  label={t('schedules:calendar.event.roleLabel')}
                  options={SCHEDULABLE_ROLES.map((r) => ({ value: r, label: t(`roles:${r}`, r) }))}
                  value={watch('role') || ''}
                  placeholder={t('schedules:calendar.event.rolePlaceholder')}
                  onChange={(v) => {
                    setValue('role', v, { shouldValidate: true });
                    // The current pick may not hold the new role.
                    setValue('user_id', '', { shouldValidate: true });
                  }}
                  error={errors.role?.message}
                  required
                  disabled={isEditing || lockRole}
                />
                {/* Shown from the start, disabled until Peran narrows it: hiding
                    it made the form jump as a role was picked. Disabled means it
                    fetches nothing, so the roster still isn't pulled early. */}
                <AsyncUserCombobox
                  label={t('schedules:calendar.event.workerLabel')}
                  required
                  roles={watch('role') ? [watch('role') as string] : undefined}
                  value={watch('user_id') || ''}
                  onValueChange={(v, u) => {
                    setValue('user_id', v, { shouldValidate: true });
                    if (u) rememberUser(u);
                  }}
                  initialLabel={event?.user?.full_name ?? initialUserName}
                  placeholder={t('schedules:calendar.event.workerPlaceholder')}
                  error={errors.user_id?.message}
                  disabled={isEditing || lockUser || !watch('role')}
                />
              </div>
            )}

            {formKind === 'team' && (
              <TeamFields
                control={control}
                setValue={setValue}
                errors={errors}
                t={t}
                isEditing={isEditing}
                event={event}
                teamCategoryOptions={teamCategoryOptions}
                schedulableRoles={SCHEDULABLE_ROLES}
                teamCategoryId={watch('team_category_id') || ''}
                picRole={watch('pic_role') || ''}
                picUserId={formPic || ''}
                memberRole={memberRole}
                setMemberRole={setMemberRole}
                memberDraftId={memberDraftId}
                setMemberDraftId={setMemberDraftId}
                userMeta={userMeta}
                rememberUser={rememberUser}
              />
            )}

            <FormCombobox
              label={t('schedules:calendar.event.shiftLabel')}
              options={shiftOptions}
              value={watch('shift_definition_id') || ''}
              onChange={(v) => setValue('shift_definition_id', v, { shouldValidate: true })}
              placeholder={t('schedules:calendar.event.shiftPlaceholder')}
              error={errors.shift_definition_id?.message}
              required
              disabled={lockShift}
            />


            <RecurrenceFields
              control={control}
              register={register}
              setValue={setValue}
              errors={errors}
              t={t}
              recurrence={formRecurrence}
              recurrenceOptions={recurrenceOptions}
              dateDraft={dateDraft}
              setDateDraft={setDateDraft}
            />

            {/* Stack on phones: two date pickers side by side leave ~150px each
                on a 360px screen, which truncates the dd/mm/yyyy field. */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Controller
                control={control}
                name="start_date"
                render={({ field }) => (
                  <div className="space-y-1">
                    <Label>
                      {t('schedules:calendar.event.startDateLabel')}
                      <span className="ml-1 text-nb-danger">*</span>
                    </Label>
                    <DatePicker
                      value={field.value || undefined}
                      onValueChange={(v) => field.onChange(v ?? '')}
                      error={!!errors.start_date}
                    />
                    {errors.start_date && (
                      <p className="text-nb-body-sm font-medium text-nb-danger" role="alert">
                        {errors.start_date.message}
                      </p>
                    )}
                  </div>
                )}
              />
              <Controller
                control={control}
                name="end_date"
                render={({ field }) => (
                  <div className="space-y-1">
                    <Label>{t('schedules:calendar.event.endDateLabel')}</Label>
                    <DatePicker
                      value={field.value || undefined}
                      onValueChange={(v) => field.onChange(v ?? '')}
                      error={!!errors.end_date}
                    />
                    {errors.end_date ? (
                      <p className="text-nb-body-sm font-medium text-nb-danger" role="alert">
                        {errors.end_date.message}
                      </p>
                    ) : (
                      <p className="text-nb-body-sm text-nb-gray-600">
                        {t('schedules:calendar.event.endDateOptional')}
                      </p>
                    )}
                  </div>
                )}
              />
            </div>

            <FormInput
              label={t('schedules:calendar.event.notesLabel')}
              placeholder={t('schedules:calendar.event.notesPlaceholder')}
              {...register('notes')}
            />
          </form>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('schedules:calendar.event.cancel')}
          </Button>
          <Button
            form="event-form"
            type="submit"
            disabled={isDisabled || isSubmitting}
            loading={isSubmitting}
          >
            {t('schedules:calendar.event.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
