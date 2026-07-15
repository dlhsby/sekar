'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface CreateButtonProps {
  label: string;
  /** Omit when the button is wrapped in a <Link> (create-by-navigation). */
  onClick?: () => void;
  /** Defaults to a Plus. */
  icon?: React.ReactNode;
  disabled?: boolean;
}

/**
 * The standard primary [+ Tambah X] action.
 *
 * Collapses to an icon below `sm` — the same rule the table's
 * filter/columns/refresh buttons already follow. Full-width labelled buttons
 * were the odd one out: on a phone the label pushed the button onto a line of
 * its own, so every list page stacked search / tools / create as three rows.
 * The label is kept as `aria-label` + `title`, so the icon-only form stays
 * announced and hoverable.
 *
 * Shared rather than inlined because a create action lives in two places: the
 * table toolbar (via `DataTable`'s `createAction`) for list pages, and the
 * `PageHeader` for pages whose default view has no table at all — Tugas is
 * kanban-first, so a header button is the only one that survives both views.
 */
export function CreateButton({ label, onClick, icon, disabled }: CreateButtonProps) {
  return (
    <Button
      // size="sm" (h-10), matching the toolbar's filter/columns/refresh buttons —
      // the default size is h-12 and stood a notch taller than the group it sits
      // in. Variant stays `default` so it reads as the primary action.
      size="sm"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {icon ?? <Plus className="h-4 w-4" aria-hidden />}
      <span className="ml-1.5 hidden sm:inline">{label}</span>
    </Button>
  );
}
