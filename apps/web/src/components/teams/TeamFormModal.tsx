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
  Input,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/api/client';
import {
  useCreateTeam,
  useUpdateTeam,
  useTeamTypes,
  type Team,
} from '@/lib/api/teams';
import { MarkerImagePicker } from '@/components/forms/MarkerImagePicker';

// eslint-disable-next-line sekar-design/no-inline-hex-colors -- color-input default value
const DEFAULT_MARKER = '#7FBC8C';
const HEX = /^#[0-9a-fA-F]{6}$/;

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
  const [markerColor, setMarkerColor] = useState('');

  // Reset the form whenever the modal opens for a different team.
  useEffect(() => {
    if (!open) return;
    setName(team?.name ?? '');
    setTypeId(team?.team_type_id ?? '');
    setMarkerImageUrl(team?.marker_image_url ?? null);
    setMarkerColor(team?.marker_color ?? '');
  }, [open, team]);

  const isPending = createMutation.isPending || updateMutation.isPending;
  const canSave = name.trim().length >= 2 && !!typeId && (!markerColor || HEX.test(markerColor));

  const handleSave = async () => {
    const payload = {
      name: name.trim(),
      team_type_id: typeId,
      marker_icon: team?.marker_icon ?? null,
      marker_color: markerColor.trim() || null,
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

  const swatch = HEX.test(markerColor) ? markerColor : DEFAULT_MARKER;

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
          <MarkerImagePicker value={markerImageUrl} onChange={setMarkerImageUrl} />
          <div className="space-y-1.5">
            <label className="block text-nb-body-sm font-semibold text-nb-black">
              {t('admin:teams.form.markerColor')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label={t('admin:teams.form.markerColor')}
                value={swatch}
                onChange={(e) => setMarkerColor(e.target.value)}
                className="h-11 w-14 shrink-0 cursor-pointer rounded-nb-base border-2 border-nb-black bg-nb-white shadow-nb-sm"
              />
              <Input
                value={markerColor}
                placeholder={DEFAULT_MARKER}
                onChange={(e) => setMarkerColor(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
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
