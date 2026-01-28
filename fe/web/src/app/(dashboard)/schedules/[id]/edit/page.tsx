/**
 * Edit Schedule Page
 * Form to edit existing worker schedule
 * Access: Admin + KoordinatorLapangan
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/hooks';
import { useSchedule, useUpdateSchedule } from '@/lib/api/schedules';
import { useUsers } from '@/lib/api/users';
import { useAreas } from '@/lib/api/areas';
import { useShiftDefinitions } from '@/lib/api/shift-definitions';
import { NBCard, NBCardHeader, NBCardContent, NBButton, NBInput, NBSelect } from '@/components/nb';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface EditSchedulePageProps {
  params: {
    id: string;
  };
}

export default function EditSchedulePage({ params }: EditSchedulePageProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Form state
  const [userId, setUserId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Fetch data
  const { data: schedule, isLoading: scheduleLoading } = useSchedule(params.id);
  const { data: usersData } = useUsers({ role: 'Worker', limit: 1000 });
  const { data: areasData } = useAreas({ limit: 1000 });
  const { data: shifts } = useShiftDefinitions();
  const updateMutation = useUpdateSchedule(params.id);

  // Initialize form with schedule data
  useEffect(() => {
    if (schedule && !initialized) {
      setUserId(schedule.user_id);
      setAreaId(schedule.area_id);
      setShiftId(schedule.shift_definition_id);
      setEffectiveDate(schedule.effective_date.split('T')[0]);
      setEndDate(schedule.end_date ? schedule.end_date.split('T')[0] : '');
      setInitialized(true);
    }
  }, [schedule, initialized]);

  // Access control
  useEffect(() => {
    if (!authLoading && user && !['Admin', 'KoordinatorLapangan'].includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  if (authLoading || scheduleLoading || !user) {
    return <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-nb-primary"></div>
    </div>;
  }

  if (!['Admin', 'KoordinatorLapangan'].includes(user.role)) {
    return null;
  }

  if (!schedule) {
    return <div className="container mx-auto p-6">
      <div className="text-center text-gray-600">Jadwal tidak ditemukan</div>
    </div>;
  }

  const users = usersData?.data || [];
  const areas = areasData?.data || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!userId || !areaId || !shiftId || !effectiveDate) {
      setError('Semua field wajib diisi');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        user_id: userId,
        area_id: areaId,
        shift_definition_id: shiftId,
        effective_date: effectiveDate,
        end_date: endDate || undefined,
      });
      
      router.push('/schedules');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memperbarui jadwal');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/schedules" className="text-nb-primary hover:underline font-semibold">
              Jadwal
            </Link>
          </li>
          <li className="text-gray-400">/</li>
          <li className="text-gray-600">Edit</li>
        </ol>
      </nav>

      <NBCard variant="elevated">
        <NBCardHeader>
          <h1 className="text-2xl font-bold text-nb-black">
            Edit Jadwal
          </h1>
        </NBCardHeader>

        <NBCardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="p-4 border-3 border-nb-danger bg-red-50 text-nb-danger">
                {error}
              </div>
            )}

            {/* Worker Select */}
            <NBSelect
              label="Pekerja"
              required
              value={userId}
              onChange={(value) => setUserId(value as string)}
              options={[
                { value: '', label: 'Pilih Pekerja' },
                ...users.map((u) => ({
                  value: u.id,
                  label: `${u.name} (${u.email})`,
                })),
              ]}
              helperText="Pilih pekerja yang akan dijadwalkan"
            />

            {/* Area Select */}
            <NBSelect
              label="Area"
              required
              value={areaId}
              onChange={(value) => setAreaId(value as string)}
              options={[
                { value: '', label: 'Pilih Area' },
                ...areas.map((a) => ({
                  value: a.id,
                  label: `${a.name} (${a.code})`,
                })),
              ]}
              helperText="Area penugasan pekerja"
            />

            {/* Shift Select */}
            <NBSelect
              label="Shift"
              required
              value={shiftId}
              onChange={(value) => setShiftId(value as string)}
              options={[
                { value: '', label: 'Pilih Shift' },
                ...(shifts || []).map((s) => ({
                  value: s.id,
                  label: `${s.name} (${s.start_time} - ${s.end_time})`,
                })),
              ]}
              helperText="Jam kerja pekerja"
            />

            {/* Effective Date */}
            <NBInput
              label="Tanggal Mulai"
              type="date"
              required
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              helperText="Tanggal berlaku jadwal"
            />

            {/* End Date */}
            <NBInput
              label="Tanggal Selesai (Opsional)"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              helperText="Kosongkan jika jadwal berlangsung terus"
            />

            {/* Actions */}
            <div className="flex gap-4 justify-end pt-4">
              <Link href="/schedules">
                <NBButton variant="secondary" type="button">
                  Batal
                </NBButton>
              </Link>
              <NBButton
                variant="primary"
                type="submit"
                loading={updateMutation.isPending}
              >
                Simpan Perubahan
              </NBButton>
            </div>
          </form>
        </NBCardContent>
      </NBCard>
    </div>
  );
}
