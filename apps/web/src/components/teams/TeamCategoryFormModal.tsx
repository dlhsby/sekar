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
import { ColorField } from '@/components/forms/ColorField';
import { MarkerIconPicker } from '@/components/forms/MarkerIconPicker';

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
  const [markerColor, setMarkerColor] = useState<string | null>(null);
  const [markerIcon, setMarkerIcon] = useState<string | null>(null);

  // Revert the form to the loaded team category's values (also runs on open).
  const revert = () => {
    setName(teamCategory?.name ?? '');
    setMarkerColor(teamCategory?.marker_color ?? null);
    setMarkerIcon(teamCategory?.marker_icon ?? null);
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
    (markerColor ?? null) !== (teamCategory?.marker_color ?? null) ||
    (markerIcon ?? null) !== (teamCategory?.marker_icon ?? null);

  const handleSave = async () => {
    // `is_active` is owned by the grid's activate/deactivate action, so an edit
    // never sends it — only a new category needs the active default.
    const payload = {
      name: name.trim(),
      marker_color: markerColor,
      marker_icon: markerIcon,
    };
    try {
      if (isEdit && teamCategory) await updateMutation.mutateAsync({ id: teamCategory.id, data: payload });
      else await createMutation.mutateAsync({ ...payload, is_active: true });
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
          <ColorField
            label={t('admin:teamCategories.form.markerColor')}
            value={markerColor ?? ''}
            // eslint-disable-next-line sekar-design/no-inline-hex-colors -- fallback is placeholder colour only, not a design token
            fallback="#7FBC8C"
            onChange={setMarkerColor}
          />
          <div>
            <span className="mb-1 block text-nb-body-sm font-bold text-nb-black">
              {t('admin:teamCategories.form.markerIcon')}
            </span>
            <MarkerIconPicker value={markerIcon} onChange={setMarkerIcon} />
          </div>
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
