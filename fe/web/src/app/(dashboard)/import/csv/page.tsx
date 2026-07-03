/**
 * CSV Import wizard — IMP-CSV (Phase 4-5).
 *
 * Three steps: pick an entity + download the template + upload → review the
 * row-by-row validation preview → commit the valid rows. Invalid rows are shown
 * with their cell-level error and are never inserted.
 *
 * Access: admin_system, superadmin.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { redirect } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Download, Upload } from 'lucide-react';

import { Button, FormSelect, SectionCard, DataTable, Alert } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useAuth } from '@/lib/auth/hooks';
import { ADMIN_ROLES, hasRole } from '@/lib/constants/roles';
import { getErrorMessage } from '@/lib/api/client';
import {
  useValidateCsv,
  useConfirmCsvImport,
  downloadCsvTemplate,
  type CsvImportEntity,
  type CsvValidationResponse,
  type CsvCommitResponse,
  type ImportValidationError,
} from '@/lib/api/import';

function getEntityOptions(t: ReturnType<typeof useTranslation>['t']) {
  return [
    { value: 'users', label: t('csv.entities.users') },
    { value: 'areas', label: t('csv.entities.areas') },
  ];
}

export default function CsvImportPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!user || !hasRole(user.role, ADMIN_ROLES))) {
      redirect('/');
    }
  }, [user, loading]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-nb-gray-600">{t('common:actions.loading')}</p>
      </div>
    );
  }

  if (!hasRole(user.role, ADMIN_ROLES)) return null;

  return <CsvImportWizard />;
}

function CsvImportWizard() {
  const { t } = useTranslation(['import']);
  const [entity, setEntity] = useState<CsvImportEntity>('users');
  const [fileName, setFileName] = useState<string | null>(null);
  const [validation, setValidation] = useState<CsvValidationResponse | null>(null);
  const [result, setResult] = useState<CsvCommitResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateCsv = useValidateCsv();
  const confirmImport = useConfirmCsvImport();
  const entityOptions = getEntityOptions(t);

  const reset = () => {
    setValidation(null);
    setResult(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTemplate = async () => {
    try {
      await downloadCsvTemplate(entity);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || validateCsv.isPending) return;
    setFileName(file.name);
    setResult(null);
    setValidation(null);
    try {
      const response = await validateCsv.mutateAsync({ entity, file });
      setValidation(response);
      if (response.validCount === 0) {
        toast.warning('Tidak ada baris valid untuk diimpor.');
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleCommit = async () => {
    if (!validation?.sessionId) return;
    try {
      const response = await confirmImport.mutateAsync(validation.sessionId);
      setResult(response);
      toast.success(t('csv.resultSuccess', { imported: response.imported }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-5">
      <SectionCard title={t('csv.title')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            label={t('csv.entityLabel')}
            options={entityOptions}
            value={entity}
            onChange={(v) => {
              setEntity(v as CsvImportEntity);
              reset();
            }}
          />
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={handleTemplate}
              leftIcon={<Download className="h-4 w-4" />}
            >
              {t('csv.downloadTemplate')}
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="hidden"
            aria-label={t('csv.selectFileAriaLabel')}
          />
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            loading={validateCsv.isPending}
            leftIcon={<Upload className="h-4 w-4" />}
          >
            {fileName ?? t('csv.selectFileButton')}
          </Button>
        </div>
      </SectionCard>

      {validation && (
        <ValidationPreview
          validation={validation}
          committing={confirmImport.isPending}
          onCommit={handleCommit}
          done={!!result}
          t={t}
        />
      )}

      {result && <CommitResult result={result} onReset={reset} t={t} />}
    </div>
  );
}

function ValidationPreview({
  validation,
  committing,
  onCommit,
  done,
  t,
}: {
  validation: CsvValidationResponse;
  committing: boolean;
  onCommit: () => void;
  done: boolean;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const errorColumns: ColumnDef<ImportValidationError & Record<string, unknown>>[] = [
    {
      id: 'row',
      accessorKey: 'row',
      header: t('csv.errorColumns.row'),
      enableSorting: true,
      meta: { label: t('csv.errorColumns.row') },
    },
    {
      id: 'column',
      accessorKey: 'column',
      header: t('csv.errorColumns.column'),
      enableSorting: true,
      meta: { label: t('csv.errorColumns.column') },
    },
    {
      id: 'value',
      accessorKey: 'value',
      header: t('csv.errorColumns.value'),
      enableSorting: true,
      meta: { label: t('csv.errorColumns.value') },
    },
    {
      id: 'message',
      accessorKey: 'message',
      header: t('csv.errorColumns.message'),
      enableSorting: true,
      meta: { label: t('csv.errorColumns.message') },
    },
  ];

  return (
    <SectionCard
      title={t('csv.validationTitle')}
      meta={`${validation.validCount} ${t('csv.validLines')} · ${validation.errors.length} ${t('csv.errorCount')}`}
    >
      {validation.errors.length > 0 ? (
        <DataTable
          columns={errorColumns}
          data={validation.errors.map((e, i) => ({ ...e, _k: i }))}
          getRowId={(r) => String(r._k)}
          emptyTitle={t('csv.noErrors')}
        />
      ) : (
        <Alert tone="success">{t('csv.allValid')}</Alert>
      )}

      {!done && (
        <div className="mt-4">
          <Button onClick={onCommit} loading={committing} disabled={!validation.sessionId}>
            {t('csv.importButton', { count: validation.validCount })}
          </Button>
        </div>
      )}
    </SectionCard>
  );
}

function CommitResult({
  result,
  onReset,
  t,
}: {
  result: CsvCommitResponse;
  onReset: () => void;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  return (
    <SectionCard title={t('csv.resultTitle')}>
      <p className="text-nb-body">
        {t('csv.resultSuccess', { imported: result.imported })}
        {result.skipped > 0 ? ` ${t('csv.skipped', { count: result.skipped })}` : '.'}
      </p>
      {result.skippedReasons && result.skippedReasons.length > 0 && (
        <ul className="mt-3 list-inside list-disc text-nb-body-sm text-nb-gray-600">
          {result.skippedReasons.map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ul>
      )}
      <div className="mt-4">
        <Button variant="outline" onClick={onReset}>
          {t('csv.importAgain')}
        </Button>
      </div>
    </SectionCard>
  );
}
