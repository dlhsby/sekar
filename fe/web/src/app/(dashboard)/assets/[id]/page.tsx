'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MoreVertical } from 'lucide-react';
import {
  Button,
  Card,
  Dialog,
  DialogContent,
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

const STATUS_LABELS: Record<AssetStatus, string> = {
  available: 'Tersedia',
  in_use: 'Digunakan',
  maintenance: 'Perawatan',
  retired: 'Pensiun',
  lost: 'Hilang',
};

const STATUS_TONE_MAP: Record<AssetStatus, 'ok' | 'info' | 'warn' | 'neutral' | 'bad'> = {
  available: 'ok',
  in_use: 'info',
  maintenance: 'warn',
  retired: 'neutral',
  lost: 'bad',
};

const ASSET_CONDITION_LABELS: Record<AssetCondition, string> = {
  good: 'Baik',
  fair: 'Cukup',
  poor: 'Buruk',
  damaged: 'Rusak',
  unusable: 'Tidak Dapat Digunakan',
};

const CONDITION_TONE_MAP: Record<AssetCondition, 'ok' | 'info' | 'warn' | 'bad'> = {
  good: 'ok',
  fair: 'info',
  poor: 'warn',
  damaged: 'bad',
  unusable: 'bad',
};

const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  routine: 'Rutin',
  repair: 'Perbaikan',
  inspection: 'Inspeksi',
  replacement: 'Penggantian',
};

const MAINTENANCE_STATUS_TONE_MAP: Record<string, 'info' | 'warn' | 'ok' | 'neutral' | 'bad'> = {
  scheduled: 'info',
  in_progress: 'warn',
  completed: 'ok',
  cancelled: 'neutral',
  overdue: 'bad',
};

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
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
      toast({ level: 'success', title: 'Aset berhasil diambil' });
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
      toast({ level: 'success', title: 'Aset berhasil dikembalikan' });
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
      toast({ level: 'success', title: 'Perawatan berhasil dijadwalkan' });
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
      toast({ level: 'success', title: 'QR code berhasil dibuat' });
    } catch (error) {
      toast({ level: 'danger', title: getErrorMessage(error) });
    }
  };

  const handleDelete = async () => {
    if (confirm('Hapus aset ini?')) {
      try {
        await deleteMutation.mutateAsync(assetId);
        toast({ level: 'success', title: 'Aset berhasil dihapus' });
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
        <PageHeader title="Aset Tidak Ditemukan" />
        <EmptyState variant="error" />
      </div>
    );
  }

  const assignmentColumns: ColumnDef<AssetAssignment>[] = [
    { id: 'checked_out_at', header: 'Tanggal', enableSorting: false, meta: { label: 'Tanggal' }, cell: ({ row }) => formatDate(new Date(row.original.checked_out_at)) },
    { id: 'assignedTo', header: 'Pekerja', enableSorting: false, meta: { label: 'Pekerja' }, cell: ({ row }) => row.original.assignedTo?.full_name || '—' },
    { id: 'type', header: 'Tipe', enableSorting: false, meta: { label: 'Tipe' }, cell: ({ row }) => (row.original.returned_at ? 'Kembali' : 'Ambil') },
    {
      id: 'condition',
      header: 'Kondisi',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Kondisi' },
      cell: ({ row }) => (
        <StatusPill tone={CONDITION_TONE_MAP[row.original.condition_at_return || row.original.condition_at_checkout]}>
          {row.original.condition_at_return ? ASSET_CONDITION_LABELS[row.original.condition_at_return] : ASSET_CONDITION_LABELS[row.original.condition_at_checkout]}
        </StatusPill>
      ),
    },
  ];

  const maintenanceColumns: ColumnDef<AssetMaintenance>[] = [
    { id: 'scheduled_at', header: 'Tanggal', enableSorting: false, meta: { label: 'Tanggal' }, cell: ({ row }) => formatDate(new Date(row.original.scheduled_at)) },
    { id: 'maintenance_type', header: 'Tipe', enableSorting: false, meta: { label: 'Tipe' }, cell: ({ row }) => MAINTENANCE_TYPE_LABELS[row.original.maintenance_type] },
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Status' },
      cell: ({ row }) => (
        <StatusPill tone={MAINTENANCE_STATUS_TONE_MAP[row.original.status] || 'neutral'}>
          {row.original.status === 'scheduled' ? 'Terjadwal' : row.original.status === 'completed' ? 'Selesai' : row.original.status}
        </StatusPill>
      ),
    },
    {
      id: 'cost',
      header: 'Biaya',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Biaya' },
      cell: ({ row }) => (row.original.cost ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(row.original.cost) : '—'),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={asset.asset_code}
        description={asset.name}
        breadcrumb="Aset · Detail"
        actions={
          isManager && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleDelete}>Hapus</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      />

      <div className="grid grid-cols-3 gap-6">
        <Card variant="default">
          <div className="p-4 space-y-4">
            <h3 className="text-nb-h3 font-bold">Informasi</h3>
            <div className="space-y-3">
              <div>
                <p className="text-nb-body-sm text-nb-gray-600">Kategori</p>
                <p className="text-nb-body font-semibold">{asset.category?.name}</p>
              </div>
              <div>
                <p className="text-nb-body-sm text-nb-gray-600">Status</p>
                <StatusPill tone={STATUS_TONE_MAP[asset.status]}>{STATUS_LABELS[asset.status]}</StatusPill>
              </div>
            </div>
            {isManager && (
              <div className="pt-4 space-y-2 border-t-2 border-nb-black">
                <Button variant="default" size="sm" className="w-full" onClick={() => setCheckoutOpen(true)} disabled={asset.status === 'in_use'}>
                  Ambil Aset
                </Button>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setReturnOpen(true)} disabled={asset.status !== 'in_use'}>
                  Kembalikan
                </Button>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setMaintenanceOpen(true)}>
                  Jadwal Perawatan
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      <SectionCard title="Riwayat Penggunaan">
        {assignmentsLoading ? <div className="p-4">Memuat...</div> : !assignments?.length ? <EmptyState variant="noData" title="Tidak ada riwayat" /> : null}
      </SectionCard>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ambil Aset</DialogTitle>
            <DialogDescription>Catat kondisi aset saat diambil</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kondisi</Label>
              <FormSelect
                label="Kondisi"
                options={CHECKOUT_CONDITIONS.map((c) => ({ value: c, label: ASSET_CONDITION_LABELS[c] }))}
                value={checkoutCondition}
                onChange={(value) => setCheckoutCondition(value as AssetCondition)}
              />
            </div>
            <div>
              <Label>Catatan</Label>
              <Textarea placeholder="Catatan tambahan..." value={checkoutNotes} onChange={(e) => setCheckoutNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>
              Batal
            </Button>
            <Button variant="default" loading={checkoutMutation.isPending} onClick={handleCheckout}>
              Ambil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kembalikan Aset</DialogTitle>
            <DialogDescription>Catat kondisi aset saat dikembalikan</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kondisi</Label>
              <FormSelect
                label="Kondisi"
                options={Object.entries(ASSET_CONDITION_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                value={returnCondition}
                onChange={(value) => setReturnCondition(value as AssetCondition)}
              />
            </div>
            <div>
              <Label>Catatan</Label>
              <Textarea placeholder="Catatan tambahan..." value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>
              Batal
            </Button>
            <Button variant="default" loading={returnMutation.isPending} onClick={handleReturn}>
              Kembalikan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={maintenanceOpen} onOpenChange={setMaintenanceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Jadwal Perawatan</DialogTitle>
            <DialogDescription>Buat jadwal perawatan untuk aset ini</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormSelect
              label="Tipe Perawatan"
              options={Object.entries(MAINTENANCE_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
              value={maintenanceType}
              onChange={(value) => setMaintenanceType(value as MaintenanceType)}
            />
            <Field label="Tanggal">
              {(p) => (
                <DatePicker
                  id={p.id}
                  value={maintenanceDate || undefined}
                  onValueChange={(v) => setMaintenanceDate(v ?? '')}
                />
              )}
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaintenanceOpen(false)}>
              Batal
            </Button>
            <Button variant="default" loading={maintenanceMutation.isPending} onClick={handleCreateMaintenance}>
              Jadwalkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
