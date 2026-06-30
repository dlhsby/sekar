'use client';

import { Button } from '@/components/ui';

interface RosterActionModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  loading?: boolean;
  submitDisabled?: boolean;
  children: React.ReactNode;
}

export function RosterActionModal({
  open,
  title,
  onClose,
  onSubmit,
  submitLabel,
  loading = false,
  submitDisabled = false,
  children,
}: RosterActionModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-nb-base border-2 border-nb-black bg-nb-white p-6 shadow-nb-lg">
        <h2 className="text-nb-h2 font-bold mb-4">{title}</h2>

        <div className="space-y-4">{children}</div>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={onClose}>
            Batalkan
          </Button>
          <Button onClick={onSubmit} loading={loading} disabled={submitDisabled}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
