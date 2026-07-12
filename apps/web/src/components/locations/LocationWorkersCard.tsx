'use client';

/**
 * LocationWorkersCard — per-area worker roster + assign/remove (ADR-013).
 *
 * Shows the workers assigned to an area (GET /areas/:id/users) and lets
 * managers add a permanent assignment (POST /users/:id/areas) or remove one
 * (DELETE /users/:id/areas/:areaId). Full shift scheduling stays in /schedules;
 * a link is offered for that. Reassignment between areas lives on /monitoring.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, UserPlus, Users } from 'lucide-react';
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogFooter,
  FormSelect,
  EmptyState,
} from '@/components/ui';
import { useUsers } from '@/lib/api/users';
import { useAreaUsers, useAssignLocations, useRemoveAssignment } from '@/lib/api/user-locations';
import { getErrorMessage } from '@/lib/api/client';
import { ROLE_LABELS, ROLE_BADGE_VARIANTS, SCHEDULABLE_WORKER_ROLES } from '@/lib/constants/roles';

interface LocationWorkersCardProps {
  areaId: string;
  /** When false, the roster is read-only (no assign/remove actions). */
  canManage: boolean;
}

export function LocationWorkersCard({ areaId, canManage }: LocationWorkersCardProps) {
  const { t } = useTranslation();
  const { data: workers, isLoading } = useAreaUsers(areaId);
  const { data: usersData } = useUsers({ limit: 1000 });
  const assignMutation = useAssignLocations();
  const removeMutation = useRemoveAssignment();

  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('none');

  const assignedIds = useMemo(() => new Set((workers ?? []).map((w) => w.id)), [workers]);

  // Schedulable workers not already assigned to this area.
  const candidates = useMemo(
    () =>
      (usersData?.data ?? []).filter(
        (u) => SCHEDULABLE_WORKER_ROLES.includes(u.role) && !assignedIds.has(u.id),
      ),
    [usersData, assignedIds],
  );

  const handleAssign = async () => {
    if (selectedUserId === 'none') return;
    try {
      await assignMutation.mutateAsync({ userId: selectedUserId, areaIds: [areaId] });
      toast.success(t('admin:areas.assignAction'));
      setAssignOpen(false);
      setSelectedUserId('none');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleRemove = async (userId: string, name: string) => {
    try {
      await removeMutation.mutateAsync({ userId, areaId });
      toast.success(`${name} ${t('admin:shared.delete').toLowerCase()}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Card variant="elevated">
      <CardHeader className="bg-nb-gray-100">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Users className="size-5" />
            {t('admin:areas.workersTitle')}
          </h2>
          {canManage && (
            <div className="flex gap-2">
              <Link href={`/schedules/new`}>
                <Button variant="ghost" size="sm" leftIcon={<Plus className="size-4" />}>
                  {t('admin:areas.createSchedule')}
                </Button>
              </Link>
              <Button
                size="sm"
                leftIcon={<UserPlus className="size-4" />}
                onClick={() => setAssignOpen(true)}
              >
                {t('admin:areas.assignWorker')}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="h-24 animate-pulse rounded-nb-base border-2 border-nb-black bg-nb-gray-200" />
        ) : !workers || workers.length === 0 ? (
          <EmptyState
            variant="noData"
            title={t('admin:areas.noWorkersTitle')}
            description={
              canManage
                ? t('admin:areas.noWorkersManageDescription')
                : t('admin:areas.noWorkersDescription')
            }
          />
        ) : (
          <ul className="divide-y-2 divide-nb-gray-200">
            {workers.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-nb-black">{w.full_name}</div>
                  <div className="font-mono text-[11px] text-nb-gray-600">{w.username}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={ROLE_BADGE_VARIANTS[w.role]}>{ROLE_LABELS[w.role]}</Badge>
                  {canManage && (
                    <Button
                      variant="destructive"
                      size="sm"
                      aria-label={t('admin:areas.removeWorkerAriaLabel', { name: w.full_name })}
                      loading={removeMutation.isPending && removeMutation.variables?.userId === w.id}
                      onClick={() => handleRemove(w.id, w.full_name)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {/* Assign dialog */}
      <Dialog
        open={assignOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAssignOpen(false);
            setSelectedUserId('none');
          }
        }}
      >
        <DialogContent className="sm:max-w-md" aria-labelledby="assign-worker-title">
          <DialogHeader>
            <DialogTitle id="assign-worker-title">{t('admin:areas.assignWorkerTitle')}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <FormSelect
              label={t('admin:areas.workerLabel')}
              value={selectedUserId}
              onChange={(value) => setSelectedUserId(value as string)}
              options={[
                { value: 'none', label: t('admin:areas.selectWorkerPlaceholder') },
                ...candidates.map((u) => ({
                  value: u.id,
                  label: `${u.full_name} (${u.username}) · ${ROLE_LABELS[u.role]}`,
                })),
              ]}
              helperText={
                <span className="text-nb-gray-600">
                  {t('admin:areas.assignWorkerHelper')}
                </span>
              }
            />
          </DialogBody>
          <DialogFooter className="flex gap-3 sm:gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setAssignOpen(false);
                setSelectedUserId('none');
              }}
            >
              {t('admin:shared.cancel')}
            </Button>
            <Button
              onClick={handleAssign}
              disabled={selectedUserId === 'none'}
              loading={assignMutation.isPending}
            >
              {t('admin:areas.assignAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
