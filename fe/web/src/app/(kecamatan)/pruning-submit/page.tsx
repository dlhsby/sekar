/**
 * Kecamatan submit form — KEC-1 (Phase 4-R).
 *
 * The real web submission flow for staff_kecamatan, mirroring the mobile
 * SubmitScreen: address + GPS, 1–5 photos (base64 data URIs, matching the
 * mobile contract until the S3 pipeline lands), tree details, contacts, an
 * optional preferred ISO week, and notes. Online-only; web does not queue
 * offline writes. On success → toast + redirect to "Permintaan Saya".
 */

'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { z } from 'zod';
import { Camera, MapPin, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button, FormInput, SectionCard, Textarea } from '@/components/ui';
import { getErrorMessage } from '@/lib/api/client';
import { useSubmitPruningRequest } from '@/lib/api/pruning-requests';

const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10MB, matches backend limit

/** Text-field schema (mirrors CreatePruningRequestDto + mobile validate()). */
const formSchema = z.object({
  address: z
    .string()
    .trim()
    .min(5, 'Alamat minimal 5 karakter.')
    .max(500, 'Alamat maksimal 500 karakter.'),
  treeCount: z.coerce.number().int().min(1, 'Jumlah pohon minimal 1.'),
  treeHeight: z.string().trim().min(1, 'Tinggi pohon wajib diisi.'),
  treeDiameter: z.string().trim().min(1, 'Diameter batang wajib diisi.'),
  requesterName: z.string().trim().min(1, 'Nama pengaju wajib diisi.'),
  requesterPhone: z.string().trim().min(1, 'No. HP pengaju wajib diisi.'),
  rtLeaderName: z.string().trim().min(1, 'Nama ketua RT wajib diisi.'),
  rtLeaderPhone: z.string().trim().min(1, 'No. HP ketua RT wajib diisi.'),
  notes: z.string().trim().max(1000, 'Catatan maksimal 1000 karakter.').optional(),
});

type FormErrors = Partial<Record<keyof z.infer<typeof formSchema> | 'photos' | 'gps', string>>;

/** ISO 8601 week + year for a given date (mirrors mobile dateUtils.getISOWeek). */
function getIsoWeek(date: Date): { year: number; isoWeek: number } {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const isoWeek = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: target.getUTCFullYear(), isoWeek };
}

const digitsOnly = (s: string) => s.replace(/\D/g, '');

const INITIAL = {
  address: '',
  treeCount: '',
  treeHeight: '',
  treeDiameter: '',
  requesterName: '',
  requesterPhone: '',
  rtLeaderName: '',
  rtLeaderPhone: '',
  notes: '',
};

export default function PruningSubmitPage() {
  const router = useRouter();
  const submitMutation = useSubmitPruningRequest();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(INITIAL);
  const [photos, setPhotos] = useState<string[]>([]);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [expectedDate, setExpectedDate] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const setField = (key: keyof typeof INITIAL) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const useMyLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error('Perangkat tidak mendukung lokasi GPS.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setErrors((prev) => ({ ...prev, gps: undefined }));
        setGpsLoading(false);
      },
      (err) => {
        toast.error(`Gagal mengambil lokasi: ${err.message}`);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // allow re-selecting the same file
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast.error(`Maksimal ${MAX_PHOTOS} foto.`);
      return;
    }
    const next: string[] = [];
    for (const file of files.slice(0, remaining)) {
      if (file.size > MAX_PHOTO_BYTES) {
        toast.error(`${file.name} melebihi 10 MB dan dilewati.`);
        continue;
      }
      try {
        next.push(await fileToDataUrl(file));
      } catch {
        toast.error(`Gagal membaca ${file.name}.`);
      }
    }
    if (next.length) {
      setPhotos((prev) => [...prev, ...next]);
      setErrors((prev) => ({ ...prev, photos: undefined }));
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = formSchema.safeParse(form);
    const nextErrors: FormErrors = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormErrors;
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
    }
    if (photos.length < 1) nextErrors.photos = 'Lampirkan minimal 1 foto.';
    if (!gps) nextErrors.gps = 'Ambil lokasi GPS terlebih dahulu.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !parsed.success || !gps) {
      toast.warning('Periksa kembali isian formulir.');
      return;
    }

    const week = expectedDate ? getIsoWeek(new Date(expectedDate)) : null;
    const data = parsed.data;

    try {
      await submitMutation.mutateAsync({
        address: data.address,
        lat: gps.lat,
        lng: gps.lng,
        photo_keys: photos,
        tree_count: data.treeCount,
        target_count: data.treeCount,
        tree_height_estimate: data.treeHeight,
        tree_diameter_estimate: data.treeDiameter,
        requester_name: data.requesterName,
        requester_phone: digitsOnly(data.requesterPhone),
        rt_leader_name: data.rtLeaderName,
        rt_leader_phone: digitsOnly(data.rtLeaderPhone),
        notes: data.notes || undefined,
        expected_year: week?.year,
        expected_iso_week: week?.isoWeek,
      });
      toast.success('Permohonan terkirim. Anda akan diberitahu setelah ditinjau.');
      router.push('/pruning-submit/my');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <div>
        <h1 className="text-nb-h2 text-nb-black">Kirim Permintaan</h1>
        <p className="mt-0.5 text-nb-body-sm text-nb-gray-600">
          Ajukan permintaan pemangkasan pohon untuk wilayah Anda.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <SectionCard title="Lokasi">
          <div className="space-y-3">
            <FormInput
              label="Alamat"
              placeholder="Contoh: Jalan Darmo No. 123, Surabaya"
              value={form.address}
              onChange={setField('address')}
              error={errors.address}
              required
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={useMyLocation}
                loading={gpsLoading}
                leftIcon={<MapPin className="size-4" />}
              >
                Gunakan Lokasi Saya
              </Button>
              {gps ? (
                <span className="font-mono text-[12px] text-nb-gray-700">
                  {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}
                </span>
              ) : (
                <span className="text-nb-caption text-nb-gray-500">Lokasi belum diambil</span>
              )}
            </div>
            {errors.gps && (
              <p role="alert" className="text-nb-body-sm text-nb-danger">
                {errors.gps}
              </p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Foto" meta={`${photos.length}/${MAX_PHOTOS}`}>
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFiles}
              className="hidden"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={photos.length >= MAX_PHOTOS}
              leftIcon={<Camera className="size-4" />}
            >
              Tambah Foto
            </Button>
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {photos.map((src, i) => (
                  <div
                    key={i}
                    className="relative overflow-hidden rounded-nb-base border-2 border-nb-black"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Foto ${i + 1}`} className="h-20 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      aria-label={`Hapus foto ${i + 1}`}
                      className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full border-2 border-nb-black bg-nb-white text-nb-black hover:bg-nb-danger hover:text-nb-white"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {errors.photos && (
              <p role="alert" className="text-nb-body-sm text-nb-danger">
                {errors.photos}
              </p>
            )}
            <p className="text-nb-caption text-nb-gray-500">Minimal 1, maksimal {MAX_PHOTOS} foto (maks. 10 MB per foto).</p>
          </div>
        </SectionCard>

        <SectionCard title="Detail Pohon">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FormInput
              label="Jumlah Pohon"
              type="number"
              min={1}
              inputMode="numeric"
              value={form.treeCount}
              onChange={setField('treeCount')}
              error={errors.treeCount}
              required
            />
            <FormInput
              label="Tinggi (estimasi)"
              placeholder="5-7 meter"
              value={form.treeHeight}
              onChange={setField('treeHeight')}
              error={errors.treeHeight}
              required
            />
            <FormInput
              label="Diameter (estimasi)"
              placeholder="30-50 cm"
              value={form.treeDiameter}
              onChange={setField('treeDiameter')}
              error={errors.treeDiameter}
              required
            />
          </div>
        </SectionCard>

        <SectionCard title="Kontak">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormInput
              label="Nama Pengaju"
              value={form.requesterName}
              onChange={setField('requesterName')}
              error={errors.requesterName}
              required
            />
            <FormInput
              label="No. HP Pengaju"
              type="tel"
              inputMode="tel"
              placeholder="081234567890"
              value={form.requesterPhone}
              onChange={setField('requesterPhone')}
              error={errors.requesterPhone}
              required
            />
            <FormInput
              label="Nama Ketua RT"
              value={form.rtLeaderName}
              onChange={setField('rtLeaderName')}
              error={errors.rtLeaderName}
              required
            />
            <FormInput
              label="No. HP Ketua RT"
              type="tel"
              inputMode="tel"
              placeholder="081234567890"
              value={form.rtLeaderPhone}
              onChange={setField('rtLeaderPhone')}
              error={errors.rtLeaderPhone}
              required
            />
          </div>
        </SectionCard>

        <SectionCard title="Jadwal & Catatan" meta="Opsional">
          <div className="space-y-3">
            <FormInput
              label="Minggu Diharapkan"
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              helperText="Petugas akan menentukan hari pasti dalam minggu yang dipilih."
            />
            <Textarea
              label="Catatan"
              rows={3}
              placeholder="Contoh: Pohon menutupi jalan, mohon diprioritaskan."
              value={form.notes}
              onChange={setField('notes')}
            />
          </div>
        </SectionCard>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => router.push('/pruning-submit/my')}>
            Batal
          </Button>
          <Button type="submit" loading={submitMutation.isPending}>
            Kirim Permohonan
          </Button>
        </div>
      </form>
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
