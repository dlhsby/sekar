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
export { Checkbox, type CheckboxProps } from './checkbox';
export { Radio, type RadioProps } from './radio';
export { Switch } from './switch';
export { Field, type FieldProps, type FieldControlProps } from './field';
export { Badge, badgeVariants, type BadgeProps } from './badge';
export { StatusPill, statusPillVariants, type StatusPillProps } from './status-pill';
export { RoleAvatar, type RoleAvatarProps } from './role-avatar';
export { Avatar, AvatarGroup, avatarVariants, type AvatarProps, type AvatarGroupProps } from './avatar';
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

// Date / Time Pickers
export { Calendar, type CalendarProps } from './calendar';
export { DatePicker, type DatePickerProps } from './date-picker';
export {
  DateRangePicker,
  type DateRangePickerProps,
  type DateRangeValue,
} from './date-range-picker';
export { TimePicker, TimeList, TIME_OPTIONS, type TimePickerProps } from './time-picker';
export { DateTimePicker, type DateTimePickerProps } from './date-time-picker';

// Popover
export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent } from './popover';

// Tooltip
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip';

// Disclosure
export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from './accordion';

// Navigation
export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './breadcrumb';

// Feedback / structure primitives
export { Separator } from './separator';
export { Spinner, spinnerVariants, type SpinnerProps } from './spinner';
export { Progress, type ProgressProps } from './progress';

// Combobox
export { Combobox, type ComboboxProps, type ComboboxOption } from './combobox';

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
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog';
export { ConfirmDialog, type ConfirmDialogProps } from './confirm-dialog';
export { DetailModal, type DetailModalProps, type DetailModalRow } from './detail-modal';

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
export {
  DataTable,
  type DataTableProps,
  type DataTableRowAction,
  type ColumnDef,
} from './data-table';
export {
  ColumnFilter,
  filterFnForVariant,
  dateContainsFilterFn,
  type FilterVariant,
} from './column-filter';

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

// Toast
export {
  ToastProvider,
  useToast,
  type ToastLevel,
  type ToastOptions,
} from './toast';
