/**
 * Task Detail Page (Phase 2C - 8 statuses, verification workflow)
 * Access: TASK_MANAGER_ROLES
 */

'use client';

import { useTranslation } from 'react-i18next';
import { intlLocale } from '@/lib/i18n/date-locale';
import { useAuth } from '@/lib/auth/hooks';
import {
  useTask,
  useUntagTask,
  useVerifyTask,
  useRequestRevision,
  useTaskDelegations,
  useAssignTask,
} from '@/lib/api/tasks';
import { useUsers } from '@/lib/api/users';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  FormInput,
  FormSelect,
  StatusPill,
} from '@/components/ui';
import { useRouter } from 'next/navigation';
import { use, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, RotateCcw, Send, X } from 'lucide-react';
import { TASK_MANAGER_ROLES, TASK_VERIFIER_ROLES, hasRole } from '@/lib/constants/roles';
import {
  getTaskStatusLabel,
  getTaskPriorityLabel,
  TASK_STATUS_TONES,
  TASK_PRIORITY_TONES,
} from '@/lib/constants/tasks';
import type { UserRole } from '@/types/models';

// ADR-038: which roles a delegator may hand a task to. Mirrors the backend
// VALID_TASK_ASSIGNMENTS map in be/src/modules/users/constants/role-groups.ts.
const DELEGATION_TARGETS: Record<string, UserRole[]> = {
  top_management: ['kepala_rayon', 'korlap'],
  kepala_rayon: ['korlap'],
  korlap: ['satgas', 'linmas'],
  admin_system: ['kepala_rayon', 'korlap'],
  superadmin: ['kepala_rayon', 'korlap'],
};

interface TaskDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [revisionReason, setRevisionReason] = useState('');
  const [showRevisionForm, setShowRevisionForm] = useState(false);

  const { id: taskId } = use(params);

  const verifyMutation = useVerifyTask();
  const revisionMutation = useRequestRevision();
  const untagMutation = useUntagTask();
  const assignMutation = useAssignTask();
  const [delegateUserId, setDelegateUserId] = useState('');
  const [showDelegateForm, setShowDelegateForm] = useState(false);

  useEffect(() => {
    if (!authLoading && user && !hasRole(user.role, TASK_MANAGER_ROLES)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const { data: task, isLoading } = useTask(taskId);
  // ADR-038: assignment chain. Best-effort — failure leaves the card hidden.
  const { data: delegations = [] } = useTaskDelegations(taskId);
  // Pull a wide user pool when the delegate form is open; filter client-side
  // by role + rayon to surface only valid hand-off targets.
  const { data: usersResp } = useUsers({ limit: 200 });
  const delegateCandidates = useMemo(() => {
    if (!user || !task || !task.assigned_to) return [];
    const allowedRoles = DELEGATION_TARGETS[user.role] ?? [];
    if (allowedRoles.length === 0) return [];
    const all = usersResp?.data ?? [];
    return all.filter(
      (u) =>
        allowedRoles.includes(u.role) &&
        u.id !== user.id &&
        (!task.rayon?.id || !u.rayon_id || u.rayon_id === task.rayon.id),
    );
  }, [user, task, usersResp]);

  if (authLoading || !user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-nb-primary mx-auto mb-4"></div>
          <p className="text-nb-gray-600">{t("tasks:detail.loading")}</p>
        </div>
      </div>
    );
  }

  if (!hasRole(user.role, TASK_MANAGER_ROLES)) return null;

  if (!task) {
    return (
      <div className="py-12 text-center">
        <p className="font-semibold text-nb-gray-600">{t('tasks:detail.taskNotFound')}</p>
      </div>
    );
  }

  const canVerify = hasRole(user.role, TASK_VERIFIER_ROLES) && task.status === 'completed';

  // ADR-038: only the current assignee may delegate, and only while the task
  // is still in "assigned" (not yet accepted). After acceptance a decline is
  // required to reroute.
  const canDelegate =
    task.status === 'assigned' &&
    !!task.assigned_to &&
    task.assigned_to.id === user.id &&
    !!DELEGATION_TARGETS[user.role];

  const handleVerify = async () => {
    await verifyMutation.mutateAsync(taskId);
  };

  const handleRevision = async () => {
    if (!revisionReason.trim()) return;
    await revisionMutation.mutateAsync({ taskId, reason: revisionReason });
    setShowRevisionForm(false);
    setRevisionReason('');
  };

  const handleUntag = async (userId: string) => {
    await untagMutation.mutateAsync({ taskId, userId });
  };

  const handleDelegate = async () => {
    if (!delegateUserId) return;
    await assignMutation.mutateAsync({ taskId, assignedTo: delegateUserId });
    setShowDelegateForm(false);
    setDelegateUserId('');
  };

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => router.push('/tasks')}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-nb-gray-700 transition-colors hover:text-nb-black"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> {t("tasks:detail.backButton")}
      </button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-nb-h2 text-nb-black">{task.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusPill tone={TASK_STATUS_TONES[task.status]} dot>
              {getTaskStatusLabel(task.status, t)}
            </StatusPill>
            <StatusPill tone={TASK_PRIORITY_TONES[task.priority]}>
              {getTaskPriorityLabel(task.priority, t)}
            </StatusPill>
          </div>
        </div>
        {canVerify && (
          <div className="flex gap-2">
            <Button
              variant="success"
              onClick={handleVerify}
              loading={verifyMutation.isPending}
              leftIcon={<Check className="w-4 h-4" />}
            >
              {t('tasks:detail.verifyButton')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowRevisionForm(true)}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              {t('tasks:detail.requestRevisionButton')}
            </Button>
          </div>
        )}
      </div>

      {/* Revision Form */}
      {showRevisionForm && (
        <Card variant="elevated">
          <CardContent>
            <div className="space-y-3">
              <h3 className="font-bold text-nb-black">{t('tasks:detail.revisionFormTitle')}</h3>
              <FormInput
                label={t("tasks:detail.revisionFormLabel")}
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                placeholder={t("tasks:detail.revisionFormPlaceholder")}
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRevision}
                  disabled={!revisionReason.trim() || revisionMutation.isPending}
                  loading={revisionMutation.isPending}
                >
                  {t('tasks:detail.revisionFormSubmit')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowRevisionForm(false);
                    setRevisionReason('');
                  }}
                >
                  {t('tasks:detail.revisionFormCancel')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Info */}
        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-xl font-bold text-nb-black">{t('tasks:sections.taskInfo')}</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {task.description && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">{t('tasks:fields.description')}</div>
                  <div className="text-nb-gray-700">{task.description}</div>
                </div>
              )}
              {task.due_date && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">{t('tasks:fields.dueDate')}</div>
                  <div className="font-bold text-nb-black">
                    {new Date(task.due_date).toLocaleDateString(intlLocale())}
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm font-semibold text-nb-gray-600">{t('tasks:fields.created')}</div>
                <div className="font-bold text-nb-black">
                  {new Date(task.created_at).toLocaleString(intlLocale())}
                </div>
              </div>
              {task.activity_type && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">{t('tasks:fields.activityType')}</div>
                  <div className="font-bold text-nb-black">{task.activity_type.name}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Assignment Info */}
        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-xl font-bold text-nb-black">{t('tasks:sections.assignment')}</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {task.creator && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">{t('tasks:fields.creator')}</div>
                  <div className="font-bold text-nb-black">{task.creator.full_name}</div>
                </div>
              )}
              {task.assigned_to && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">{t('tasks:fields.assignedTo')}</div>
                  <div className="font-bold text-nb-black">{task.assigned_to.full_name}</div>
                </div>
              )}
              {task.assigned_by && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">{t('tasks:fields.assignedBy')}</div>
                  <div className="font-bold text-nb-black">{task.assigned_by.full_name}</div>
                </div>
              )}
              {task.assigned_at && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">{t('tasks:fields.assignedDate')}</div>
                  <div className="text-nb-black">
                    {new Date(task.assigned_at).toLocaleString(intlLocale())}
                  </div>
                </div>
              )}
              {task.area && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">{t('tasks:fields.area')}</div>
                  <div className="font-bold text-nb-black">{task.area.name}</div>
                </div>
              )}
              {task.rayon && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">{t('tasks:fields.rayon')}</div>
                  <div className="font-bold text-nb-black">{task.rayon.name}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tagged Users */}
      {task.tags && task.tags.length > 0 && (
        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-xl font-bold text-nb-black">{t('tasks:detail.taggedTitle', { count: task.tags.length })}</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {task.tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-3 border-2 border-nb-black bg-white"
                >
                  <div className="font-semibold text-nb-black">
                    {tag.user?.full_name || tag.user_id}
                  </div>
                  {task.created_by === user.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUntag(tag.user_id)}
                      disabled={untagMutation.isPending}
                      leftIcon={<X className="w-3 h-3" />}
                    >
                      {t('tasks:detail.removeTagButton')}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Decline Info */}
      {task.status === 'declined' && task.decline_reason && (
        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-xl font-bold text-nb-black">{t('tasks:sections.decline')}</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-nb-gray-600">{t('tasks:fields.declineReason')}</div>
                <div className="text-nb-gray-700">{task.decline_reason}</div>
              </div>
              {task.declined_at && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">{t('tasks:fields.declineDate')}</div>
                  <div className="text-nb-black">
                    {new Date(task.declined_at).toLocaleString(intlLocale())}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completion Info */}
      {(task.status === 'completed' || task.status === 'verified') && (
        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-xl font-bold text-nb-black">{t('tasks:sections.completion')}</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {task.completion_notes && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">{t('tasks:fields.completionNotes')}</div>
                  <div className="text-nb-gray-700">{task.completion_notes}</div>
                </div>
              )}
              {task.completed_at && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">{t('tasks:fields.completionDate')}</div>
                  <div className="text-nb-black">
                    {new Date(task.completed_at).toLocaleString(intlLocale())}
                  </div>
                </div>
              )}
              {task.completion_photo_urls && task.completion_photo_urls.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600 mb-2">
                    {t('tasks:detail.photosLabel', { count: task.completion_photo_urls.length })}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {task.completion_photo_urls.map((url, index) => (
                      <div
                        key={index}
                        className="bg-nb-gray-100 border-2 border-nb-black overflow-hidden"
                      >
                        <img
                          src={url}
                          alt={t('tasks:detail.completionPhotoAlt', { index: index + 1 })}
                          className="w-full h-auto"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verification Info */}
      {task.status === 'verified' && (
        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-xl font-bold text-nb-black">{t('tasks:sections.verification')}</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {task.verifier && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">{t('tasks:detail.verifiedBy')}</div>
                  <div className="font-bold text-nb-black">{task.verifier.full_name}</div>
                </div>
              )}
              {task.verified_at && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">{t('tasks:detail.verificationDate')}</div>
                  <div className="text-nb-black">
                    {new Date(task.verified_at).toLocaleString(intlLocale())}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delegation chain (ADR-038) */}
      {delegations.length > 0 && (
        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-xl font-bold text-nb-black">{t('tasks:sections.delegationHistory')}</h2>
            <p className="text-sm text-nb-gray-600 mt-1">
              {t('tasks:detail.delegationHistoryDescription')}
            </p>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {delegations.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-l-4 border-nb-primary pl-3 py-1"
                >
                  <div className="text-sm">
                    {d.from_user
                      ? `${d.from_user.full_name} (${d.from_user.role})`
                      : 'Sistem'}
                    <span className="mx-2 text-nb-gray-400">→</span>
                    {d.to_user.full_name} ({d.to_user.role})
                  </div>
                  <div className="text-xs text-nb-gray-600">
                    {new Date(d.created_at).toLocaleString(intlLocale())}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Disposisi (delegation) — ADR-038 */}
      {canDelegate && (
        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-xl font-bold text-nb-black">{t('tasks:sections.disposition')}</h2>
            <p className="text-sm text-nb-gray-600 mt-1">
              {t('tasks:detail.dispositionDescription')}
            </p>
          </CardHeader>
          <CardContent>
            {!showDelegateForm ? (
              <Button
                variant="default"
                onClick={() => setShowDelegateForm(true)}
                leftIcon={<Send className="w-4 h-4" />}
              >
                {t('tasks:detail.delegateButton')}
              </Button>
            ) : (
              <div className="space-y-3">
                <FormSelect
                  label={t('tasks:detail.delegateRecipientLabel')}
                  value={delegateUserId}
                  onChange={setDelegateUserId}
                  options={[
                    { value: '', label: t('tasks:detail.delegateRecipientPlaceholder') },
                    ...delegateCandidates.map((u) => ({
                      value: u.id,
                      label: `${u.full_name} (${u.role})`,
                    })),
                  ]}
                />
                {delegateCandidates.length === 0 && (
                  <p className="text-sm text-nb-danger">
                    {t('tasks:detail.delegateNoSubordinates')}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleDelegate}
                    disabled={!delegateUserId || assignMutation.isPending}
                    loading={assignMutation.isPending}
                  >
                    {t('tasks:detail.delegateSubmitButton')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowDelegateForm(false);
                      setDelegateUserId('');
                    }}
                  >
                    {t('tasks:detail.delegateCancelButton')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Revision Info */}
      {task.status === 'revision_needed' && task.revision_reason && (
        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-xl font-bold text-nb-black">{t('tasks:sections.revisionRequest')}</h2>
          </CardHeader>
          <CardContent>
            <div>
              <div className="text-sm font-semibold text-nb-gray-600">{t('tasks:fields.declineReason')}</div>
              <div className="text-nb-gray-700">{task.revision_reason}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
