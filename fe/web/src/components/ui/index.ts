/**
 * SEKAR Web Dashboard - UI Component Library
 * Neo Brutalism Design System
 *
 * Bold, high-contrast UI components with hard-edge shadows and 3px borders
 */

// Core Components
export { Button, buttonVariants, type ButtonProps } from './button';
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
  type CardProps,
} from './card';
export { Input, inputVariants, type InputProps } from './input';
export { Label } from './label';
export { Textarea, textareaVariants, type TextareaProps } from './textarea';
export { Badge, badgeVariants, type BadgeProps } from './badge';
export { StatusPill, statusPillVariants, type StatusPillProps } from './status-pill';
export { RoleAvatar, type RoleAvatarProps } from './role-avatar';
export { Tabs, type TabItem, type TabsProps } from './tabs';
export { Alert, alertVariants, type AlertProps } from './alert';

// Layout / composition primitives
export { PageHeader, type PageHeaderProps } from './page-header';
export { SectionCard, sectionCardVariants, type SectionCardProps } from './section-card';
export { KpiTile, KpiGrid, kpiTileVariants, type KpiTileProps, type KpiGridProps } from './kpi-tile';

// Notifications
export { NotificationBell, NotificationPanel, type NotificationPanelProps } from './notification-bell';

// Form Components
export { FormInput, type FormInputProps } from './form-input';
export { FormSelect, type FormSelectOption, type FormSelectProps } from './form-select';

// Select
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './select';

// Dialog
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog';

// Table
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './table';
export { DataTable, type DataTableColumn, type DataTableProps } from './data-table';

// Dropdown Menu
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './dropdown-menu';

// Navigation
export {
  Sidebar,
  SidebarTrigger,
  SidebarProvider,
  useSidebar,
  type SidebarItem,
  type SidebarProps,
} from './sidebar';

// Loading States
export {
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  skeletonVariants,
  type SkeletonProps,
} from './skeleton';

// Empty States
export { EmptyState, emptyStateVariants, type EmptyStateProps } from './empty-state';
