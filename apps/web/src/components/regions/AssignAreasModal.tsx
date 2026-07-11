'use client';

import { useEffect, useMemo, useState } from 'react';
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
  FormMultiCombobox,
  EmptyState,
  Skeleton,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/api/client';
import { useAssignRegionAreas, type Region } from '@/lib/api/regions';
import { useAreas } from '@/lib/api/areas';

interface AssignAreasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  region: Region | null;
  onSuccess?: () => void;
}

/**
 * Re-parent a rayon's areas into a Kawasan (region). Multi-select with replace
 * semantics — the region's areas become exactly the selected set (deselected
 * areas are un-parented). Only areas in the region's rayon are shown.
 */
export function AssignAreasModal({ open, onOpenChange, region, onSuccess }: AssignAreasModalProps) {
  const { t } = useTranslation();
  const assign = useAssignRegionAreas();
  // The /areas endpoint doesn't filter by rayon_id (admin sees every rayon), so
  // fetch broadly and narrow to the region's rayon client-side — only same-rayon
  // areas can be re-parented (the backend enforces this too).
  const { data, isLoading } = useAreas(
    { limit: 2000, include_inactive: true },
    { enabled: open && !!region?.rayon_id },
  );
  const rayonAreas = useMemo(
    () => (data?.data ?? []).filter((a) => a.rayon_id === region?.rayon_id),
    [data, region],
  );
  const options = useMemo(
    () => rayonAreas.map((a) => ({ value: a.id, label: String(a.name ?? '') })),
    [rayonAreas],
  );

  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    if (!open || !region) return;
    setSelected(rayonAreas.filter((a) => a.region_id === region.id).map((a) => a.id));
  }, [open, region, rayonAreas]);

  const save = async () => {
    if (!region) return;
    try {
      await assign.mutateAsync({ id: region.id, areaIds: selected });
      toast.success(t('admin:regions.assignAreas.success', { name: region.name }));
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="default">
        <DialogHeader>
          <DialogTitle>
            {t('admin:regions.assignAreas.title', { name: region?.name ?? '' })}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <p className="text-nb-body-sm text-nb-gray-600">{t('admin:regions.assignAreas.help')}</p>
          {isLoading ? (
            <Skeleton variant="text" />
          ) : options.length === 0 ? (
            <EmptyState variant="noData" title={t('admin:regions.assignAreas.empty')} />
          ) : (
            <FormMultiCombobox
              label={t('admin:regions.assignAreas.label')}
              options={options}
              values={selected}
              onChange={setSelected}
              placeholder={t('admin:regions.assignAreas.placeholder')}
            />
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button onClick={save} loading={assign.isPending} disabled={isLoading}>
            {t('common:actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
