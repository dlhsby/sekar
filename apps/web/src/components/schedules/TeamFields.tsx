'use client';

import { Controller, type Control, type UseFormSetValue, type FieldErrors } from 'react-hook-form';
import type { FormValues } from '@/components/schedules/ScheduleEventModal';
import type { TFunction } from 'i18next';
import { Plus, X } from 'lucide-react';
import { AsyncUserCombobox, type PickedUser } from '@/components/forms/AsyncUserCombobox';
import { Button, FormCombobox, FormSelect } from '@/components/ui';
import type { ScheduleEvent } from '@/lib/api/schedule-events';

/**
 * The team half of the Buat Jadwal form: category, PIC (role → worker), and the
 * member list (role → worker → Tambah).
 *
 * Split out of ScheduleEventModal, which had grown past the 800-line ceiling in
 * CLAUDE.md. This is the natural seam — a self-contained sub-form with its own
 * draft state that the individual path never touches.
 *
 * Everything here is server-paged: no roster (~3000 workers) is ever preloaded,
 * and each picker stays disabled (and therefore un-fetched) until a role narrows
 * it. `userMeta` holds names only for users this form has actually touched.
 */
export interface TeamFieldsProps {
  control: Control<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  errors: FieldErrors<FormValues>;
  t: TFunction;
  isEditing: boolean;
  event?: ScheduleEvent | null;
  teamCategoryOptions: Array<{ value: string; label: string }>;
  schedulableRoles: readonly string[];
  teamCategoryId: string;
  picRole: string;
  picUserId: string;
  memberRole: string;
  setMemberRole: (v: string) => void;
  memberDraftId: string;
  setMemberDraftId: (v: string) => void;
  userMeta: Record<string, PickedUser>;
  rememberUser: (u: PickedUser) => void;
}

export function TeamFields({
  control,
  setValue,
  errors,
  t,
  isEditing,
  event,
  teamCategoryOptions,
  schedulableRoles: SCHEDULABLE_ROLES,
  teamCategoryId,
  picRole,
  picUserId: formPic,
  memberRole,
  setMemberRole,
  memberDraftId,
  setMemberDraftId,
  userMeta,
  rememberUser,
}: TeamFieldsProps) {
  return (
    <>

            <FormCombobox
              label={t('schedules:calendar.event.teamCategoryLabel')}
              options={teamCategoryOptions}
              value={teamCategoryId}
              onChange={(v) => setValue('team_category_id', v, { shouldValidate: true })}
              placeholder={t('schedules:calendar.event.teamCategoryPlaceholder')}
              error={errors.team_category_id?.message}
              required
              disabled={isEditing}
            />

            {/* PIC picked the same way as an individual: role first, then the
                worker — one decision, one row. */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormSelect
                label={t('schedules:calendar.event.picRoleLabel')}
                options={SCHEDULABLE_ROLES.map((r) => ({ value: r, label: t(`roles:${r}`, r) }))}
                value={picRole}
                placeholder={t('schedules:calendar.event.rolePlaceholder')}
                onChange={(v) => {
                  setValue('pic_role', v, { shouldValidate: true });
                  setValue('pic_user_id', '', { shouldValidate: true });
                }}
                error={errors.pic_role?.message}
                required
              />
              <AsyncUserCombobox
                label={t('schedules:calendar.event.picLabel')}
                required
                roles={picRole ? [picRole] : undefined}
                value={formPic || ''}
                onValueChange={(v, u) => {
                  setValue('pic_user_id', v, { shouldValidate: true });
                  if (u) rememberUser(u);
                }}
                initialLabel={event?.pic_user?.full_name}
                placeholder={t('schedules:calendar.event.picPlaceholder')}
                error={errors.pic_user_id?.message}
                disabled={!picRole}
              />
            </div>

            {/* Members: pick a role, pick a worker, add. The old control was a
                checkbox list of every schedulable user — fine at 20, unusable
                at 3000, and it preloaded them all just to render. Adding one at
                a time keeps the roster server-paged and mirrors how the PIC and
                an individual are picked. */}
            <Controller
              control={control}
              name="member_ids"
              render={({ field }) => {
                const add = () => {
                  if (!memberDraftId || field.value.includes(memberDraftId)) return;
                  field.onChange([...field.value, memberDraftId]);
                  setMemberDraftId('');
                };
                return (
                  <div className="space-y-2">
                    <p className="text-nb-body-sm font-medium">
                      {t('schedules:calendar.event.memberLabel')}
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                      <FormSelect
                        label={t('schedules:calendar.event.roleLabel')}
                        options={SCHEDULABLE_ROLES.map((r) => ({
                          value: r,
                          label: t(`roles:${r}`, r),
                        }))}
                        value={memberRole}
                        placeholder={t('schedules:calendar.event.rolePlaceholder')}
                        onChange={(v) => {
                          setMemberRole(v);
                          setMemberDraftId('');
                        }}
                      />
                      <AsyncUserCombobox
                        label={t('schedules:calendar.event.workerLabel')}
                        roles={memberRole ? [memberRole] : undefined}
                        excludeIds={[...field.value, ...(formPic ? [formPic] : [])]}
                        value={memberDraftId}
                        onValueChange={(v, u) => {
                          setMemberDraftId(v);
                          if (u) rememberUser(u);
                        }}
                        placeholder={t('schedules:calendar.event.workerPlaceholder')}
                        disabled={!memberRole}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={add}
                        disabled={!memberDraftId}
                        leftIcon={<Plus className="size-4" />}
                      >
                        {t('common:actions.add')}
                      </Button>
                    </div>

                    {field.value.length === 0 ? (
                      <p className="rounded-nb-base border-2 border-dashed border-nb-black bg-nb-gray-50 py-3 text-center text-nb-body-sm text-nb-gray-500">
                        {t('schedules:calendar.event.memberEmpty')}
                      </p>
                    ) : (
                      <ul className="divide-y-2 divide-nb-black overflow-hidden rounded-nb-base border-2 border-nb-black">
                        {field.value.map((id) => {
                          const meta = userMeta[id];
                          return (
                            <li
                              key={id}
                              className="flex items-center gap-2 bg-nb-white px-3 py-2 text-nb-body-sm"
                            >
                              <span className="truncate font-medium">
                                {meta?.full_name ?? id}
                              </span>
                              {meta?.role && (
                                <span className="shrink-0 rounded-full border-2 border-nb-black bg-nb-gray-100 px-2 text-nb-caption font-bold">
                                  {t(`roles:${meta.role}`, meta.role)}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  field.onChange(field.value.filter((m) => m !== id))
                                }
                                aria-label={t('common:actions.delete')}
                                className="ml-auto grid size-7 shrink-0 place-items-center rounded-nb-base border-2 border-nb-black bg-nb-white text-nb-danger hover:bg-nb-danger-light"
                              >
                                <X className="size-3.5" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              }}
            />
    </>
  );
}
