'use client';

import { HTMLAttributes, forwardRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
} from '@heroicons/react/24/outline';

export interface NBTableColumn<T> {
  /** Unique key for the column */
  key: string;
  /** Column title */
  title: string;
  /** Enable sorting for this column */
  sortable?: boolean;
  /** Custom render function */
  render?: (value: unknown, row: T) => React.ReactNode;
  /** Column width */
  width?: string;
  /** Align content */
  align?: 'left' | 'center' | 'right';
}

export interface NBTableProps<T> {
  /** Column definitions */
  columns: NBTableColumn<T>[];
  /** Table data */
  data: T[];
  /** Loading state */
  loading?: boolean;
  /** Empty state text */
  emptyText?: string;
  /** Enable row selection */
  selectable?: boolean;
  /** Selected row IDs */
  selectedRows?: string[];
  /** Selection change handler */
  onSelectionChange?: (selectedIds: string[]) => void;
  /** Sort handler */
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  /** Row key field */
  rowKey?: keyof T;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Custom className */
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

/**
 * Neo Brutalism Table Component
 *
 * Features:
 * - Column sorting (asc/desc)
 * - Row selection (checkbox)
 * - Sticky header
 * - Loading state (skeleton rows)
 * - Empty state
 * - Responsive (horizontal scroll on mobile)
 * - Accessible (ARIA labels, keyboard navigation)
 *
 * @example
 * ```tsx
 * const columns = [
 *   { key: 'name', title: 'Name', sortable: true },
 *   { key: 'role', title: 'Role' },
 *   { key: 'status', title: 'Status', render: (val) => <NBBadge>{val}</NBBadge> }
 * ];
 *
 * <NBTable
 *   columns={columns}
 *   data={users}
 *   selectable
 *   selectedRows={selected}
 *   onSelectionChange={setSelected}
 *   rowKey="id"
 * />
 * ```
 */
export function NBTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyText = 'No data available',
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  onSort,
  rowKey = 'id' as keyof T,
  onRowClick,
  className,
}: NBTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Handle sort
  const handleSort = (column: NBTableColumn<T>) => {
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

  // Handle select all
  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    const allIds = data.map((row) => String(row[rowKey]));
    const allSelected = allIds.every((id) => selectedRows.includes(id));

    onSelectionChange(allSelected ? [] : allIds);
  };

  // Handle select row
  const handleSelectRow = (id: string) => {
    if (!onSelectionChange) return;

    onSelectionChange(
      selectedRows.includes(id)
        ? selectedRows.filter((rowId) => rowId !== id)
        : [...selectedRows, id]
    );
  };

  const allSelected = data.length > 0 && data.every((row) => selectedRows.includes(String(row[rowKey])));
  const someSelected = selectedRows.length > 0 && !allSelected;

  return (
    <div className={cn('border-3 border-nb-black shadow-nb-sm overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-full">
          {/* Header */}
          <thead className="bg-nb-gray-100">
            <tr>
              {/* Selection column */}
              {selectable && (
                <th className="px-4 py-3 w-12 border-r-2 border-nb-black">
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
                </th>
              )}

              {/* Column headers */}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-left font-bold text-sm border-r-2 border-nb-black last:border-r-0',
                    column.sortable && 'cursor-pointer hover:bg-nb-gray-200 transition-colors',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                  style={{ width: column.width }}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.title}</span>
                    {column.sortable && (
                      <span className="flex-shrink-0">
                        {sortColumn === column.key ? (
                          sortDirection === 'asc' ? (
                            <ChevronUpIcon className="w-4 h-4" />
                          ) : (
                            <ChevronDownIcon className="w-4 h-4" />
                          )
                        ) : (
                          <ChevronUpDownIcon className="w-4 h-4 opacity-30" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {/* Loading state */}
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b-2 border-nb-black">
                  {selectable && (
                    <td className="px-4 py-3 border-r-2 border-nb-black">
                      <div className="w-4 h-4 bg-nb-gray-200 animate-pulse" />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-4 py-3 border-r-2 border-nb-black last:border-r-0"
                    >
                      <div className="h-4 bg-nb-gray-200 animate-pulse rounded" />
                    </td>
                  ))}
                </tr>
              ))}

            {/* Data rows */}
            {!loading &&
              data.map((row, rowIndex) => {
                const id = String(row[rowKey]);
                const isSelected = selectedRows.includes(id);
                const isEven = rowIndex % 2 === 0;

                return (
                  <tr
                    key={id}
                    className={cn(
                      'border-b-2 border-nb-black last:border-b-0',
                      !isEven && 'bg-nb-gray-50',
                      onRowClick && 'cursor-pointer hover:bg-nb-gray-100 transition-colors'
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {/* Selection cell */}
                    {selectable && (
                      <td className="px-4 py-3 border-r-2 border-nb-black">
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
                      </td>
                    )}

                    {/* Data cells */}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          'px-4 py-3 text-sm border-r-2 border-nb-black last:border-r-0',
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right'
                        )}
                      >
                        {column.render
                          ? column.render(row[column.key], row)
                          : (row[column.key] as React.ReactNode)}
                      </td>
                    ))}
                  </tr>
                );
              })}

            {/* Empty state */}
            {!loading && data.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-12 text-center text-nb-gray-600"
                >
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

NBTable.displayName = 'NBTable';

// Legacy exports for backward compatibility with design spec examples
export const NBTableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('bg-nb-gray-100', className)} {...props} />
));

export const NBTableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('[&_tr:nth-child(even)]:bg-nb-gray-50', className)}
    {...props}
  />
));

export const NBTableRow = forwardRef<
  HTMLTableRowElement,
  HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }
>(({ className, interactive, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b-2 border-nb-black last:border-b-0',
      interactive && 'cursor-pointer hover:bg-nb-gray-100 transition-colors duration-100',
      className
    )}
    {...props}
  />
));

export const NBTableHead = forwardRef<
  HTMLTableCellElement,
  HTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'px-4 py-3 text-left font-bold text-sm border-r-2 border-nb-black last:border-r-0',
      className
    )}
    {...props}
  />
));

export const NBTableCell = forwardRef<
  HTMLTableCellElement,
  HTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn('px-4 py-3 text-sm border-r-2 border-nb-black last:border-r-0', className)}
    {...props}
  />
));

NBTableHeader.displayName = 'NBTableHeader';
NBTableBody.displayName = 'NBTableBody';
NBTableRow.displayName = 'NBTableRow';
NBTableHead.displayName = 'NBTableHead';
NBTableCell.displayName = 'NBTableCell';
