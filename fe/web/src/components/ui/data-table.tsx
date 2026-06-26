'use client';

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  type Table as TanstackTable,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Filter,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils/cn';

import { Button } from './button';
import { ColumnFilter, type FilterVariant, filterFnForVariant } from './column-filter';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { EmptyState } from './empty-state';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Skeleton } from './skeleton';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

// Surface a human label per column for the column-toggle menu and mobile cards.
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    label?: string;
    /** Hidden on first render; user can reveal it via the column-toggle menu. */
    defaultHidden?: boolean;
    /** Column data type — selects the per-column filter control + filterFn. */
    filterVariant?: FilterVariant;
    /** Pin to the right edge (sticky) — e.g. an actions column. */
    pinRight?: boolean;
    /** Pin to the left edge (sticky) — e.g. a row-number column. */
    pinLeft?: boolean;
    /** Cell text alignment. */
    align?: 'left' | 'center' | 'right';
  }
}

const PAGE_SIZES = [10, 25, 50, 100] as const;

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  /** Global search box; omit to hide the toolbar search. */
  searchPlaceholder?: string;
  /** Column-toggle control. Defaults on. */
  enableColumnToggle?: boolean;
  /**
   * Client-side pagination + page-size selector. Defaults on. Set false when the
   * host page paginates server-side (renders all provided rows, no page bar).
   */
  enablePagination?: boolean;
  /** Empty-state action ([Buat Baru]). */
  emptyAction?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Extra toolbar content (filters) rendered between search and column-toggle. */
  toolbar?: React.ReactNode;
  /** Reload the grid's data; renders a refresh button after the column-toggle. */
  onRefresh?: () => void;
  /** Spins the refresh button while a reload is in flight. */
  refreshing?: boolean;
  /** Primary action(s) (e.g. [Buat Baru]) shown at the toolbar's right edge. */
  actions?: React.ReactNode;
  /** Row click handler (whole row). */
  onRowClick?: (row: TData) => void;
  /** Stable row id accessor (defaults to index). */
  getRowId?: (row: TData, index: number) => string;
  className?: string;
}

/** Debounce a changing value by `delay` ms. */
function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/**
 * Render the desktop table at md+ and stacked cards below. Renders exactly ONE
 * view (not both behind CSS) so the off-screen copy isn't in the a11y tree or
 * the DOM. Defaults to desktop on the server/first paint to avoid hydration
 * mismatch; flips after mount once `matchMedia` is available.
 */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = React.useState(true);
  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(min-width: 768px)');
    const update = (): void => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isDesktop;
}

function alignClass(align?: 'left' | 'center' | 'right'): string {
  return align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : '';
}

/**
 * DataTable — TanStack Table + Neo Brutalism styling with toolbar search (300ms
 * debounce), per-column filter, column-toggle, sortable headers, sticky pinned
 * columns, client pagination, and the full state matrix (loading / empty /
 * no-results / error). Collapses to stacked cards below md.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  error = false,
  onRetry,
  searchPlaceholder,
  enableColumnToggle = true,
  enablePagination = true,
  emptyAction,
  emptyTitle = 'Belum Ada Data',
  emptyDescription,
  toolbar,
  onRefresh,
  refreshing = false,
  actions,
  onRowClick,
  getRowId,
  className,
}: DataTableProps<TData, TValue>): React.JSX.Element {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(() => {
    const v: VisibilityState = {};
    for (const c of columns) {
      if (c.meta?.defaultHidden) {
        const cid = c.id ?? ('accessorKey' in c ? String(c.accessorKey) : undefined);
        if (cid) v[cid] = false;
      }
    }
    return v;
  });
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [pageSize, setPageSize] = React.useState<number>(PAGE_SIZES[0]);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [showFilters, setShowFilters] = React.useState(false);
  const [searchFocused, setSearchFocused] = React.useState(false);
  const isDesktop = useIsDesktop();

  // Assign each filterable column the filterFn matching its declared variant.
  const resolvedColumns = React.useMemo(
    () =>
      columns.map((c) => {
        const variant = c.meta?.filterVariant;
        // Assign the variant's filterFn unless the page set one explicitly. Text
        // columns get an explicit `includesString` so the column is filterable
        // even if TanStack's value-type inference can't pick a default.
        if (!variant || c.filterFn) return c;
        return { ...c, filterFn: filterFnForVariant<TData>(variant) };
      }),
    [columns]
  );

  const debouncedSearch = useDebounced(search, 300);
  React.useEffect(() => {
    setGlobalFilter(debouncedSearch);
    setPageIndex(0);
  }, [debouncedSearch]);
  React.useEffect(() => {
    setPageIndex(0);
  }, [columnFilters]);

  const table = useReactTable({
    data,
    columns: resolvedColumns,
    state: { sorting, columnFilters, columnVisibility, globalFilter },
    getRowId,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const allRows = table.getRowModel().rows;
  const totalRows = allRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(pageIndex, totalPages - 1);
  const pageRows = enablePagination
    ? allRows.slice(safePage * pageSize, safePage * pageSize + pageSize)
    : allRows;
  const hasSearch = searchPlaceholder !== undefined;
  const isFiltered = globalFilter.length > 0 || columnFilters.length > 0;

  const colCount = table.getVisibleLeafColumns().length || 1;
  const hasFilterableColumns = table.getAllColumns().some((c) => c.getCanFilter());
  const showToolbar =
    hasSearch ||
    Boolean(toolbar) ||
    enableColumnToggle ||
    Boolean(onRefresh) ||
    Boolean(actions) ||
    hasFilterableColumns;

  /** Sticky-pin classes for a pinned header/cell, with opaque NB backgrounds. */
  const pinClass = (
    meta: { pinLeft?: boolean; pinRight?: boolean } | undefined,
    bg: string
  ): string =>
    cn(
      (meta?.pinLeft || meta?.pinRight) && cn('sticky z-[5]', bg),
      meta?.pinLeft && 'left-0 border-r-2 border-nb-black',
      meta?.pinRight && 'right-0 border-l-2 border-nb-black'
    );

  return (
    <div className={cn('space-y-3', className)}>
      {showToolbar ? (
        <div className="flex flex-wrap items-center gap-2">
          {hasSearch ? (
            <div
              className={cn(
                'transition-[width] duration-200',
                searchFocused || search.length > 0 ? 'w-full sm:w-80' : 'w-12'
              )}
            >
              <Input
                size="sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder={searchPlaceholder}
                leftIcon={<Search className="h-4 w-4" aria-hidden />}
                aria-label="Cari"
                className="w-full"
              />
            </div>
          ) : null}
          {toolbar}
          {enableColumnToggle || actions || onRefresh || hasFilterableColumns ? (
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              {hasFilterableColumns ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters((v) => !v)}
                  aria-pressed={showFilters}
                  title={
                    columnFilters.length > 0
                      ? `${columnFilters.length} filter aktif`
                      : 'Filter per kolom'
                  }
                  className={cn(
                    (showFilters || columnFilters.length > 0) && 'bg-nb-info-light'
                  )}
                >
                  <Filter className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Filter</span>
                  {columnFilters.length > 0 ? (
                    <span
                      className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-nb-black bg-nb-warning px-1 text-xs font-bold tabular-nums text-nb-black"
                      aria-label={`${columnFilters.length} filter aktif`}
                    >
                      {columnFilters.length}
                    </span>
                  ) : null}
                </Button>
              ) : null}
              {hasFilterableColumns && columnFilters.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => table.resetColumnFilters()}
                  title="Hapus semua filter kolom"
                >
                  <X className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Hapus Filter</span>
                </Button>
              ) : null}
              {enableColumnToggle ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <SlidersHorizontal className="h-4 w-4" aria-hidden />
                      <span className="hidden sm:inline">Kolom</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Tampilkan kolom</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {table
                      .getAllColumns()
                      .filter((c) => c.getCanHide())
                      .map((column) => (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) => column.toggleVisibility(!!value)}
                          onSelect={(e) => e.preventDefault()}
                        >
                          {String(column.columnDef.meta?.label ?? column.id)}
                        </DropdownMenuCheckboxItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
              {onRefresh ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={refreshing}
                  aria-label="Muat ulang"
                  title="Muat ulang data"
                >
                  <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden />
                  <span className="hidden sm:inline">Muat Ulang</span>
                </Button>
              ) : null}
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Desktop table (md+) — own scroll wrapper so pinned columns stay sticky. */}
      {isDesktop ? (
      <div className="overflow-x-auto border-2 border-nb-black rounded-nb-base shadow-nb-sm">
        <table className="w-full caption-bottom text-sm">
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((header) => {
                  const sortable = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  const meta = header.column.columnDef.meta;
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        alignClass(meta?.align),
                        pinClass(meta, 'bg-nb-gray-100')
                      )}
                      aria-sort={
                        sorted === 'asc'
                          ? 'ascending'
                          : sorted === 'desc'
                            ? 'descending'
                            : sortable
                              ? 'none'
                              : undefined
                      }
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            'flex flex-col gap-1.5',
                            showFilters && header.column.getCanFilter() && 'gap-2 pb-2 pt-1'
                          )}
                        >
                          {sortable ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              title="Klik untuk mengurutkan · Shift+klik untuk beberapa kolom"
                              className="-ml-1 inline-flex w-fit items-center gap-1 rounded-nb-sm px-1 hover:text-nb-success-dark"
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {sorted === 'asc' ? (
                                <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                              ) : sorted === 'desc' ? (
                                <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                              ) : (
                                <ChevronsUpDown
                                  className="h-3.5 w-3.5 text-nb-gray-400"
                                  aria-hidden
                                />
                              )}
                              {sorted && sorting.length > 1 ? (
                                <span className="ml-0.5 rounded-nb-sm bg-nb-gray-200 px-1 text-xs tabular-nums text-nb-gray-700">
                                  {header.column.getSortIndex() + 1}
                                </span>
                              ) : null}
                            </button>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                          {showFilters && header.column.getCanFilter() ? (
                            <ColumnFilter
                              column={header.column}
                              label={String(meta?.label ?? header.column.id)}
                            />
                          ) : null}
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 10 }).map((_, r) => (
                <TableRow key={`sk-${r}`} className="hover:bg-transparent">
                  {Array.from({ length: colCount }).map((__, c) => (
                    <TableCell key={`sk-${r}-${c}`}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={colCount} className="border-r-0 p-4">
                  <EmptyState
                    variant="error"
                    action={onRetry ? { label: 'Coba Lagi', onClick: onRetry } : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : pageRows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={colCount} className="border-r-0 p-4">
                  {isFiltered ? (
                    <EmptyState variant="noResults" />
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <EmptyState
                        variant="noData"
                        title={emptyTitle}
                        description={emptyDescription}
                      />
                      {emptyAction}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row, idx) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(
                    'group',
                    idx % 2 === 1 && 'bg-nb-gray-50',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta;
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          alignClass(meta?.align),
                          pinClass(meta, idx % 2 === 1 ? 'bg-nb-gray-50' : 'bg-nb-white')
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </table>
      </div>
      ) : (
      /* Mobile cards (< md) */
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 6 }).map((_, r) => (
            <div key={`mc-${r}`} className="border-2 border-nb-black rounded-nb-base p-3 shadow-nb-sm">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </div>
          ))
        ) : error ? (
          <EmptyState
            variant="error"
            action={onRetry ? { label: 'Coba Lagi', onClick: onRetry } : undefined}
          />
        ) : pageRows.length === 0 ? (
          isFiltered ? (
            <EmptyState variant="noResults" />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <EmptyState variant="noData" title={emptyTitle} description={emptyDescription} />
              {emptyAction}
            </div>
          )
        ) : (
          pageRows.map((row) => (
            <div
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              className={cn(
                'border-2 border-nb-black rounded-nb-base bg-nb-white p-3 shadow-nb-sm',
                onRowClick && 'cursor-pointer'
              )}
            >
              <dl className="divide-y-2 divide-nb-gray-200">
                {row.getVisibleCells().map((cell) => (
                  <div
                    key={cell.id}
                    className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                  >
                    <dt className="text-nb-caption font-bold uppercase text-nb-gray-500">
                      {String(cell.column.columnDef.meta?.label ?? cell.column.id)}
                    </dt>
                    <dd className="text-right text-nb-body-sm text-nb-black">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))
        )}
      </div>
      )}

      {enablePagination && !loading && !error && totalRows > 0 ? (
        <DataTablePagination
          table={table}
          page={safePage}
          pageSize={pageSize}
          totalRows={totalRows}
          totalPages={totalPages}
          onPageChange={setPageIndex}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPageIndex(0);
          }}
        />
      ) : null}
    </div>
  );
}

interface PaginationBarProps<TData> {
  table: TanstackTable<TData>;
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

function DataTablePagination<TData>({
  page,
  pageSize,
  totalRows,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: PaginationBarProps<TData>): React.JSX.Element {
  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalRows);
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-nb-body-sm text-nb-gray-600">
        Menampilkan {from}–{to} dari {totalRows}
      </p>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 0}
            onClick={() => onPageChange(page - 1)}
          >
            Sebelumnya
          </Button>
          <span className="text-nb-body-sm text-nb-gray-600">
            Halaman {page + 1} dari {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => onPageChange(page + 1)}
          >
            Selanjutnya
          </Button>
        </div>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger className="h-10 w-[6.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s} / hlm
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Re-export the ColumnDef type so call sites can import it from the table module.
export type { ColumnDef } from '@tanstack/react-table';
