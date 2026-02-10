'use client';

import * as React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';

export interface DataTableColumn<T> {
  key: string;
  title?: string;
  header?: string; // Alias for title
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  cell?: (row: T) => React.ReactNode; // Alias for render
  width?: string;
  align?: 'left' | 'center' | 'right';
}

// Type alias for ColumnDef
export type ColumnDef<T> = DataTableColumn<T>;

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyText?: string;
  emptyMessage?: string; // Alias for emptyText
  selectable?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  rowKey?: keyof T;
  onRowClick?: (row: T) => void;
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

export function DataTable<T extends Record<string, unknown>>({
  columns: rawColumns,
  data,
  loading = false,
  emptyText,
  emptyMessage,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  onSort,
  rowKey = 'id' as keyof T,
  onRowClick,
  className,
}: DataTableProps<T>) {
  // Normalize columns to use `title` and `render`
  const columns = rawColumns.map((col) => ({
    ...col,
    title: col.title || col.header || col.key,
    render: col.render || (col.cell ? (_val: unknown, row: T) => col.cell!(row) : undefined),
  }));

  // Support both emptyText and emptyMessage
  const emptyStateText = emptyText || emptyMessage || 'No data available';
  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] =
    React.useState<SortDirection>(null);

  const handleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable) return;

    let newDirection: SortDirection = 'asc';

    if (sortColumn === column.key) {
      if (sortDirection === 'asc') newDirection = 'desc';
      else if (sortDirection === 'desc') newDirection = null;
    }

    setSortColumn(newDirection ? column.key : null);
    setSortDirection(newDirection);

    if (onSort && newDirection) {
      onSort(column.key, newDirection);
    }
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    const allIds = data.map((row) => String(row[rowKey]));
    const allSelected = allIds.every((id) => selectedRows.includes(id));

    onSelectionChange(allSelected ? [] : allIds);
  };

  const handleSelectRow = (id: string) => {
    if (!onSelectionChange) return;

    onSelectionChange(
      selectedRows.includes(id)
        ? selectedRows.filter((rowId) => rowId !== id)
        : [...selectedRows, id]
    );
  };

  const allSelected =
    data.length > 0 &&
    data.every((row) => selectedRows.includes(String(row[rowKey])));
  const someSelected = selectedRows.length > 0 && !allSelected;

  return (
    <div className={cn('border-2 border-nb-black rounded-nb-base shadow-nb-sm', className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-nb-gray-100 hover:bg-nb-gray-100">
            {selectable && (
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={handleSelectAll}
                  className="w-4 h-4 cursor-pointer"
                  aria-label="Select all rows"
                />
              </TableHead>
            )}

            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  column.sortable &&
                    'cursor-pointer hover:bg-nb-gray-200 transition-colors',
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right'
                )}
                style={{ width: column.width }}
                onClick={() => handleSort(column)}
                aria-sort={
                  column.sortable && sortColumn === column.key
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
              >
                <div
                  className={cn(
                    'flex items-center gap-2',
                    column.align === 'center' && 'justify-center',
                    column.align === 'right' && 'justify-end'
                  )}
                >
                  <span>{column.title}</span>
                  {column.sortable && (
                    <span className="flex-shrink-0">
                      {sortColumn === column.key ? (
                        sortDirection === 'asc' ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )
                      ) : (
                        <ChevronsUpDown className="w-4 h-4 opacity-30" />
                      )}
                    </span>
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {/* Loading state */}
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                {selectable && (
                  <TableCell>
                    <div className="w-4 h-4 bg-nb-gray-200 animate-pulse" />
                  </TableCell>
                )}
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    <div className="h-4 bg-nb-gray-200 animate-pulse rounded" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {/* Data rows */}
          {!loading &&
            data.map((row, rowIndex) => {
              const id = String(row[rowKey]);
              const isSelected = selectedRows.includes(id);
              const isEven = rowIndex % 2 === 0;

              return (
                <TableRow
                  key={id}
                  className={cn(
                    !isEven && 'bg-nb-gray-50',
                    onRowClick &&
                      'cursor-pointer hover:bg-nb-gray-100 transition-colors'
                  )}
                  onClick={() => onRowClick?.(row)}
                  data-state={isSelected ? 'selected' : undefined}
                >
                  {selectable && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectRow(id);
                        }}
                        className="w-4 h-4 cursor-pointer"
                        aria-label={`Select row ${id}`}
                      />
                    </TableCell>
                  )}

                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right'
                      )}
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : (row[column.key] as React.ReactNode)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}

          {/* Empty state */}
          {!loading && data.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="h-24 text-center text-nb-gray-600"
              >
                {emptyStateText}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

DataTable.displayName = 'DataTable';
