/**
 * Seed Transaction Form Page (Phase 3)
 * Record a new transaction (purchase, distribution, adjustment)
 */

'use client';

import { use, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useAuth } from '@/lib/auth/hooks';
import { useSeedDetail, useRecordTransaction } from '@/lib/api/seeds';
import {
  Card,
  CardContent,
  Button,
  FormInput,
  PageHeader,
  Textarea,
  Field,
  DatePicker,
} from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { Controller } from 'react-hook-form';

const ALLOWED_ROLES = [
  'admin_rayon',
  'kepala_rayon',
  'management',
  'admin_system',
  'superadmin',
];

const READ_ONLY_ROLES = ['kepala_rayon', 'admin_system'];

type TransactionFormData = {
  transactionType: 'purchase' | 'distribution' | 'adjustment';
  qty: number;
  unitPrice?: number;
  supplier?: string;
  occurredAt: string;
  notes?: string;
};

interface TransactionFormPageProps {
  params: Promise<{ id: string }>;
}

function getTransactionSchema(t: any) {
  return z.object({
    transactionType: z.enum(['purchase', 'distribution', 'adjustment']),
    qty: z.number().min(0.01, t('seeds:transactionFormErrors.qtyRequired')),
    unitPrice: z.number().optional(),
    supplier: z.string().optional(),
    occurredAt: z.string().min(1, t('seeds:transactionFormErrors.dateRequired')),
    notes: z.string().optional(),
  });
}

export default function TransactionFormPage({ params }: TransactionFormPageProps) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation(['seeds', 'common']);
  const { toast } = useToast();

  const { data: seed, isLoading: seedLoading } = useSeedDetail(id);
  const recordMutation = useRecordTransaction();

  const allowed = !!user && ALLOWED_ROLES.includes(user.role);
  const canWrite = !!user && !READ_ONLY_ROLES.includes(user.role);

  const transactionSchema = getTransactionSchema(t);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    control,
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      transactionType: 'purchase',
      occurredAt: new Date().toISOString().split('T')[0],
    },
  });

  const transactionType = watch('transactionType');

  useEffect(() => {
    if (!authLoading && user && (!allowed || !canWrite)) {
      router.push('/');
    }
  }, [user, authLoading, allowed, canWrite, router]);

  const onSubmit = useCallback(
    async (data: TransactionFormData) => {
      try {
        await recordMutation.mutateAsync({
          seedId: id,
          transactionType: data.transactionType,
          qty: data.qty,
          unitPrice: data.unitPrice,
          supplier: data.supplier,
          occurredAt: data.occurredAt,
          notes: data.notes,
        });
        toast({ level: 'success', title: t('seeds:transactionForm.successMessage') });
        router.push(`/seeds/${id}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : t('seeds:transactionForm.errorMessage');
        toast({ level: 'danger', title: 'Error', body: message });
      }
    },
    [id, recordMutation, router, toast, t]
  );

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-nb-gray-600">{t('common:actions.loading')}</p>
      </div>
    );
  }

  if (!allowed || !canWrite) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={seedLoading ? t('seeds:detail.loadingTitle') : `${t('seeds:transactionForm.title')} - ${seed?.nameId || ''}`}
      />

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-nb-body font-medium text-nb-black mb-1">
                {t('seeds:transactionForm.typeLabel')}
              </label>
              <select
                {...register('transactionType')}
                className="w-full px-3 py-2 border-2 border-nb-black rounded-nb-base font-body text-nb-body"
              >
                <option value="purchase">{t('seeds:transactionTypes.purchase')}</option>
                <option value="distribution">{t('seeds:transactionTypes.distribution')}</option>
                <option value="adjustment">{t('seeds:transactionTypes.adjustment')}</option>
              </select>
              {errors.transactionType?.message && (
                <p className="mt-1 text-nb-body-sm text-nb-danger">{errors.transactionType.message}</p>
              )}
            </div>

            <FormInput
              label={t('seeds:transactionForm.qtyLabel')}
              type="number"
              placeholder={t('seeds:transactionForm.qtyPlaceholder')}
              step="0.01"
              min="0"
              error={errors.qty?.message}
              {...register('qty', { valueAsNumber: true })}
            />

            {transactionType === 'purchase' && (
              <>
                <FormInput
                  label={t('seeds:transactionForm.unitPriceLabel')}
                  type="number"
                  placeholder={t('seeds:transactionForm.unitPricePlaceholder')}
                  step="0.01"
                  min="0"
                  error={errors.unitPrice?.message}
                  {...register('unitPrice', { valueAsNumber: true })}
                />

                <FormInput
                  label={t('seeds:transactionForm.supplierLabel')}
                  type="text"
                  placeholder={t('seeds:transactionForm.supplierPlaceholder')}
                  error={errors.supplier?.message}
                  {...register('supplier')}
                />
              </>
            )}

            <Controller
              control={control}
              name="occurredAt"
              render={({ field }) => (
                <Field label={t('seeds:transactionForm.dateLabel')} error={errors.occurredAt?.message}>
                  {(p) => (
                    <DatePicker
                      id={p.id}
                      value={field.value || undefined}
                      onValueChange={(v) => field.onChange(v ?? '')}
                    />
                  )}
                </Field>
              )}
            />

            <div>
              <label className="block text-nb-body font-medium text-nb-black mb-1">
                {t('seeds:transactionForm.notesLabel')}
              </label>
              <Textarea
                placeholder={t('seeds:transactionForm.notesPlaceholder')}
                {...register('notes')}
              />
              {errors.notes?.message && (
                <p className="mt-1 text-nb-body-sm text-nb-danger">{errors.notes.message}</p>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                variant="default"
                disabled={isSubmitting || recordMutation.isPending}
                loading={isSubmitting || recordMutation.isPending}
              >
                {t('seeds:transactionForm.submitButton')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push(`/seeds/${id}`)}
              >
                {t('seeds:transactionForm.cancelButton')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
