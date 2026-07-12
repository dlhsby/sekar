/**
 * Create Task Page (Phase 2C - rayon, hierarchical assignment)
 * Access: TASK_MANAGER_ROLES
 */

'use client';

import { useAuth } from '@/lib/auth/hooks';
import { useCreateTask, type TaskPriority } from '@/lib/api/tasks';
import { useUsers } from '@/lib/api/users';
import { useLocations } from '@/lib/api/locations';
import { useRayons } from '@/lib/api/rayons';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardHeader,
  CardContent,
  FormInput,
  FormSelect,
  Button,
  Textarea,
  PageHeader,
  Field,
  DateTimePicker,
} from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import {
  TASK_MANAGER_ROLES,
  VALID_TASK_ASSIGNMENTS,
  hasRole,
  ROLE_LABELS,
} from '@/lib/constants/roles';
import type { UserRole } from '@/types/models';

export default function CreateTaskPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation('tasks');

  // State hooks - must be called unconditionally (Rules of Hooks)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('none');
  const [areaId, setAreaId] = useState('none');
  const [rayonId, setRayonId] = useState('none');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');

  // Data fetching hooks - always call (enabled by query client)
  const { data: usersData } = useUsers({ limit: 1000 });
  const { data: areasData } = useLocations({ limit: 1000 });
  const { data: rayonsData } = useRayons();

  const createMutation = useCreateTask();

  // Access control check - NO redirect in useEffect, instead conditionally render below
  const hasAccess = user && hasRole(user.role, TASK_MANAGER_ROLES);

  // Get assignable roles based on current user role
  const assignableRoles = user ? VALID_TASK_ASSIGNMENTS[user.role] || [] : [];

  // Loading state - show spinner while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-nb-primary" />
      </div>
    );
  }

  // Access denied - redirect immediately without rendering form
  if (!hasAccess) {
    router.push('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title) {
      setError(t('newPage.requiredError'));
      return;
    }

    try {
      await createMutation.mutateAsync({
        title,
        description: description || undefined,
        assigned_to: assignedTo !== 'none' ? assignedTo : undefined,
        location_id: areaId !== 'none' ? areaId : undefined,
        rayon_id: rayonId !== 'none' ? rayonId : undefined,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      router.push('/tasks');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // Filter users by assignable roles
  const assignableUsers = (usersData?.data || []).filter((u) =>
    assignableRoles.includes(u.role as UserRole)
  );

  const areas = areasData?.data || [];
  const rayons = rayonsData || [];

  const priorityOptions = [
    { value: 'low', label: t('form.priorityLow') },
    { value: 'normal', label: t('form.priorityNormal') },
    { value: 'high', label: t('form.priorityHigh') },
    { value: 'urgent', label: t('form.priorityUrgent') },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <button
        type="button"
        onClick={() => router.push('/tasks')}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-nb-gray-700 transition-colors hover:text-nb-black"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> {t('newPage.backButton')}
      </button>

      <PageHeader
        description={t('newPage.pageHeader')}
      />
      {assignableRoles.length > 0 && (
        <p className="-mt-2 text-nb-caption text-nb-gray-500">
          {t('newPage.assignableRoles', { roles: assignableRoles.map((r) => ROLE_LABELS[r]).join(', ') })}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-xl font-bold text-nb-black">{t('newPage.cardTitle')}</h2>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-4 bg-nb-danger-light border-2 border-nb-black">
                <p className="text-nb-danger font-semibold">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              <FormInput
                label={t('newPage.formTitleLabel')}
                type="text"
                placeholder={t('newPage.formTitlePlaceholder')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <Textarea
                label={t('newPage.formDescriptionLabel')}
                rows={4}
                placeholder={t('newPage.formDescriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <FormSelect
                label={t('newPage.formAssignedToLabel')}
                value={assignedTo}
                onChange={(value) => setAssignedTo(value)}
                options={[
                  { value: 'none', label: t('newPage.formAssignedToPlaceholder') },
                  ...assignableUsers.map((u) => ({
                    value: u.id,
                    label: `${u.full_name || u.username} (${ROLE_LABELS[u.role] || u.role})`,
                  })),
                ]}
              />

              <FormSelect
                label={t('newPage.formRayonLabel')}
                value={rayonId}
                onChange={(value) => setRayonId(value)}
                options={[
                  { value: 'none', label: t('newPage.formRayonPlaceholder') },
                  ...rayons.map((r) => ({
                    value: r.id,
                    label: r.name,
                  })),
                ]}
              />

              <FormSelect
                label={t('newPage.formAreaLabel')}
                value={areaId}
                onChange={(value) => setAreaId(value)}
                options={[
                  { value: 'none', label: t('newPage.formAreaPlaceholder') },
                  ...areas.map((a) => ({
                    value: a.id,
                    label: `${a.name} (${a.code})`,
                  })),
                ]}
              />

              <FormSelect
                label={t('newPage.formPriorityLabel')}
                value={priority}
                onChange={(value) => setPriority(value as TaskPriority)}
                options={priorityOptions}
              />

              <Field label={t('newPage.formTitleLabel')}>
                {(p) => (
                  <DateTimePicker
                    id={p.id}
                    value={dueDate ? dueDate.replace('T', ' ') : undefined}
                    onValueChange={(v) => setDueDate(v ? v.replace(' ', 'T') : '')}
                  />
                )}
              </Field>
            </div>

            <div className="flex gap-3 mt-6">
              <Button type="submit" loading={createMutation.isPending}>
                {t('newPage.submitButton')}
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.push('/tasks')}>
                {t('newPage.cancelButton')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
