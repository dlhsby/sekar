'use client';

import { useEffect, useState } from 'react';
import {
  Button,
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
      toast({ level: 'danger', title: 'Nama dan kategori harus diisi' });
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
        toast({ level: 'success', title: 'Aset diperbarui' });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ level: 'success', title: 'Aset berhasil dibuat' });
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
          <DialogTitle>{isEdit ? 'Ubah Aset' : 'Tambah Aset'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
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
              onChange={setCategoryId}
              required
            />
            <FormInput
              label="Deskripsi"
              placeholder="Deskripsi aset"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Field label="Tanggal Pembelian">
              {(p) => (
                <DatePicker
                  id={p.id}
                  value={purchaseDate || undefined}
                  onValueChange={(v) => setPurchaseDate(v ?? '')}
                />
              )}
            </Field>
            <FormInput
              label="Harga Pembelian"
              type="number"
              placeholder="Harga dalam Rupiah"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
            />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" variant="default" loading={mutation.isPending}>
              {isEdit ? 'Simpan' : 'Buat Aset'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
