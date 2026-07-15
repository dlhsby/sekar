# Web Data Tables Specification

---

## Overview

Data table patterns using TanStack Table (React Table v8) for the SEKAR web dashboard.

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Table Library | TanStack Table v8 |
| UI Components | Shadcn/ui Table |
| Pagination | Server-side |
| Sorting | Server-side |
| Filtering | Server-side |

---

## Base Table Component

```typescript
// components/ui/data-table.tsx
'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  PaginationState,
  SortingState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTablePagination } from './data-table-pagination';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageCount: number;
  pagination: PaginationState;
  onPaginationChange: (pagination: PaginationState) => void;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  isLoading?: boolean;
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: (selection: Record<string, boolean>) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  isLoading,
  rowSelection,
  onRowSelectionChange,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      pagination,
      sorting,
      rowSelection,
    },
    onPaginationChange: (updater) => {
      const newState =
        typeof updater === 'function' ? updater(pagination) : updater;
      onPaginationChange(newState);
    },
    onSortingChange: (updater) => {
      if (onSortingChange) {
        const newState =
          typeof updater === 'function' ? updater(sorting || []) : updater;
        onSortingChange(newState);
      }
    },
    onRowSelectionChange: (updater) => {
      if (onRowSelectionChange) {
        const newState =
          typeof updater === 'function' ? updater(rowSelection || {}) : updater;
        onRowSelectionChange(newState);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center h-24">
                  <Spinner /> Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center h-24">
                  Tidak ada data
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
```

---

## Pagination Component

```typescript
// components/ui/data-table-pagination.tsx
import { Table } from '@tanstack/react-table';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground">
        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <span>
            {table.getFilteredSelectedRowModel().rows.length} dari{' '}
            {table.getFilteredRowModel().rows.length} baris dipilih.
          </span>
        )}
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Baris per halaman</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Halaman {table.getState().pagination.pageIndex + 1} dari{' '}
          {table.getPageCount()}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

## Sortable Header

```typescript
// components/ui/data-table-column-header.tsx
import { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      <span>{title}</span>
      {column.getIsSorted() === 'desc' ? (
        <ArrowDown className="ml-2 h-4 w-4" />
      ) : column.getIsSorted() === 'asc' ? (
        <ArrowUp className="ml-2 h-4 w-4" />
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4" />
      )}
    </Button>
  );
}
```

---

## Column Definitions

### Users Table Columns

```typescript
// components/users/columns.tsx
import { ColumnDef } from '@tanstack/react-table';
import { User } from '@/types';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { UserActions } from './user-actions';

export const userColumns: ColumnDef<User>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'username',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Username" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue('username')}</span>
    ),
  },
  {
    accessorKey: 'fullName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nama Lengkap" />
    ),
  },
  {
    accessorKey: 'role',
    header: 'Peran',
    cell: ({ row }) => {
      const role = row.getValue('role') as string;
      const variant =
        role === 'Admin'
          ? 'destructive'
          : role === 'Supervisor'
          ? 'default'
          : 'secondary';
      return <Badge variant={variant}>{role}</Badge>;
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'location.name',
    header: 'Lokasi',
    cell: ({ row }) => row.original.location?.name || '-',
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.getValue('isActive') ? 'success' : 'secondary'}>
        {row.getValue('isActive') ? 'Aktif' : 'Nonaktif'}
      </Badge>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => <UserActions user={row.original} />,
  },
];
```

### Reports Table Columns

```typescript
// components/reports/columns.tsx
export const reportColumns: ColumnDef<Report>[] = [
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tanggal" />
    ),
    cell: ({ row }) => format(new Date(row.getValue('createdAt')), 'dd MMM yyyy HH:mm'),
  },
  {
    accessorKey: 'submittedBy.fullName',
    header: 'Petugas',
  },
  {
    accessorKey: 'location.name',
    header: 'Lokasi',
  },
  {
    accessorKey: 'condition',
    header: 'Kondisi',
    cell: ({ row }) => {
      const condition = row.getValue('condition') as string;
      const colors = {
        Baik: 'bg-green-100 text-green-800',
        Cukup: 'bg-yellow-100 text-yellow-800',
        Buruk: 'bg-red-100 text-red-800',
      };
      return (
        <span className={cn('px-2 py-1 rounded text-sm', colors[condition])}>
          {condition}
        </span>
      );
    },
  },
  {
    accessorKey: 'photoUrls',
    header: 'Foto',
    cell: ({ row }) => {
      const photos = row.getValue('photoUrls') as string[];
      return photos?.length > 0 ? (
        <div className="flex -space-x-2">
          {photos.slice(0, 3).map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              className="h-8 w-8 rounded-full border-2 border-white object-cover"
            />
          ))}
          {photos.length > 3 && (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs">
              +{photos.length - 3}
            </span>
          )}
        </div>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <ReportActions report={row.original} />,
  },
];
```

---

## Complete Table Usage

```typescript
// app/(dashboard)/users/page.tsx
'use client';

import { useState } from 'react';
import { PaginationState, SortingState } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { userColumns } from '@/components/users/columns';
import { useUsers } from '@/lib/hooks/useUsers';
import { UsersToolbar } from '@/components/users/toolbar';

export default function UsersPage() {
  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Sorting state
  const [sorting, setSorting] = useState<SortingState>([]);

  // Filter state
  const [filters, setFilters] = useState({
    role: undefined,
    search: '',
  });

  // Row selection state
  const [rowSelection, setRowSelection] = useState({});

  // Fetch data with state
  const { data, isLoading } = useUsers({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    sortBy: sorting[0]?.id,
    sortOrder: sorting[0]?.desc ? 'DESC' : 'ASC',
    ...filters,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Users</h1>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      <UsersToolbar
        filters={filters}
        onFiltersChange={setFilters}
        selectedCount={Object.keys(rowSelection).length}
        onBulkDelete={() => handleBulkDelete(rowSelection)}
      />

      <DataTable
        columns={userColumns}
        data={data?.data || []}
        pageCount={data?.meta?.totalPages || 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={setSorting}
        isLoading={isLoading}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
      />
    </div>
  );
}
```

---

## Table Toolbar

### The primary create action — use `createAction`, not `actions` (2026-07-16)

`DataTable` takes a **`createAction`** prop for the page's `[+ Tambah X]` button:

```tsx
createAction={{
  label: t('admin:rayons.buttonAdd'),
  hidden: !isAdmin,          // permission gating lives HERE, not in a call-site ternary
  onClick: () => { setEditing(null); setFormOpen(true); },
}}
```

**Why a prop rather than passing your own `<Button>` through `actions`:** the
toolbar's filter / columns / refresh buttons already collapse to **icon-only
below `sm`** (`hidden sm:inline`). A hand-rolled create button didn't, so its
label made it wide enough to **wrap onto its own line on a phone** — every list
page stacked *search / tools / create* as three rows. Putting the rule in the
table means it holds for every page instead of being re-decided at 18 call sites.

The button itself is **`<CreateButton>`** (`components/ui/create-button.tsx`),
shared rather than inlined because a create action lives in two places:

- **the table toolbar** (via `createAction`) — the default for list pages;
- **`PageHeader.actions`** — for pages whose default view has no table. **Tugas
  is kanban-first**, so a toolbar button would simply vanish in kanban view;
  its create action stays in the masthead and uses `<CreateButton>` directly.

The label is kept as `aria-label` + `title`, so the icon-only form stays
announced and hoverable. `actions` remains as an escape hatch for bespoke
toolbar content.

### Toolbar rows

The toolbar is **two slots**, not one line:

- **Left slot** (`w-full` below `sm`, `sm:w-auto`) — search, plus any future
  left-hand tools. Full width on a phone puts it on a **row of its own**, so the
  right-hand group lands underneath rather than sharing the line: the search
  grows to full width when focused and would otherwise shove the buttons around,
  and the slot has to leave room for more than just search.
- **Right group** (`ml-auto`) — filter · columns · refresh · create.

From `sm` up both fit on one line, as before.

`CreateButton` is `size="sm"` (h-10) to match the filter/columns/refresh buttons
it sits beside — the default size is h-12 and stood a notch taller than its own
group.

### Coverage

**Every** create action goes through one of two paths — verified by sweeping all
18 pages that pass `actions`:

- **`createAction`** (9): activities, locations, overtime, plants,
  pruning-requests, rayons, regions, team-categories, users.
- **`<CreateButton>` in `PageHeader`** (3): tasks and reports/schedules (their
  default view is kanban / has no table toolbar), reports (create-by-navigation —
  the button is wrapped in a `<Link>`, so `onClick` is optional).

Found during the sweep: **`plants` passed `actions` twice on the same element**,
so JSX silently kept the last one and its area-picker Combobox had been dead.
Moving the button to `createAction` freed the slot and restored it.

**Jadwal** isn't a `DataTable` (it's a calendar) but follows the same shape by
hand: date nav → left slot (search) → right group (range select · Hari Libur ·
create). Its search previously sat *inside* the right cluster, furthest from the
edge it belongs on, and its Hari Libur control was a hand-rolled `<button>` with
its own size and border rather than the standard outline icon Button.

### Mobile cards

A card row is `flex` with a label `<dt>` and a value `<dd>`. Both need explicit
overflow handling: **a flex item defaults to `min-width: auto`**, so it refuses
to shrink below its content and one long unbroken value (a username like
`staff_kecamatan_karang_pilang_satu`) pushed the whole card past the viewport.
The value carries `min-w-0 break-words`; the label carries `shrink-0` so it
holds its width instead of being crushed.


```typescript
// components/users/toolbar.tsx
interface UsersToolbarProps {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
  selectedCount: number;
  onBulkDelete: () => void;
}

export function UsersToolbar({
  filters,
  onFiltersChange,
  selectedCount,
  onBulkDelete,
}: UsersToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Cari nama atau username..."
          value={filters.search}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value })
          }
          className="w-[250px]"
        />

        <Select
          value={filters.role || ''}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, role: value || undefined })
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Semua peran" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua peran</SelectItem>
            <SelectItem value="Worker">Petugas</SelectItem>
            <SelectItem value="Supervisor">Supervisor</SelectItem>
            <SelectItem value="Admin">Administrator</SelectItem>
          </SelectContent>
        </Select>

        {(filters.search || filters.role) && (
          <Button
            variant="ghost"
            onClick={() => onFiltersChange({ search: '', role: undefined })}
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {selectedCount} dipilih
          </span>
          <Button variant="destructive" size="sm" onClick={onBulkDelete}>
            <Trash className="mr-2 h-4 w-4" />
            Hapus
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

## Row Actions

```typescript
// components/users/user-actions.tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash, Eye, Key } from 'lucide-react';

interface UserActionsProps {
  user: User;
}

export function UserActions({ user }: UserActionsProps) {
  const router = useRouter();
  const deleteUser = useDeleteUser();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Aksi</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push(`/users/${user.id}`)}>
          <Eye className="mr-2 h-4 w-4" />
          Lihat Detail
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setEditModalOpen(true)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setResetPasswordOpen(true)}>
          <Key className="mr-2 h-4 w-4" />
          Reset Password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-600"
          onClick={() => {
            if (confirm('Yakin ingin menghapus user ini?')) {
              deleteUser.mutate(user.id);
            }
          }}
        >
          <Trash className="mr-2 h-4 w-4" />
          Hapus
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## Server-Side API Integration

```typescript
// lib/hooks/useUsers.ts
interface UseUsersParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  role?: string;
  search?: string;
}

export function useUsers(params: UseUsersParams) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', params.page.toString());
      searchParams.set('limit', params.limit.toString());
      if (params.sortBy) searchParams.set('sortBy', params.sortBy);
      if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
      if (params.role) searchParams.set('role', params.role);
      if (params.search) searchParams.set('search', params.search);

      const response = await apiClient.get(`/users?${searchParams}`);
      return response.data;
    },
    placeholderData: keepPreviousData, // Keep showing old data while fetching
  });
}
```

---

## Dependencies

```bash
npm install @tanstack/react-table
```

---

**Last Updated:** 2026-01-16
