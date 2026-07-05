'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  Badge,
} from '@/components/ui';

interface BulkCredential {
  username: string;
  phone_number?: string | null;
  temp_password: string;
}

interface FailedReset {
  id: string;
  reason: string;
}

interface BulkCredentialsDialogProps {
  /** Credentials list (or null when dialog is closed). */
  credentials: BulkCredential[] | null;
  /** Optional failed resets. */
  failed?: FailedReset[];
  onClose: () => void;
}

/**
 * Display bulk-generated credentials (from import or mass reset) with copy-all
 * and CSV download actions. Credentials are shown once — they are never retrievable again.
 */
export function BulkCredentialsDialog({ credentials, failed, onClose }: BulkCredentialsDialogProps) {
  const { t } = useTranslation(['admin', 'common']);
  const [copied, setCopied] = useState(false);

  const handleCopyAll = async () => {
    if (!credentials) return;
    try {
      const text = credentials.map((c) => `${c.username}\t${c.phone_number || ''}\t${c.temp_password}`).join('\n');
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleDownloadCsv = () => {
    if (!credentials) return;
    const csv = [
      ['username', 'phone_number', 'temp_password'],
      ...credentials.map((c) => [c.username, c.phone_number || '', c.temp_password]),
    ]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `credentials-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={!!credentials} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl" aria-labelledby="credentials-title">
        <DialogHeader>
          <DialogTitle id="credentials-title">{t('admin:users.bulkCredentialsTitle')}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-nb-body-sm text-nb-gray-700">{t('admin:users.credentialsHint')}</p>

          {/* Success table */}
          {credentials && credentials.length > 0 && (
            <div className="max-h-96 overflow-auto rounded-nb-base border-2 border-nb-black">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell className="font-bold">{t('admin:users.columnUsername')}</TableCell>
                    <TableCell className="font-bold">{t('admin:users.columnPhone')}</TableCell>
                    <TableCell className="font-bold">{t('admin:users.tempPassword')}</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {credentials.map((cred, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-nb-body-sm">{cred.username}</TableCell>
                      <TableCell className="text-nb-body-sm">{cred.phone_number || '—'}</TableCell>
                      <TableCell className="font-mono font-bold">{cred.temp_password}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Failures (if any) */}
          {failed && failed.length > 0 && (
            <div className="rounded-nb-base border-2 border-nb-danger bg-nb-danger-light/20 p-4">
              <p className="text-nb-body-sm font-bold text-nb-danger mb-2">
                {t('admin:users.failedCount', { count: failed.length })}
              </p>
              <ul className="text-nb-body-sm space-y-1">
                {failed.map((f, idx) => (
                  <li key={idx} className="text-nb-gray-700">
                    <span className="font-mono">{f.id}:</span> {f.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary */}
          {credentials && (
            <div className="flex gap-2 text-nb-body-sm">
              <Badge variant="secondary">
                {t('admin:users.resetCount', { count: credentials.length })}
              </Badge>
            </div>
          )}
        </DialogBody>
        <DialogFooter className="flex items-center gap-2">
          {credentials && credentials.length > 0 && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCopyAll}
                leftIcon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              >
                {copied ? t('admin:users.copySuccess') : t('admin:users.copyAll')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleDownloadCsv}
                leftIcon={<Download className="size-4" />}
              >
                {t('admin:users.downloadCsv')}
              </Button>
            </>
          )}
          <Button type="button" onClick={onClose}>
            {t('common:actions.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
