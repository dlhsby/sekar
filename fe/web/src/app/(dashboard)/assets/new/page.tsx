'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  FormInput,
  FormSelect,
  PageHeader,
  useToast,
  Field,
  DatePicker,
} from '@/components/ui';
import { useUser } from '@/lib/auth/hooks';
import { useAssetCategories, useCreateAsset } from '@/lib/api/assets';
import { getErrorMessage } from '@/lib/api/client';

const ASSET_MANAGER_ROLES = ['korlap', 'kepala_rayon', 'top_management', 'admin_system', 'superadmin'];

export default function CreateAssetPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const user = useUser();

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [rayonId, setRayonId] = useState('');
  const [description, setDescription] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');

  const { data: categories = [] } = useAssetCategories();
  const createMutation = useCreateAsset();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !categoryId) {
      toast({
        level: 'danger',
        title: t('assets:form.validationError'),
      });
      return;
    }

    try {
      const asset = await createMutation.mutateAsync({
        name,
        category_id: categoryId,
        area_id: areaId || undefined,
        rayon_id: rayonId || undefined,
        description: description || undefined,
        purchase_date: purchaseDate || undefined,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : undefined,
      });

      toast({
        level: 'success',
        title: t('assets:form.createSuccess'),
      });

      router.push(`/assets/${asset.id}`);
    } catch (error) {
      toast({
        level: 'danger',
        title: getErrorMessage(error),
      });
    }
  };

  // Access guard — placed after all hooks so hook order stays stable (rules-of-hooks).
  if (user && !ASSET_MANAGER_ROLES.includes(user.role)) {
    return <div><p>{t('common:errors.noPermission.short')}</p></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('assets:create.pageTitle')}
        breadcrumb={t('assets:create.breadcrumb')}
      />

      <Card variant="default" className="max-w-2xl">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <FormInput
            label={t('assets:form.nameLabel')}
            placeholder={t('assets:form.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <FormSelect
            label={t('assets:form.categoryLabel')}
            placeholder={t('assets:form.categoryPlaceholder')}
            options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
            value={categoryId}
            onChange={(value) => setCategoryId(value)}
            required
          />

          <FormInput
            label={t('assets:form.descriptionLabel')}
            placeholder={t('assets:form.descriptionPlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Field label={t('assets:form.purchaseDateLabel')}>
            {(p) => (
              <DatePicker
                id={p.id}
                value={purchaseDate || undefined}
                onValueChange={(v) => setPurchaseDate(v ?? '')}
              />
            )}
          </Field>

          <FormInput
            label={t('assets:form.purchasePriceLabel')}
            type="number"
            placeholder={t('assets:form.purchasePricePlaceholder')}
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              type="submit"
              variant="default"
              loading={createMutation.isPending}
            >
              {t('assets:form.create')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
