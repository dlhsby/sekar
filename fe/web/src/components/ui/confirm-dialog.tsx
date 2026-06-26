'use client';

import * as React from 'react';

import { Button, type ButtonProps } from './button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  /** Confirm button label. Default "Konfirmasi". */
  confirmLabel?: string;
  /** Cancel button label. Default "Batal". */
  cancelLabel?: string;
  /** Confirm button variant. Default "destructive". */
  variant?: ButtonProps['variant'];
  /** Spins the confirm button + disables both while the action runs. */
  loading?: boolean;
  /** Invoked when the user confirms. May be async. */
  onConfirm: () => void | Promise<void>;
  /** Extra content rendered in the body above the footer. */
  children?: React.ReactNode;
}

/**
 * ConfirmDialog — reusable confirm / destructive-action modal (Neo Brutalism).
 * Replaces bespoke delete modals: pass a title, description and `onConfirm`.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  variant = 'destructive',
  loading = false,
  onConfirm,
  children,
}: ConfirmDialogProps): React.JSX.Element {
  return (
    // Block dismissal (Escape / overlay) while the action is in flight, but keep
    // a real handler so Radix's controlled state never desyncs.
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!loading) onOpenChange(next);
      }}
    >
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children ? <DialogBody>{children}</DialogBody> : null}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button variant={variant} loading={loading} onClick={() => void onConfirm()}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
