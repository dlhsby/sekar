/**
 * Seed Transaction Form Page (Phase 3)
 * Record a new transaction (purchase, distribution, adjustment)
 */

'use client';

import { use, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  'admin_data',
  'kepala_rayon',
  'top_management',
  'admin_system',
  'superadmin',
];

const READ_ONLY_ROLES = ['kepala_rayon', 'admin_system'];

const transactionSchema = z.object({
  transactionType: z.enum(['purchase', 'distribution', 'adjustment']),
  qty: z.number().min(0.01, 'Jumlah harus lebih dari 0'),
  unitPrice: z.number().optional(),
  supplier: z.string().optional(),
  occurredAt: z.string().min(1, 'Tanggal transaksi wajib diisi'),
  notes: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionFormPageProps {
  params: Promise<{ id: string }>;
}

export default function TransactionFormPage({ params }: TransactionFormPageProps) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const { data: seed, isLoading: seedLoading } = useSeedDetail(id);
  const recordMutation = useRecordTransaction();

  const allowed = !!user && ALLOWED_ROLES.includes(user.role);
  const canWrite = !!user && !READ_ONLY_ROLES.includes(user.role);

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
        toast({ level: 'success', title: 'Transaksi berhasil dicatat' });
        router.push(`/seeds/${id}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal mencatat transaksi';
        toast({ level: 'danger', title: 'Error', body: message });
      }
    },
    [id, recordMutation, router, toast]
  );

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-nb-gray-600">Memuat...</p>
      </div>
    );
  }

  if (!allowed || !canWrite) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={seedLoading ? 'Memuat…' : `Catat Transaksi - ${seed?.nameId || ''}`}
      />

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-nb-body font-medium text-nb-black mb-1">
                Tipe Transaksi
              </label>
              <select
                {...register('transactionType')}
                className="w-full px-3 py-2 border-2 border-nb-black rounded-nb-base font-body text-nb-body"
              >
                <option value="purchase">Pembelian</option>
                <option value="distribution">Distribusi</option>
                <option value="adjustment">Penyesuaian</option>
              </select>
              {errors.transactionType?.message && (
                <p className="mt-1 text-nb-body-sm text-nb-danger">{errors.transactionType.message}</p>
              )}
            </div>

            <FormInput
              label="Jumlah"
              type="number"
              placeholder="Masukkan jumlah transaksi"
              step="0.01"
              min="0"
              error={errors.qty?.message}
              {...register('qty', { valueAsNumber: true })}
            />

            {transactionType === 'purchase' && (
              <>
                <FormInput
                  label="Harga Satuan (Opsional)"
                  type="number"
                  placeholder="Harga per unit"
                  step="0.01"
                  min="0"
                  error={errors.unitPrice?.message}
                  {...register('unitPrice', { valueAsNumber: true })}
                />

                <FormInput
                  label="Supplier (Opsional)"
                  type="text"
                  placeholder="Nama supplier"
                  error={errors.supplier?.message}
                  {...register('supplier')}
                />
              </>
            )}

            <Controller
              control={control}
              name="occurredAt"
              render={({ field }) => (
                <Field label="Tanggal Transaksi" error={errors.occurredAt?.message}>
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
                Catatan (Opsional)
              </label>
              <Textarea
                placeholder="Masukkan catatan tambahan"
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
                Simpan Transaksi
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push(`/seeds/${id}`)}
              >
                Batal
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
