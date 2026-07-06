'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { MoreVertical } from 'lucide-react';
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  FormSelect,
  Label,
  PageHeader,
  SectionCard,
  Skeleton,
  StatusPill,
  Textarea,
  useToast,
  Field,
  DatePicker,
} from '@/components/ui';
import { useUser } from '@/lib/auth/hooks';
import {
  useAsset,
  useAssetAssignments,
  useCheckoutAsset,
  useCreateMaintenance,
  useDeleteAsset,
  useGenerateQr,
  useReturnAsset,
  type AssetCondition,
  type AssetStatus,
  type MaintenanceType,
  CHECKOUT_CONDITIONS,
} from '@/lib/api/assets';
import { getErrorMessage } from '@/lib/api/client';
import { formatDate } from '@/lib/utils/time';
import type { Asset, AssetAssignment, AssetMaintenance } from '@/lib/api/assets';
import type { ColumnDef } from '@/components/ui';

const ASSET_MANAGER_ROLES = ['korlap', 'kepala_rayon', 'top_management', 'admin_system', 'superadmin'];

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation('assets');
  const user = useUser();
  const assetId = params.id as string;
  const isManager = user && ASSET_MANAGER_ROLES.includes(user.role);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);

  const [checkoutCondition, setCheckoutCondition] = useState<AssetCondition>('good');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [returnCondition, setReturnCondition] = useState<AssetCondition>('good');
  const [returnNotes, setReturnNotes] = useState('');
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>('routine');
  const [maintenanceDate, setMaintenanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [maintenanceDesc, setMaintenanceDesc] = useState('');
  const [maintenanceCost, setMaintenanceCost] = useState('');

  const { data: asset, isLoading: assetLoading } = useAsset(assetId);
  const { data: assignments, isLoading: assignmentsLoading } = useAssetAssignments(assetId);
  const { isPending: qrLoading, mutate: generateQr } = useGenerateQr();

  const checkoutMutation = useCheckoutAsset();
  const returnMutation = useReturnAsset();
  const maintenanceMutation = useCreateMaintenance();
  const deleteMutation = useDeleteAsset();

  const handleCheckout = async () => {
    try {
      await checkoutMutation.mutateAsync({
        id: assetId,
        data: { condition_at_checkout: checkoutCondition, notes: checkoutNotes || undefined },
      });
      toast({ level: 'success', title: t('detail.checkoutSuccess') });
      setCheckoutOpen(false);
      setCheckoutCondition('good');
      setCheckoutNotes('');
    } catch (error) {
      toast({ level: 'danger', title: getErrorMessage(error) });
    }
  };

  const handleReturn = async () => {
    try {
      await returnMutation.mutateAsync({
        id: assetId,
        data: { condition_at_return: returnCondition, notes: returnNotes || undefined },
      });
      toast({ level: 'success', title: t('detail.returnSuccess') });
      setReturnOpen(false);
      setReturnCondition('good');
      setReturnNotes('');
    } catch (error) {
      toast({ level: 'danger', title: getErrorMessage(error) });
    }
  };

  const handleCreateMaintenance = async () => {
    try {
      await maintenanceMutation.mutateAsync({
        id: assetId,
        data: {
          maintenance_type: maintenanceType,
          scheduled_at: maintenanceDate,
          description: maintenanceDesc || undefined,
          cost: maintenanceCost ? parseFloat(maintenanceCost) : undefined,
        },
      });
      toast({ level: 'success', title: t('detail.maintenanceSuccess') });
      setMaintenanceOpen(false);
      setMaintenanceType('routine');
      setMaintenanceDate(new Date().toISOString().split('T')[0]);
      setMaintenanceDesc('');
      setMaintenanceCost('');
    } catch (error) {
      toast({ level: 'danger', title: getErrorMessage(error) });
    }
  };

  const handleGenerateQr = async () => {
    try {
      await generateQr(assetId);
      toast({ level: 'success', title: t('detail.qrSuccess') });
    } catch (error) {
      toast({ level: 'danger', title: getErrorMessage(error) });
    }
  };

  const handleDelete = async () => {
    if (confirm(t('detail.deleteConfirm'))) {
      try {
        await deleteMutation.mutateAsync(assetId);
        toast({ level: 'success', title: t('detail.deleteSuccess') });
        router.push('/assets');
      } catch (error) {
        toast({ level: 'danger', title: getErrorMessage(error) });
      }
    }
  };

  if (assetLoading) {
    return (
      <div className="space-y-6">
        <Skeleton variant="heading" className="w-64" />
        <Skeleton variant="card" className="h-40" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('detail.notFound')} />
        <EmptyState variant="error" />
      </div>
    );
  }

  const assignmentColumns: ColumnDef<AssetAssignment>[] = [
    { id: 'checked_out_at', header: t('detail.assignmentTable.date'), enableSorting: false, meta: { label: t('detail.assignmentTable.date') }, cell: ({ row }) => formatDate(new Date(row.original.checked_out_at)) },
    { id: 'assignedTo', header: t('detail.assignmentTable.worker'), enableSorting: false, meta: { label: t('detail.assignmentTable.worker') }, cell: ({ row }) => row.original.assignedTo?.full_name || '—' },
    { id: 'type', header: t('detail.assignmentTable.type'), enableSorting: false, meta: { label: t('detail.assignmentTable.type') }, cell: ({ row }) => (row.original.returned_at ? t('detail.assignmentTable.return') : t('detail.assignmentTable.checkout')) },
    {
      id: 'condition',
      header: t('detail.assignmentTable.type'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('detail.conditionLabel') },
      cell: ({ row }) => (
        <StatusPill tone={row.original.condition_at_return || row.original.condition_at_checkout === 'good' ? 'ok' : 'warn'}>
          {row.original.condition_at_return ? t(`detail.condition.${row.original.condition_at_return}`) : t(`detail.condition.${row.original.condition_at_checkout}`)}
        </StatusPill>
      ),
    },
  ];

  const maintenanceColumns: ColumnDef<AssetMaintenance>[] = [
    { id: 'scheduled_at', header: t('detail.maintenanceTable.date'), enableSorting: false, meta: { label: t('detail.maintenanceTable.date') }, cell: ({ row }) => formatDate(new Date(row.original.scheduled_at)) },
    { id: 'maintenance_type', header: t('detail.maintenanceTable.type'), enableSorting: false, meta: { label: t('detail.maintenanceTable.type') }, cell: ({ row }) => t(`detail.maintenanceType.${row.original.maintenance_type}`) },
    {
      id: 'status',
      header: t('detail.maintenanceTable.status'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('detail.maintenanceTable.status') },
      cell: ({ row }) => (
        <StatusPill tone={row.original.status === 'completed' ? 'ok' : 'info'}>
          {row.original.status === 'scheduled' ? t('detail.maintenanceStatus.scheduled') : row.original.status === 'completed' ? t('detail.maintenanceStatus.completed') : row.original.status}
        </StatusPill>
      ),
    },
    {
      id: 'cost',
      header: t('detail.maintenanceTable.cost'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('detail.maintenanceTable.cost') },
      cell: ({ row }) => (row.original.cost ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(row.original.cost) : '—'),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={asset.asset_code}
        description={asset.name}
        breadcrumb={t('detail.breadcrumb')}
        actions={
          isManager && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleDelete}>{t('detail.delete')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      />

      <div className="grid grid-cols-3 gap-6">
        <Card variant="default">
          <div className="p-4 space-y-4">
            <h3 className="text-nb-h3 font-bold">{t('detail.infoTitle')}</h3>
            <div className="space-y-3">
              <div>
                <p className="text-nb-body-sm text-nb-gray-600">{t('detail.category')}</p>
                <p className="text-nb-body font-semibold">{asset.category?.name}</p>
              </div>
              <div>
                <p className="text-nb-body-sm text-nb-gray-600">{t('detail.status')}</p>
                <StatusPill tone={asset.status === 'available' ? 'ok' : asset.status === 'in_use' ? 'info' : asset.status === 'maintenance' ? 'warn' : asset.status === 'lost' ? 'bad' : 'neutral'}>{t(`status.${asset.status}`)}</StatusPill>
              </div>
            </div>
            {isManager && (
              <div className="pt-4 space-y-2 border-t-2 border-nb-black">
                <Button variant="default" size="sm" className="w-full" onClick={() => setCheckoutOpen(true)} disabled={asset.status === 'in_use'}>
                  {t('detail.checkoutButton')}
                </Button>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setReturnOpen(true)} disabled={asset.status !== 'in_use'}>
                  {t('detail.returnButton')}
                </Button>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setMaintenanceOpen(true)}>
                  {t('detail.maintenanceButton')}
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      <SectionCard title={t('detail.usageHistory')}>
        {assignmentsLoading ? <div className="p-4">{t('detail.loading')}</div> : !assignments?.length ? <EmptyState variant="noData" title={t('detail.noHistory')} /> : null}
      </SectionCard>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.checkoutTitle')}</DialogTitle>
            <DialogDescription>{t('detail.checkoutDescription')}</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <Label>{t('detail.conditionLabel')}</Label>
              <FormSelect
                label={t('detail.conditionLabel')}
                options={CHECKOUT_CONDITIONS.map((c) => ({ value: c, label: t(`detail.condition.${c}`) }))}
                value={checkoutCondition}
                onChange={(value) => setCheckoutCondition(value as AssetCondition)}
              />
            </div>
            <div>
              <Label>{t('detail.notesLabel')}</Label>
              <Textarea placeholder={t('detail.notesPlaceholder')} value={checkoutNotes} onChange={(e) => setCheckoutNotes(e.target.value)} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>
              {t('form.cancel')}
            </Button>
            <Button variant="default" loading={checkoutMutation.isPending} onClick={handleCheckout}>
              {t('detail.checkoutButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.returnTitle')}</DialogTitle>
            <DialogDescription>{t('detail.returnDescription')}</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <Label>{t('detail.conditionLabel')}</Label>
              <FormSelect
                label={t('detail.conditionLabel')}
                options={Object.entries({ good: t('detail.condition.good'), fair: t('detail.condition.fair'), poor: t('detail.condition.poor'), damaged: t('detail.condition.damaged'), unusable: t('detail.condition.unusable') }).map(([k, v]) => ({ value: k, label: v }))}
                value={returnCondition}
                onChange={(value) => setReturnCondition(value as AssetCondition)}
              />
            </div>
            <div>
              <Label>{t('detail.notesLabel')}</Label>
              <Textarea placeholder={t('detail.notesPlaceholder')} value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>
              {t('form.cancel')}
            </Button>
            <Button variant="default" loading={returnMutation.isPending} onClick={handleReturn}>
              {t('detail.returnButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={maintenanceOpen} onOpenChange={setMaintenanceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.maintenanceTitle')}</DialogTitle>
            <DialogDescription>{t('detail.maintenanceDescription')}</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <FormSelect
              label={t('detail.maintenanceTypeLabel')}
              options={Object.entries({ routine: t('detail.maintenanceType.routine'), repair: t('detail.maintenanceType.repair'), inspection: t('detail.maintenanceType.inspection'), replacement: t('detail.maintenanceType.replacement') }).map(([k, v]) => ({ value: k, label: v }))}
              value={maintenanceType}
              onChange={(value) => setMaintenanceType(value as MaintenanceType)}
            />
            <Field label={t('detail.dateLabel')}>
              {(p) => (
                <DatePicker
                  id={p.id}
                  value={maintenanceDate || undefined}
                  onValueChange={(v) => setMaintenanceDate(v ?? '')}
                />
              )}
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaintenanceOpen(false)}>
              {t('form.cancel')}
            </Button>
            <Button variant="default" loading={maintenanceMutation.isPending} onClick={handleCreateMaintenance}>
              {t('detail.maintenanceButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
