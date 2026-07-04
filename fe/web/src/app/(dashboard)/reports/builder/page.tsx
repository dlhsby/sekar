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
  EmptyState,
  useToast,
  type FormSelectOption,
  Field,
  DateRangePicker,
} from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { hasRole } from '@/lib/constants/roles';

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
  const { t } = useTranslation(['reports', 'common']);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // Create report type options dynamically with translations
  const REPORT_TYPE_OPTIONS = useMemo<FormSelectOption[]>(() => [
    { value: ReportType.DAILY_OPERATIONS, label: t('types.daily_operations') },
    { value: ReportType.WEEKLY_PERFORMANCE, label: t('types.weekly_performance') },
    { value: ReportType.MONTHLY_SUMMARY, label: t('types.monthly_summary') },
    { value: ReportType.WORKER_PERFORMANCE, label: t('types.worker_performance') },
    { value: ReportType.AREA_STATUS, label: t('types.area_status') },
    { value: ReportType.OVERTIME_UTILIZATION, label: t('types.overtime_utilization') },
  ], [t]);

  // Create format options dynamically with translations
  const FORMAT_OPTIONS = useMemo<FormSelectOption[]>(() => [
    { value: ReportFormat.PDF, label: t('formats.pdf') },
    { value: ReportFormat.CSV, label: t('formats.csv') },
    { value: ReportFormat.XLSX, label: t('formats.xlsx') },
  ], [t]);

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
      toast({ level: 'warning', title: t('messages.validation') });
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
        title: t('messages.processing'),
        body: t('messages.processingNote'),
      });

      // Redirect to reports list after a short delay
      setTimeout(() => {
        router.push('/reports');
      }, 1000);
    } catch (err) {
      toast({ level: 'danger', title: t('messages.error') });
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-nb-body text-nb-gray-600">{t('common:actions.loading')}</p>
      </div>
    );
  }

  const showWorkerSelect = state.reportType === ReportType.WORKER_PERFORMANCE;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 max-w-2xl">
          <FormSelect
            label={t('builder.typeLabel')}
            options={REPORT_TYPE_OPTIONS}
            value={state.reportType}
            onChange={(value) => setState((s) => ({ ...s, reportType: value }))}
            placeholder={t('builder.typePlaceholder')}
          />

          <FormSelect
            label={t('builder.formatLabel')}
            options={FORMAT_OPTIONS}
            value={state.format}
            onChange={(value) => setState((s) => ({ ...s, format: value }))}
            placeholder={t('builder.formatPlaceholder')}
          />

          <Field label={t('builder.dateRangeLabel')}>
            {() => (
              <DateRangePicker
                showSteppers={false}
                value={{
                  from: state.startDate || new Date().toISOString().slice(0, 10),
                  to: state.endDate || new Date().toISOString().slice(0, 10),
                }}
                onChange={(r) => {
                  setState((s) => ({ ...s, startDate: r.from, endDate: r.to }));
                }}
              />
            )}
          </Field>

          <FormInput
            label={t('builder.areaLabel')}
            type="text"
            placeholder={t('builder.areaPlaceholder')}
            value={state.areaId}
            onChange={(e) => setState((s) => ({ ...s, areaId: e.target.value }))}
          />

          <FormInput
            label={t('builder.rayonLabel')}
            type="text"
            placeholder={t('builder.rayonPlaceholder')}
            value={state.rayonId}
            onChange={(e) => setState((s) => ({ ...s, rayonId: e.target.value }))}
          />

          {showWorkerSelect && (
            <FormInput
              label={t('builder.workerLabel')}
              type="text"
              placeholder={t('builder.workerPlaceholder')}
              value={state.workerId}
              onChange={(e) => setState((s) => ({ ...s, workerId: e.target.value }))}
            />
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
            >
              {t('builder.cancelButton')}
            </Button>
            <Button
              onClick={handleSubmit}
              loading={generateReportMutation.isPending}
              disabled={!state.reportType || !state.format}
            >
              {t('builder.submitButton')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <h3 className="text-nb-h3 font-semibold">{t('template.title')}</h3>
          {templatesLoading ? (
            <p className="text-nb-body text-nb-gray-600">{t('common:actions.loading')}</p>
          ) : state.reportType && templates ? (
            (() => {
              const selectedTemplate = templates.find(
                (t) => t.report_type === state.reportType
              );
              return selectedTemplate ? (
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">{t('template.nameLabel')}</span> {selectedTemplate.name}
                  </p>
                  {selectedTemplate.description && (
                    <p>
                      <span className="font-medium">{t('template.descriptionLabel')}</span> {selectedTemplate.description}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-nb-body-sm text-nb-gray-600">{t('template.notFound')}</p>
              );
            })()
          ) : (
            <p className="text-nb-body-sm text-nb-gray-600">{t('template.selectHint')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
