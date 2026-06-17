'use client';

import type { UserRole } from '@/types/models';
import { useAuth } from '@/lib/auth/hooks';
import {
  useReportTemplates,
  useGenerateReport,
  ReportType,
  ReportFormat,
  type ReportTemplate,
} from '@/lib/api/reports';
import {
  Card,
  CardContent,
  FormInput,
  FormSelect,
  Button,
  PageHeader,
  EmptyState,
  useToast,
  type FormSelectOption,
} from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { hasRole } from '@/lib/constants/roles';

const REPORT_TYPE_OPTIONS: FormSelectOption[] = [
  { value: ReportType.DAILY_OPERATIONS, label: 'Laporan Operasional Harian' },
  { value: ReportType.WEEKLY_PERFORMANCE, label: 'Laporan Kinerja Mingguan' },
  { value: ReportType.MONTHLY_SUMMARY, label: 'Ringkasan Bulanan' },
  { value: ReportType.WORKER_PERFORMANCE, label: 'Kinerja Pekerja' },
  { value: ReportType.AREA_STATUS, label: 'Status Area' },
  { value: ReportType.OVERTIME_UTILIZATION, label: 'Penggunaan Lembur' },
];

const FORMAT_OPTIONS: FormSelectOption[] = [
  { value: ReportFormat.PDF, label: 'PDF' },
  { value: ReportFormat.CSV, label: 'CSV' },
  { value: ReportFormat.XLSX, label: 'Excel' },
];

interface BuilderState {
  reportType: string;
  format: string;
  startDate: string;
  endDate: string;
  areaId: string;
  rayonId: string;
  workerId: string;
}

export default function ReportBuilderPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [state, setState] = useState<BuilderState>({
    reportType: '',
    format: '',
    startDate: '',
    endDate: '',
    areaId: '',
    rayonId: '',
    workerId: '',
  });

  const REPORTING_VIEWERS: UserRole[] = [
    'korlap',
    'kepala_rayon',
    'admin_data',
    'top_management',
    'admin_system',
    'superadmin',
  ];

  useEffect(() => {
    if (!authLoading && user && !hasRole(user.role, REPORTING_VIEWERS)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const { data: templates, isLoading: templatesLoading } = useReportTemplates();
  const generateReportMutation = useGenerateReport();

  // Get today's date in YYYY-MM-DD format and 30 days ago
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    setState((s) => ({
      ...s,
      endDate: today.toISOString().split('T')[0],
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
    }));
  }, []);

  const handleSubmit = async () => {
    // Validate form
    if (!state.reportType || !state.format) {
      toast({ level: 'warning', title: 'Pilih tipe dan format laporan' });
      return;
    }

    try {
      await generateReportMutation.mutateAsync({
        report_type: state.reportType as ReportType,
        format: state.format as ReportFormat,
        parameters: {
          start_date: state.startDate || undefined,
          end_date: state.endDate || undefined,
          area_id: state.areaId || undefined,
          rayon_id: state.rayonId || undefined,
          worker_id: state.workerId || undefined,
        },
      });

      toast({
        level: 'success',
        title: 'Laporan sedang diproses',
        body: 'Anda akan dialihkan ke daftar laporan.',
      });

      // Redirect to reports list after a short delay
      setTimeout(() => {
        router.push('/reports');
      }, 1000);
    } catch (err) {
      toast({ level: 'danger', title: 'Gagal membuat laporan' });
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-nb-body text-nb-gray-600">Memuat…</p>
      </div>
    );
  }

  const showWorkerSelect = state.reportType === ReportType.WORKER_PERFORMANCE;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buat Laporan"
        description="Buat laporan baru dengan parameter yang dipilih"
      />

      <Card>
        <CardContent className="space-y-4 max-w-2xl">
          <FormSelect
            label="Tipe Laporan"
            options={REPORT_TYPE_OPTIONS}
            value={state.reportType}
            onChange={(value) => setState((s) => ({ ...s, reportType: value }))}
            placeholder="Pilih tipe laporan"
          />

          <FormSelect
            label="Format"
            options={FORMAT_OPTIONS}
            value={state.format}
            onChange={(value) => setState((s) => ({ ...s, format: value }))}
            placeholder="Pilih format"
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Tanggal Mulai"
              type="date"
              value={state.startDate}
              onChange={(e) => setState((s) => ({ ...s, startDate: e.target.value }))}
            />
            <FormInput
              label="Tanggal Akhir"
              type="date"
              value={state.endDate}
              onChange={(e) => setState((s) => ({ ...s, endDate: e.target.value }))}
            />
          </div>

          <FormInput
            label="Area (opsional)"
            type="text"
            placeholder="Cari area..."
            value={state.areaId}
            onChange={(e) => setState((s) => ({ ...s, areaId: e.target.value }))}
          />

          <FormInput
            label="Rayon (opsional)"
            type="text"
            placeholder="Cari rayon..."
            value={state.rayonId}
            onChange={(e) => setState((s) => ({ ...s, rayonId: e.target.value }))}
          />

          {showWorkerSelect && (
            <FormInput
              label="Pekerja"
              type="text"
              placeholder="Cari pekerja..."
              value={state.workerId}
              onChange={(e) => setState((s) => ({ ...s, workerId: e.target.value }))}
            />
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              loading={generateReportMutation.isPending}
              disabled={!state.reportType || !state.format}
            >
              Buat Laporan
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <h3 className="text-nb-h3 font-semibold">Informasi Template</h3>
          {templatesLoading ? (
            <p className="text-nb-body text-nb-gray-600">Memuat template...</p>
          ) : state.reportType && templates ? (
            (() => {
              const selectedTemplate = templates.find(
                (t) => t.report_type === state.reportType
              );
              return selectedTemplate ? (
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Nama:</span> {selectedTemplate.name}
                  </p>
                  {selectedTemplate.description && (
                    <p>
                      <span className="font-medium">Deskripsi:</span> {selectedTemplate.description}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-nb-body-sm text-nb-gray-600">Template tidak ditemukan</p>
              );
            })()
          ) : (
            <p className="text-nb-body-sm text-nb-gray-600">Pilih tipe laporan untuk melihat informasi</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
