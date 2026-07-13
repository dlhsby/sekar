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
  useCreateTeamCategory,
  useUpdateTeamCategory,
  type TeamCategory,
} from '@/lib/api/teams';
import { MarkerImagePicker } from '@/components/forms/MarkerImagePicker';
import { ColorField } from '@/components/forms/ColorField';
import { entityMarkerDefault } from '@/lib/constants/markerDefaults';

interface TeamCategoryFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamCategory?: TeamCategory | null;
  onSuccess?: () => void;
}

/** Create / edit a team category. Team types are the catalog of crew types (phase 4). */
export function TeamCategoryFormModal({ open, onOpenChange, teamCategory, onSuccess }: TeamCategoryFormModalProps) {
  const { t } = useTranslation();
  const isEdit = !!teamCategory;
  const createMutation = useCreateTeamCategory();
  const updateMutation = useUpdateTeamCategory();

  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [markerImageUrl, setMarkerImageUrl] = useState<string | null>(null);
  const [markerColor, setMarkerColor] = useState<string | null>(null);

  // Revert the form to the loaded team category's values (also runs on open).
  const revert = () => {
    setName(teamCategory?.name ?? '');
    setIsActive(teamCategory?.is_active ?? true);
    setMarkerImageUrl(teamCategory?.marker_image_url ?? null);
    setMarkerColor(teamCategory?.marker_color ?? null);
  };

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState in effect is intentional for form reset
    revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revert is stable and captures (open, teamCategory); standard controlled-form reset
  }, [open, teamCategory]);

  const isPending = createMutation.isPending || updateMutation.isPending;
  const canSave = name.trim().length >= 1;
  const isDirty =
    name !== (teamCategory?.name ?? '') ||
    isActive !== (teamCategory?.is_active ?? true) ||
    (markerImageUrl ?? null) !== (teamCategory?.marker_image_url ?? null) ||
    (markerColor ?? null) !== (teamCategory?.marker_color ?? null);

  const handleSave = async () => {
    const payload = {
      name: name.trim(),
      is_active: isActive,
      marker_image_url: markerImageUrl,
      marker_color: markerColor,
    };
    try {
      if (isEdit && teamCategory) await updateMutation.mutateAsync({ id: teamCategory.id, data: payload });
      else await createMutation.mutateAsync(payload);
    } catch (err) {
      toast.error(getErrorMessage(err));
      return;
    }
    toast.success(
      isEdit
        ? t('admin:teamCategories.successUpdated', { name: payload.name })
        : t('admin:teamCategories.successCreated', { name: payload.name }),
    );
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="default">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('admin:teamCategories.actionEdit') : t('admin:teamCategories.buttonAdd')}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <FormInput
            label={t('admin:teamCategories.form.name')}
            placeholder={t('admin:teamCategories.form.namePlaceholder')}
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
              {t('admin:teamCategories.form.activeLabel')}
            </label>
          </div>
          <MarkerImagePicker
            value={markerImageUrl}
            onChange={setMarkerImageUrl}
            defaultUrl={entityMarkerDefault('team')}
          />
          <ColorField
            label={t('admin:teamCategories.form.markerColor')}
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
