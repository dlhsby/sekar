'use client';

import { useTranslation } from 'react-i18next';
import { useEffect, useState, useId } from 'react';
import {
  DateTimePicker,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FormInput,
  FormSelect,
  Textarea,
} from '@/components/ui';
import { FormActions } from '@/components/forms/FormActions';
import { useAuth } from '@/lib/auth/hooks';
import { useCreateTask, type TaskPriority } from '@/lib/api/tasks';
import { useUsers } from '@/lib/api/users';
import { useAreas } from '@/lib/api/areas';
import { useRayons } from '@/lib/api/rayons';
import { getErrorMessage } from '@/lib/api/client';
import { VALID_TASK_ASSIGNMENTS, ROLE_LABELS } from '@/lib/constants/roles';
import type { UserRole } from '@/types/models';

interface TaskFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}



/**
 * Create a task in a full-screen modal (replaces the standalone /tasks/new
 * page). Full-screen because the form is long (assignment + scope + schedule).
 */
export function TaskFormModal({ open, onOpenChange, onSuccess }: TaskFormModalProps) {
  const { t } = useTranslation();
  const formId = useId();
  const { user } = useAuth();
  const createMutation = useCreateTask();
  const { data: usersData } = useUsers({ limit: 1000 });
  const { data: areasData } = useAreas({ limit: 1000 });
  const { data: rayonsData } = useRayons();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('none');
  const [areaId, setAreaId] = useState('none');
  const [rayonId, setRayonId] = useState('none');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');

  // Reset the form each time the modal opens (create-only).
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle('');
    setDescription('');
    setAssignedTo('none');
    setAreaId('none');
    setRayonId('none');
    setPriority('normal');
    setDueDate('');
    setError('');
  }, [open]);

  const assignableRoles = user ? VALID_TASK_ASSIGNMENTS[user.role] || [] : [];
  const PRIORITY_OPTIONS = [
    { value: 'low', label: t('tasks:form.priorityLow') },
    { value: 'normal', label: t('tasks:form.priorityNormal') },
    { value: 'high', label: t('tasks:form.priorityHigh') },
    { value: 'urgent', label: t('tasks:form.priorityUrgent') },
  ];
  const assignableUsers = (usersData?.data || []).filter((u) =>
    assignableRoles.includes(u.role as UserRole)
  );
  const areas = areasData?.data || [];
  const rayons = rayonsData || [];

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    if (!title) {
      setError(t('tasks:form.requiredError'));
      return;
    }
    try {
      await createMutation.mutateAsync({
        title,
        description: description || undefined,
        assigned_to: assignedTo !== 'none' ? assignedTo : undefined,
        area_id: areaId !== 'none' ? areaId : undefined,
        rayon_id: rayonId !== 'none' ? rayonId : undefined,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>{t('tasks:modal.title')}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form id={formId} onSubmit={handleSubmit}>
            <div className="mx-auto max-w-3xl space-y-6">
              {assignableRoles.length > 0 ? (
                <p className="text-nb-caption text-nb-gray-500">
                  {t("tasks:form.assignableRoles", { roles: assignableRoles.map((r) => ROLE_LABELS[r]).join(', ') })}
                </p>
              ) : null}
              {error ? (
                <div className="border-2 border-nb-danger bg-nb-danger-light p-4">
                  <p className="font-semibold text-nb-danger">{error}</p>
                </div>
              ) : null}

              <FormInput
                label={t("tasks:form.titleLabel")}
                placeholder={t("tasks:form.titlePlaceholder")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <Textarea
                label={t("tasks:form.descriptionLabel")}
                rows={4}
                placeholder={t("tasks:form.descriptionPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <FormSelect
                label={t("tasks:form.assignedToLabel")}
                value={assignedTo}
                onChange={setAssignedTo}
                options={[
                  { value: 'none', label: t('tasks:form.assignedToPlaceholder') },
                  ...assignableUsers.map((u) => ({
                    value: u.id,
                    label: `${u.full_name || u.username} (${ROLE_LABELS[u.role] || u.role})`,
                  })),
                ]}
              />
              <FormSelect
                label={t("tasks:form.rayonLabel")}
                value={rayonId}
                onChange={setRayonId}
                options={[
                  { value: 'none', label: t('tasks:form.rayonPlaceholder') },
                  ...rayons.map((r) => ({ value: r.id, label: r.name })),
                ]}
              />
              <FormSelect
                label={t("tasks:form.areaLabel")}
                value={areaId}
                onChange={setAreaId}
                options={[
                  { value: 'none', label: t('tasks:form.areaPlaceholder') },
                  ...areas.map((a) => ({
                    value: a.id,
                    label: a.areaType?.name ? `${a.name} (${a.areaType.name})` : a.name,
                  })),
                ]}
              />
              <FormSelect
                label={t("tasks:form.priorityLabel")}
                value={priority}
                onChange={(v) => setPriority(v as TaskPriority)}
                options={PRIORITY_OPTIONS}
              />
              <Field label={t("tasks:form.dueDateLabel")}>
                {(p) => (
                  <DateTimePicker
                    id={p.id}
                    value={dueDate ? dueDate.replace('T', ' ') : undefined}
                    onValueChange={(v) => setDueDate(v ? v.replace(' ', 'T') : '')}
                  />
                )}
              </Field>
            </div>
          </form>
        </DialogBody>
        <DialogFooter>
          <FormActions
            formId={formId}
            submitLabel={t('tasks:modal.submitButton')}
            loading={createMutation.isPending}
            onCancel={() => onOpenChange(false)}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
