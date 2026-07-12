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
} from '@/components/ui';
import { getErrorMessage } from '@/lib/api/client';
import {
  useCreateTeamType,
  useUpdateTeamType,
  type TeamType,
} from '@/lib/api/teams';
import { MarkerImagePicker } from '@/components/forms/MarkerImagePicker';
import { ColorField } from '@/components/forms/ColorField';
import { entityMarkerDefault } from '@/lib/constants/markerDefaults';

interface TeamTypeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamType?: TeamType | null;
  onSuccess?: () => void;
}

/** Create / edit a team type. Team types are the catalog of crew types (phase 4). */
export function TeamTypeFormModal({ open, onOpenChange, teamType, onSuccess }: TeamTypeFormModalProps) {
  const { t } = useTranslation();
  const isEdit = !!teamType;
  const createMutation = useCreateTeamType();
  const updateMutation = useUpdateTeamType();

  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [markerImageUrl, setMarkerImageUrl] = useState<string | null>(null);
  const [markerColor, setMarkerColor] = useState<string | null>(null);

  // Revert the form to the loaded team type's values (also runs on open).
  const revert = () => {
    setName(teamType?.name ?? '');
    setIsActive(teamType?.is_active ?? true);
    setMarkerImageUrl(teamType?.marker_image_url ?? null);
    setMarkerColor(teamType?.marker_color ?? null);
  };

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState in effect is intentional for form reset
    revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revert is stable and captures (open, teamType); standard controlled-form reset
  }, [open, teamType]);

  const isPending = createMutation.isPending || updateMutation.isPending;
  const canSave = name.trim().length >= 1;
  const isDirty =
    name !== (teamType?.name ?? '') ||
    isActive !== (teamType?.is_active ?? true) ||
    (markerImageUrl ?? null) !== (teamType?.marker_image_url ?? null) ||
    (markerColor ?? null) !== (teamType?.marker_color ?? null);

  const handleSave = async () => {
    const payload = {
      name: name.trim(),
      is_active: isActive,
      marker_image_url: markerImageUrl,
      marker_color: markerColor,
    };
    try {
      if (isEdit && teamType) await updateMutation.mutateAsync({ id: teamType.id, data: payload });
      else await createMutation.mutateAsync(payload);
    } catch (err) {
      toast.error(getErrorMessage(err));
      return;
    }
    toast.success(
      isEdit
        ? t('admin:teamTypes.successUpdated', { name: payload.name })
        : t('admin:teamTypes.successCreated', { name: payload.name }),
    );
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="default">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('admin:teamTypes.actionEdit') : t('admin:teamTypes.buttonAdd')}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <FormInput
            label={t('admin:teamTypes.form.name')}
            placeholder={t('admin:teamTypes.form.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4"
            />
            <label htmlFor="is-active" className="text-nb-body-sm font-medium">
              {t('admin:teamTypes.form.activeLabel')}
            </label>
          </div>
          <MarkerImagePicker
            value={markerImageUrl}
            onChange={setMarkerImageUrl}
            defaultUrl={entityMarkerDefault('team')}
          />
          <ColorField
            label={t('admin:teamTypes.form.markerColor')}
            value={markerColor ?? ''}
            // eslint-disable-next-line sekar-design/no-inline-hex-colors -- fallback is placeholder colour only, not a design token
            fallback="#7FBC8C"
            onChange={setMarkerColor}
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:actions.cancel')}
          </Button>
          {isEdit && (
            <Button variant="ghost" onClick={revert} disabled={!isDirty || isPending}>
              {t('admin:shared.undoChanges')}
            </Button>
          )}
          <Button onClick={handleSave} loading={isPending} disabled={!canSave || (isEdit && !isDirty)}>
            {t('common:actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
