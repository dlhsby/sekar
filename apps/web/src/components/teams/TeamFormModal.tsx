'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  FormInput,
  FormSelect,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/api/client';
import {
  useCreateTeam,
  useUpdateTeam,
  useTeamTypes,
  type Team,
} from '@/lib/api/teams';
import { MarkerImagePicker } from '@/components/forms/MarkerImagePicker';
import { entityMarkerDefault } from '@/lib/constants/markerDefaults';

interface TeamFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team?: Team | null;
  onSuccess?: () => void;
}

/** Create / edit a team (crew). Membership is set on team schedules (Phase 4). */
export function TeamFormModal({ open, onOpenChange, team, onSuccess }: TeamFormModalProps) {
  const { t } = useTranslation();
  const isEdit = !!team;
  const { data: types = [] } = useTeamTypes();
  const createMutation = useCreateTeam();
  const updateMutation = useUpdateTeam();

  const [name, setName] = useState('');
  const [typeId, setTypeId] = useState('');
  const [markerImageUrl, setMarkerImageUrl] = useState<string | null>(null);

  // Reset the form whenever the modal opens for a different team.
  useEffect(() => {
    if (!open) return;
    setName(team?.name ?? '');
    setTypeId(team?.team_type_id ?? '');
    setMarkerImageUrl(team?.marker_image_url ?? null);
  }, [open, team]);

  const isPending = createMutation.isPending || updateMutation.isPending;
  const canSave = name.trim().length >= 2 && !!typeId;

  const handleSave = async () => {
    const payload = {
      name: name.trim(),
      team_type_id: typeId,
      marker_icon: team?.marker_icon ?? null,
      marker_image_url: markerImageUrl,
    };
    try {
      if (isEdit && team) await updateMutation.mutateAsync({ id: team.id, data: payload });
      else await createMutation.mutateAsync(payload);
    } catch (err) {
      toast.error(getErrorMessage(err));
      return;
    }
    toast.success(
      isEdit
        ? t('admin:teams.successUpdated', { name: payload.name })
        : t('admin:teams.successCreated', { name: payload.name }),
    );
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="default">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('admin:teams.actionEdit') : t('admin:teams.buttonAdd')}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <FormInput
            label={t('admin:teams.form.name')}
            placeholder={t('admin:teams.form.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <FormSelect
            label={t('admin:teams.form.type')}
            options={types.map((tt) => ({ value: tt.id, label: tt.name }))}
            value={typeId}
            onChange={setTypeId}
            placeholder={t('admin:teams.form.typePlaceholder')}
          />
          <MarkerImagePicker
            value={markerImageUrl}
            onChange={setMarkerImageUrl}
            defaultUrl={entityMarkerDefault('team')}
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button onClick={handleSave} loading={isPending} disabled={!canSave}>
            {t('common:actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
