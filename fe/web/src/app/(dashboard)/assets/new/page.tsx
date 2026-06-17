'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  FormInput,
  FormSelect,
  PageHeader,
  useToast,
} from '@/components/ui';
import { useUser } from '@/lib/auth/hooks';
import { useAssetCategories, useCreateAsset } from '@/lib/api/assets';
import { getErrorMessage } from '@/lib/api/client';

const ASSET_MANAGER_ROLES = ['korlap', 'kepala_rayon', 'admin_system', 'superadmin'];

export default function CreateAssetPage() {
  const router = useRouter();
  const { toast } = useToast();
  const user = useUser();

  if (user && !ASSET_MANAGER_ROLES.includes(user.role)) {
    return <div><p>Akses ditolak</p></div>;
  }

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
        title: 'Nama dan kategori harus diisi',
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
        title: 'Aset berhasil dibuat',
      });

      router.push(`/assets/${asset.id}`);
    } catch (error) {
      toast({
        level: 'danger',
        title: getErrorMessage(error),
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tambah Aset"
        breadcrumb="Aset · Tambah"
      />

      <Card variant="default" className="max-w-2xl">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <FormInput
            label="Nama Aset"
            placeholder="Sapu Lidi #1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <FormSelect
            label="Kategori"
            placeholder="Pilih Kategori"
            options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
            value={categoryId}
            onChange={(value) => setCategoryId(value)}
            required
          />

          <FormInput
            label="Deskripsi"
            placeholder="Deskripsi aset"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <FormInput
            label="Tanggal Pembelian"
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />

          <FormInput
            label="Harga Pembelian"
            type="number"
            placeholder="Harga dalam Rupiah"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="default"
              loading={createMutation.isPending}
            >
              Buat Aset
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
