'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  Inbox,
  Search,
  WifiOff,
  AlertCircle,
  Wrench,
  Lock,
  FolderOpen,
  CheckCircle,
  SearchX,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { Button, type ButtonProps } from './button';

const emptyStateVariants = cva(
  'flex flex-col items-center justify-center p-8 text-center border-2 border-nb-black rounded-nb-base bg-nb-white shadow-nb-sm',
  {
    variants: {
      size: {
        sm: 'py-6 px-4',
        default: 'py-8 px-6',
        lg: 'py-12 px-8',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

type EmptyStateVariant =
  | 'noData'
  | 'noResults'
  | 'offline'
  | 'error'
  | 'maintenance'
  | 'noPermission'
  | 'emptyFolder'
  | 'allDone'
  | 'search';

const variantConfig: Record<
  EmptyStateVariant,
  { icon: LucideIcon; title: string; description: string }
> = {
  noData: {
    icon: Inbox,
    title: 'Belum Ada Data',
    description: 'Data akan muncul di sini setelah Anda menambahkannya.',
  },
  noResults: {
    icon: SearchX,
    title: 'Tidak Ditemukan',
    description: 'Tidak ada hasil yang cocok dengan pencarian Anda.',
  },
  offline: {
    icon: WifiOff,
    title: 'Tidak Ada Koneksi',
    description: 'Periksa koneksi internet Anda dan coba lagi.',
  },
  error: {
    icon: AlertCircle,
    title: 'Terjadi Kesalahan',
    description: 'Terjadi kesalahan saat memuat data. Silakan coba lagi.',
  },
  maintenance: {
    icon: Wrench,
    title: 'Dalam Perbaikan',
    description: 'Fitur ini sedang dalam perbaikan. Silakan coba lagi nanti.',
  },
  noPermission: {
    icon: Lock,
    title: 'Tidak Memiliki Akses',
    description: 'Anda tidak memiliki izin untuk mengakses halaman ini.',
  },
  emptyFolder: {
    icon: FolderOpen,
    title: 'Folder Kosong',
    description: 'Folder ini belum memiliki konten.',
  },
  allDone: {
    icon: CheckCircle,
    title: 'Semua Selesai',
    description: 'Tidak ada tugas yang perlu dikerjakan.',
  },
  search: {
    icon: Search,
    title: 'Mulai Pencarian',
    description: 'Ketik kata kunci untuk mencari data.',
  },
};

export interface EmptyStateProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof emptyStateVariants> {
  /**
   * Predefined variant with icon, title, and description
   */
  variant?: EmptyStateVariant;
  /**
   * Custom icon component
   */
  icon?: LucideIcon;
  /**
   * Custom title
   */
  title?: string;
  /**
   * Custom description
   */
  description?: string;
  /**
   * Primary action button
   */
  action?: {
    label: string;
    onClick: () => void;
    variant?: ButtonProps['variant'];
  };
  /**
   * Secondary action button
   */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      className,
      variant = 'noData',
      size,
      icon: CustomIcon,
      title: customTitle,
      description: customDescription,
      action,
      secondaryAction,
      ...props
    },
    ref
  ) => {
    const config = variantConfig[variant];
    const Icon = CustomIcon || config.icon;
    const title = customTitle || config.title;
    const description = customDescription || config.description;

    const iconColorClass = React.useMemo(() => {
      switch (variant) {
        case 'error':
          return 'text-nb-danger';
        case 'allDone':
          return 'text-nb-success';
        case 'offline':
        case 'maintenance':
          return 'text-nb-warning';
        default:
          return 'text-nb-gray-500';
      }
    }, [variant]);

    return (
      <div ref={ref} className={cn(emptyStateVariants({ size }), className)} {...props}>
        {/* Icon Container */}
        <div
          className={cn(
            'w-16 h-16 flex items-center justify-center border-2 border-nb-black rounded-nb-base bg-nb-gray-100 shadow-nb-sm mb-4',
            iconColorClass
          )}
        >
          <Icon className="w-8 h-8" strokeWidth={2} />
        </div>

        {/* Title */}
        <h3 className="text-nb-h3 text-nb-black mb-2">{title}</h3>

        {/* Description */}
        <p className="text-nb-gray-600 max-w-md mb-6">{description}</p>

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {action && (
              <Button variant={action.variant || 'default'} onClick={action.onClick}>
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button variant="outline" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }
);
EmptyState.displayName = 'EmptyState';

export { EmptyState, emptyStateVariants };
