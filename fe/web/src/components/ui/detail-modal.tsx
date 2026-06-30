'use client';

import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle, Button } from '@/components/ui';

export interface DetailModalRow {
  label: string;
  value: React.ReactNode;
}

export interface DetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  rows: DetailModalRow[];
}

/**
 * Read-only detail modal — displays structured key-value pairs in a definition
 * list format. Null/undefined/empty string values render as an em dash.
 * Used by datatable Lihat (view) actions across all pages.
 */
export function DetailModal({
  open,
  onOpenChange,
  title,
  rows,
}: DetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <dl className="space-y-4">
            {rows.map((row, idx) => (
              <div key={idx}>
                <dt className="text-nb-caption font-medium text-nb-gray-600">
                  {row.label}
                </dt>
                <dd className="text-nb-body text-nb-black">
                  {row.value == null || row.value === '' ? '—' : row.value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex gap-2">
            <Button
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Tutup
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
