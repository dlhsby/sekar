'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  Button,
} from '@/components/ui';

interface TempPasswordDialogProps {
  /** The one-time password to show, or null when closed. */
  password: string | null;
  /** Optional label of who it's for (e.g. the username). */
  username?: string;
  onClose: () => void;
}

/**
 * One-time display of a generated temp password (create / reset). Shown once —
 * the value is never retrievable again; the user must change it on first login.
 */
export function TempPasswordDialog({ password, username, onClose }: TempPasswordDialogProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — user can still read/select the value */
    }
  };

  return (
    <Dialog open={!!password} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" aria-labelledby="temp-password-title">
        <DialogHeader>
          <DialogTitle id="temp-password-title">{t('admin:dialogs.tempPassword.title')}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-nb-body-sm text-nb-gray-700">
            {username ? (
              <>
                {t('admin:dialogs.tempPassword.messageWithUsername', { username }).split('<strong>').map((part, i) =>
                  i === 0 ? part : <strong key={i}>{part.split('</strong>')[0]}</strong>
                )}
              </>
            ) : (
              t('admin:dialogs.tempPassword.messageWithoutUsername')
            )}
          </p>
          <div className="flex items-center gap-2 rounded-nb-base border-2 border-nb-black bg-nb-gray-50 p-4">
            <code className="flex-1 select-all font-mono text-nb-body font-bold text-nb-black">
              {password}
            </code>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={copy}
              leftIcon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            >
              {copied ? t('admin:dialogs.tempPassword.copySuccess') : t('admin:dialogs.tempPassword.copyButton')}
            </Button>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" onClick={onClose}>
            {t('admin:shared.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
