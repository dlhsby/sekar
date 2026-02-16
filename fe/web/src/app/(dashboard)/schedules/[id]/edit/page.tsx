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
import { Card, CardHeader, CardContent, Button, FormInput, FormSelect } from '@/components/ui';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';

interface EditSchedulePageProps {
  params: {
    id: string;
  };
}

export default function EditSchedulePage({ params }: EditSchedulePageProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Form state
  // Fetch data
  const { data: schedule, isLoading: scheduleLoading } = useSchedule(params.id);
  const { data: usersData } = useUsers({ limit: 1000 });
  const { data: areasData } = useAreas({ limit: 1000 });
  const { data: shifts } = useShiftDefinitions();
  const updateMutation = useUpdateSchedule(params.id);

  // Initialize state from schedule data (only on first render when schedule loads)
  const [userId, setUserId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  // Initialize form with schedule data once loaded
  useEffect(() => {
    if (schedule && userId === '') {
      setUserId(schedule.user_id);
      setAreaId(schedule.area_id);
      setShiftId(schedule.shift_definition_id);
      setEffectiveDate(schedule.effective_date.split('T')[0]);
      setEndDate(schedule.end_date ? schedule.end_date.split('T')[0] : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule]);

  // Access control
  useEffect(() => {
    if (!authLoading && user && !['admin', 'koordinator_lapangan'].includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  if (authLoading || scheduleLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-nb-primary"></div>
      </div>
    );
  }

  if (!['admin', 'koordinator_lapangan'].includes(user.role)) {
    return null;
  }

  if (!schedule) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-nb-gray-600">Jadwal tidak ditemukan</div>
      </div>
    );
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
    } catch (err) {
      setError(getErrorMessage(err));
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
          <li className="text-nb-gray-400">/</li>
          <li className="text-nb-gray-600">Edit</li>
        </ol>
      </nav>

      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/schedules')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Kembali ke Daftar Jadwal
        </Button>
      </div>

      <Card variant="elevated">
        <CardHeader>
          <h1 className="text-2xl font-bold text-nb-black">Edit Jadwal</h1>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div
                className="p-4 border-2 border-nb-danger bg-nb-danger-light text-nb-danger"
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}

            {/* Worker Select */}
            <FormSelect
              label="Pekerja"
              required
              value={userId}
              onChange={(value) => setUserId(value as string)}
              options={[
                { value: 'none', label: 'Pilih Pekerja' },
                ...users.map((u) => ({
                  value: u.id,
                  label: `${u.name} (${u.email})`,
                })),
              ]}
              helperText={
                <span className="text-nb-gray-600">Pilih pekerja yang akan dijadwalkan</span>
              }
            />

            {/* Area Select */}
            <FormSelect
              label="Area"
              required
              value={areaId}
              onChange={(value) => setAreaId(value as string)}
              options={[
                { value: 'none', label: 'Pilih Area' },
                ...areas.map((a) => ({
                  value: a.id,
                  label: `${a.name} (${a.code})`,
                })),
              ]}
              helperText={<span className="text-nb-gray-600">Area penugasan pekerja</span>}
            />

            {/* Shift Select */}
            <FormSelect
              label="Shift"
              required
              value={shiftId}
              onChange={(value) => setShiftId(value as string)}
              options={[
                { value: 'none', label: 'Pilih Shift' },
                ...(shifts || []).map((s) => ({
                  value: s.id,
                  label: `${s.name} (${s.start_time} - ${s.end_time})`,
                })),
              ]}
              helperText={<span className="text-nb-gray-600">Jam kerja pekerja</span>}
            />

            {/* Effective Date */}
            <FormInput
              label="Tanggal Mulai"
              type="date"
              required
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              helperText={<span className="text-nb-gray-600">Tanggal berlaku jadwal</span>}
            />

            {/* End Date */}
            <FormInput
              label="Tanggal Selesai (Opsional)"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              helperText={
                <span className="text-nb-gray-600">Kosongkan jika jadwal berlangsung terus</span>
              }
            />

            {/* Actions */}
            <div className="flex gap-4 justify-end pt-4">
              <Link href="/schedules">
                <Button variant="secondary" type="button">
                  Batal
                </Button>
              </Link>
              <Button type="submit" loading={updateMutation.isPending}>
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
