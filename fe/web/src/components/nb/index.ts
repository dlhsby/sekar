/**
 * Neo Brutalism Component Library
 * Phase 2D Web Dashboard
 *
 * Complete component library with 10 core components
 * All components follow Neo Brutalism design principles with:
 * - Bold 3px black borders
 * - Hard-edge shadows (4px, 6px, 8px)
 * - No rounded corners (except avatars)
 * - High contrast colors
 * - Press animations
 * - Full accessibility (WCAG 2.1 AA)
 */

// Button
export { NBButton } from './NBButton';
export type { NBButtonProps } from './NBButton';

// Card
export { NBCard, NBCardHeader, NBCardContent, NBCardFooter } from './NBCard';
export type { NBCardProps } from './NBCard';

// Input
export { NBInput } from './NBInput';
export type { NBInputProps } from './NBInput';

// Textarea
export { NBTextarea } from './NBTextarea';
export type { NBTextareaProps } from './NBTextarea';

// Select
export { NBSelect } from './NBSelect';
export type { NBSelectProps, NBSelectOption } from './NBSelect';

// Badge
export { NBBadge } from './NBBadge';
export type { NBBadgeProps } from './NBBadge';

// Table
export {
  NBTable,
  NBTableHeader,
  NBTableBody,
  NBTableRow,
  NBTableHead,
  NBTableCell,
} from './NBTable';
export type { NBTableProps, NBTableColumn } from './NBTable';

// Modal
export { NBModal, NBModalHeader, NBModalContent, NBModalFooter } from './NBModal';
export type { NBModalProps } from './NBModal';

// Sidebar
export { NBSidebar } from './NBSidebar';
export type { NBSidebarProps, NBSidebarItem } from './NBSidebar';

// Dropdown
export { NBDropdown, NBDropdownItem } from './NBDropdown';
export type { NBDropdownProps, NBDropdownItem as NBDropdownItemType } from './NBDropdown';
