# Web Component Library

Component library specifications for SEKAR web dashboard (Phase 6).

## Overview

The web dashboard uses **React with TypeScript** and **Tailwind CSS** for styling. Components are designed using **shadcn/ui** primitives with custom styling to match SEKAR's design system.

---

## Component Library Stack

```bash
# UI Primitives
npm install @radix-ui/react-*
npm install tailwindcss
npm install class-variance-authority clsx tailwind-merge

# shadcn/ui components
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input table
```

---

## Core Components

### Button

Variants matching mobile design system.

```tsx
// components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary-600 text-white hover:bg-primary-700',
        secondary: 'bg-transparent text-primary-600 border border-primary-600 hover:bg-primary-50',
        outline: 'bg-transparent border border-gray-300 hover:bg-gray-50',
        ghost: 'bg-transparent hover:bg-gray-100',
        danger: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-11 px-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = ({ variant, size, loading, children, ...props }: ButtonProps) => {
  return (
    <button className={buttonVariants({ variant, size })} {...props}>
      {loading && <Spinner className="mr-2" />}
      {children}
    </button>
  );
};
```

### Card

Container for grouped content.

```tsx
// components/ui/card.tsx
export const Card = ({ children, className, ...props }: CardProps) => {
  return (
    <div
      className={cn('rounded-lg border border-gray-200 bg-white p-6 shadow-sm', className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className }: CardHeaderProps) => {
  return <div className={cn('mb-4 flex items-center justify-between', className)}>{children}</div>;
};

export const CardTitle = ({ children, className }: CardTitleProps) => {
  return <h3 className={cn('text-xl font-semibold text-gray-900', className)}>{children}</h3>;
};

export const CardContent = ({ children, className }: CardContentProps) => {
  return <div className={cn('text-gray-700', className)}>{children}</div>;
};
```

### Table

Data table with sorting and pagination.

```tsx
// components/ui/table.tsx
export const Table = ({ children, className }: TableProps) => {
  return (
    <div className="overflow-x-auto">
      <table className={cn('min-w-full divide-y divide-gray-200', className)}>
        {children}
      </table>
    </div>
  );
};

export const TableHeader = ({ children }: TableHeaderProps) => {
  return <thead className="bg-gray-50">{children}</thead>;
};

export const TableBody = ({ children }: TableBodyProps) => {
  return <tbody className="divide-y divide-gray-200 bg-white">{children}</tbody>;
};

export const TableRow = ({ children, className }: TableRowProps) => {
  return <tr className={cn('hover:bg-gray-50', className)}>{children}</tr>;
};

export const TableHead = ({ children, className }: TableHeadProps) => {
  return (
    <th
      className={cn(
        'px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500',
        className
      )}
    >
      {children}
    </th>
  );
};

export const TableCell = ({ children, className }: TableCellProps) => {
  return <td className={cn('whitespace-nowrap px-6 py-4 text-sm text-gray-900', className)}>{children}</td>;
};
```

### Badge

Status indicators and tags.

```tsx
// components/ui/badge.tsx
const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        error: 'bg-red-100 text-red-800',
        info: 'bg-blue-100 text-blue-800',
        default: 'bg-gray-100 text-gray-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export const Badge = ({ variant, children }: BadgeProps) => {
  return <span className={badgeVariants({ variant })}>{children}</span>;
};
```

---

## Domain-Specific Components

### WorkerStatusBadge

```tsx
// components/WorkerStatusBadge.tsx
interface WorkerStatusBadgeProps {
  status: 'online' | 'offline';
}

export const WorkerStatusBadge = ({ status }: WorkerStatusBadgeProps) => {
  return (
    <Badge variant={status === 'online' ? 'success' : 'default'}>
      <span className={cn('mr-1.5 h-2 w-2 rounded-full', {
        'bg-green-600': status === 'online',
        'bg-gray-400': status === 'offline',
      })} />
      {status === 'online' ? 'Online' : 'Offline'}
    </Badge>
  );
};
```

### AttendanceTable

```tsx
// components/AttendanceTable.tsx
interface AttendanceTableProps {
  data: AttendanceRecord[];
  onRowClick?: (record: AttendanceRecord) => void;
}

export const AttendanceTable = ({ data, onRowClick }: AttendanceTableProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nama</TableHead>
          <TableHead>Area</TableHead>
          <TableHead>Jam Masuk</TableHead>
          <TableHead>Jam Keluar</TableHead>
          <TableHead>Total Jam</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((record) => (
          <TableRow
            key={record.id}
            onClick={() => onRowClick?.(record)}
            className="cursor-pointer"
          >
            <TableCell className="font-medium">{record.worker_name}</TableCell>
            <TableCell>{record.area_name}</TableCell>
            <TableCell>{formatTime(record.clock_in_time)}</TableCell>
            <TableCell>{formatTime(record.clock_out_time)}</TableCell>
            <TableCell>{formatDuration(record.hours_worked)}</TableCell>
            <TableCell>
              <WorkerStatusBadge status={record.is_active ? 'online' : 'offline'} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

### ReportCard

```tsx
// components/ReportCard.tsx
interface ReportCardProps {
  report: Report;
  onClick?: () => void;
}

export const ReportCard = ({ report, onClick }: ReportCardProps) => {
  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={onClick}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{report.report_type}</CardTitle>
          <Badge variant={getReportTypeBadgeVariant(report.report_type)}>
            {formatReportType(report.report_type)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-2 text-sm text-gray-600">{report.notes}</p>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <MapPinIcon className="h-4 w-4" />
            {report.area_name}
          </span>
          <span className="flex items-center gap-1">
            <ClockIcon className="h-4 w-4" />
            {formatTimestamp(report.created_at)}
          </span>
        </div>
        {report.photo_url && (
          <img
            src={report.photo_url}
            alt="Report"
            className="mt-3 h-32 w-full rounded object-cover"
          />
        )}
      </CardContent>
    </Card>
  );
};
```

### MapComponent

```tsx
// components/MapComponent.tsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface MapComponentProps {
  workers: WorkerLocation[];
  center?: [number, number];
}

export const MapComponent = ({ workers, center = [-7.2756, 112.7138] }: MapComponentProps) => {
  return (
    <MapContainer center={center} zoom={13} className="h-full w-full">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {workers.map((worker) => (
        <Marker key={worker.id} position={[worker.gps_lat, worker.gps_lng]}>
          <Popup>
            <div>
              <p className="font-medium">{worker.name}</p>
              <p className="text-sm text-gray-600">{worker.area_name}</p>
              <p className="text-xs text-gray-500">
                Last update: {formatTimestamp(worker.last_ping_time)}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};
```

---

## Layout Components

### DashboardLayout

```tsx
// components/layout/DashboardLayout.tsx
export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
};
```

### Sidebar

```tsx
// components/layout/Sidebar.tsx
export const Sidebar = () => {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
    { href: '/workers', label: 'Pekerja', icon: UsersIcon },
    { href: '/reports', label: 'Laporan', icon: FileTextIcon },
    { href: '/attendance', label: 'Absensi', icon: ClipboardIcon },
    { href: '/map', label: 'Peta', icon: MapIcon },
  ];

  return (
    <aside className="w-64 border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <h1 className="text-xl font-bold text-primary-600">SEKAR</h1>
      </div>
      <nav className="p-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname === item.href
                ? 'bg-primary-50 text-primary-600'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
};
```

### Header

```tsx
// components/layout/Header.tsx
export const Header = () => {
  const { user } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex-1">
        <input
          type="search"
          placeholder="Cari pekerja, area, laporan..."
          className="w-full max-w-md rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>
      <div className="flex items-center gap-4">
        <button className="relative">
          <BellIcon className="h-6 w-6 text-gray-600" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            3
          </span>
        </button>
        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{user?.name}</span>
        </div>
      </div>
    </header>
  );
};
```

---

## Component Composition Patterns

### Empty State

```tsx
// components/EmptyState.tsx
export const EmptyState = ({ icon: Icon, title, description, action }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Icon className="mb-4 h-16 w-16 text-gray-400" />
      <h3 className="mb-2 text-lg font-medium text-gray-900">{title}</h3>
      <p className="mb-6 text-sm text-gray-600">{description}</p>
      {action}
    </div>
  );
};
```

### Loading Skeleton

```tsx
// components/SkeletonLoader.tsx
export const TableSkeleton = () => {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-12 w-1/4" />
          <Skeleton className="h-12 w-1/4" />
          <Skeleton className="h-12 w-1/4" />
          <Skeleton className="h-12 w-1/4" />
        </div>
      ))}
    </div>
  );
};

const Skeleton = ({ className }: SkeletonProps) => {
  return <div className={cn('animate-pulse rounded-md bg-gray-200', className)} />;
};
```

---

## Responsive Design

All components are responsive by default using Tailwind's breakpoint system:

```tsx
// Mobile-first responsive classes
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  {/* Cards */}
</div>

// Responsive table
<div className="overflow-x-auto md:overflow-visible">
  <Table />
</div>

// Mobile sidebar toggle
<button className="md:hidden">
  <MenuIcon />
</button>
```

---

## Accessibility

All components follow WCAG 2.1 AA standards:

- Semantic HTML elements
- ARIA labels and roles
- Keyboard navigation support
- Focus indicators
- Screen reader compatible

```tsx
// Accessible button
<button
  aria-label="Close dialog"
  aria-pressed={isPressed}
  aria-disabled={isDisabled}
>
  <XIcon />
</button>

// Accessible table
<table role="table">
  <thead role="rowgroup">
    <tr role="row">
      <th role="columnheader" scope="col">Name</th>
    </tr>
  </thead>
</table>
```

---

**Document Owner:** Web Developer
**Last Updated:** 2026-01-16
**Status:** Planned - Phase 6
**Dependencies:** `react`, `tailwindcss`, `@radix-ui/*`, `shadcn/ui`, `react-leaflet`
