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
import { toast } from 'sonner';
import { Download, Upload } from 'lucide-react';

import { Button, FormSelect, SectionCard, DataTable, Alert } from '@/components/ui';
import type { DataTableColumn } from '@/components/ui';
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

const ENTITY_OPTIONS = [
  { value: 'users', label: 'Pengguna' },
  { value: 'areas', label: 'Area' },
];

export default function CsvImportPage() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!user || !hasRole(user.role, ADMIN_ROLES))) {
      redirect('/');
    }
  }, [user, loading]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-nb-gray-600">Memuat…</p>
      </div>
    );
  }

  if (!hasRole(user.role, ADMIN_ROLES)) return null;

  return <CsvImportWizard />;
}

function CsvImportWizard() {
  const [entity, setEntity] = useState<CsvImportEntity>('users');
  const [fileName, setFileName] = useState<string | null>(null);
  const [validation, setValidation] = useState<CsvValidationResponse | null>(null);
  const [result, setResult] = useState<CsvCommitResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateCsv = useValidateCsv();
  const confirmImport = useConfirmCsvImport();

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
      toast.success(`Berhasil mengimpor ${response.imported} baris.`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-5">
      <SectionCard title="Impor CSV">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            label="Jenis Data"
            options={ENTITY_OPTIONS}
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
              Unduh Template
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
            aria-label="Pilih berkas CSV"
          />
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            loading={validateCsv.isPending}
            leftIcon={<Upload className="h-4 w-4" />}
          >
            {fileName ?? 'Pilih Berkas CSV'}
          </Button>
        </div>
      </SectionCard>

      {validation && (
        <ValidationPreview
          validation={validation}
          committing={confirmImport.isPending}
          onCommit={handleCommit}
          done={!!result}
        />
      )}

      {result && <CommitResult result={result} onReset={reset} />}
    </div>
  );
}

function ValidationPreview({
  validation,
  committing,
  onCommit,
  done,
}: {
  validation: CsvValidationResponse;
  committing: boolean;
  onCommit: () => void;
  done: boolean;
}) {
  const errorColumns: DataTableColumn<ImportValidationError & Record<string, unknown>>[] = [
    { key: 'row', title: 'Baris' },
    { key: 'column', title: 'Kolom' },
    { key: 'value', title: 'Nilai' },
    { key: 'message', title: 'Pesan' },
  ];

  return (
    <SectionCard
      title="Tinjau Validasi"
      meta={`${validation.validCount} baris valid · ${validation.errors.length} kesalahan`}
    >
      {validation.errors.length > 0 ? (
        <DataTable
          columns={errorColumns}
          data={validation.errors.map((e, i) => ({ ...e, _k: i }))}
          rowKey="_k"
          emptyMessage="Tidak ada kesalahan."
        />
      ) : (
        <Alert tone="success">Semua baris valid dan siap diimpor.</Alert>
      )}

      {!done && (
        <div className="mt-4">
          <Button onClick={onCommit} loading={committing} disabled={!validation.sessionId}>
            Impor {validation.validCount} Baris Valid
          </Button>
        </div>
      )}
    </SectionCard>
  );
}

function CommitResult({ result, onReset }: { result: CsvCommitResponse; onReset: () => void }) {
  return (
    <SectionCard title="Hasil Impor">
      <p className="text-nb-body">
        Berhasil mengimpor <strong>{result.imported}</strong> baris
        {result.skipped > 0 ? `, ${result.skipped} dilewati.` : '.'}
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
          Impor Lagi
        </Button>
      </div>
    </SectionCard>
  );
}
