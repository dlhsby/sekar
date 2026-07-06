'use client';

import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DatePicker,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FormInput,
  FormSelect,
  useToast,
} from '@/components/ui';
import { FormActions } from '@/components/forms/FormActions';
import { useAssetCategories, useCreateAsset, useUpdateAsset, type Asset } from '@/lib/api/assets';
import { getErrorMessage } from '@/lib/api/client';

interface AssetFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present → edit; omitted/null → create. */
  asset?: Asset | null;
  onSuccess?: () => void;
}

/**
 * Create / edit an asset in a modal (replaces the standalone /assets/new page
 * and the missing /assets/[id]/edit route).
 */
export function AssetFormModal({ open, onOpenChange, asset, onSuccess }: AssetFormModalProps) {
  const { t } = useTranslation(['assets']);
  const formId = useId();
  const isEdit = !!asset;
  const { toast } = useToast();
  const { data: categories = [] } = useAssetCategories();
  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset();
  const mutation = isEdit ? updateMutation : createMutation;

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');

  // Populate (edit) or clear (create) the fields each time the modal opens.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(asset?.name ?? '');
    setCategoryId(asset?.category_id ?? '');
    setDescription(asset?.description ?? '');
    setPurchaseDate(asset?.purchase_date ?? '');
    setPurchasePrice(asset?.purchase_price != null ? String(asset.purchase_price) : '');
  }, [open, asset]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!name || !categoryId) {
      toast({ level: 'danger', title: t('form.validationError') });
      return;
    }
    const payload = {
      name,
      category_id: categoryId,
      description: description || undefined,
      purchase_date: purchaseDate || undefined,
      purchase_price: purchasePrice ? parseFloat(purchasePrice) : undefined,
    };
    try {
      if (isEdit && asset) {
        await updateMutation.mutateAsync({ id: asset.id, data: payload });
        toast({ level: 'success', title: t('form.updateSuccess') });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ level: 'success', title: t('form.createSuccess') });
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast({ level: 'danger', title: getErrorMessage(error) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('form.editTitle') : t('form.createTitle')}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <form id={formId} onSubmit={handleSubmit}>
            <FormInput
              label={t('form.nameLabel')}
              placeholder={t('form.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <FormSelect
              label={t('form.categoryLabel')}
              placeholder={t('form.categoryPlaceholder')}
              options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
              value={categoryId}
              onChange={setCategoryId}
              required
            />
            <FormInput
              label={t('form.descriptionLabel')}
              placeholder={t('form.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Field label={t('form.purchaseDateLabel')}>
              {(p) => (
                <DatePicker
                  id={p.id}
                  value={purchaseDate || undefined}
                  onValueChange={(v) => setPurchaseDate(v ?? '')}
                />
              )}
            </Field>
            <FormInput
              label={t('form.purchasePriceLabel')}
              type="number"
              placeholder={t('form.purchasePricePlaceholder')}
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
            />
          </form>
        </DialogBody>
        <DialogFooter>
          <FormActions
            formId={formId}
            submitLabel={isEdit ? t('form.save') : t('form.create')}
            loading={mutation.isPending}
            onCancel={() => onOpenChange(false)}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
