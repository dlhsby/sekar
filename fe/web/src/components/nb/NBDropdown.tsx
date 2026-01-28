'use client';

import { HTMLAttributes, forwardRef, ReactNode, useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';

export interface NBDropdownItem {
  /** Unique item ID */
  id: string;
  /** Display label */
  label: string;
  /** Icon component */
  icon?: ReactNode;
  /** Click handler */
  onClick: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Danger variant (for destructive actions) */
  danger?: boolean;
  /** Show divider after this item */
  divider?: boolean;
}

export interface NBDropdownProps extends HTMLAttributes<HTMLDivElement> {
  /** Trigger element */
  trigger: ReactNode;
  /** Dropdown items */
  items: NBDropdownItem[];
  /** Dropdown position */
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
}

/**
 * Neo Brutalism Dropdown Component
 *
 * Features:
 * - Trigger button/element
 * - Dropdown menu with items
 * - Keyboard navigation (Arrow keys, Enter, ESC)
 * - Position control (4 positions)
 * - Icons in items
 * - Dividers between items
 * - Danger variant for destructive actions
 * - Click outside to close
 * - Accessible (ARIA labels, keyboard support)
 *
 * @example
 * ```tsx
 * const items = [
 *   { id: 'edit', label: 'Edit', icon: <PencilIcon />, onClick: handleEdit },
 *   { id: 'delete', label: 'Delete', onClick: handleDelete, danger: true, divider: true },
 * ];
 *
 * <NBDropdown
 *   trigger={<button>Actions</button>}
 *   items={items}
 *   position="bottom-right"
 * />
 * ```
 */
export const NBDropdown = forwardRef<HTMLDivElement, NBDropdownProps>(
  ({ className, trigger, items, position = 'bottom-left', ...props }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setFocusedIndex(-1);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isOpen]);

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'Escape':
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => {
            const nextIndex = prev + 1;
            // Skip disabled items
            for (let i = nextIndex; i < items.length; i++) {
              if (!items[i].disabled) return i;
            }
            return prev;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => {
            const nextIndex = prev - 1;
            // Skip disabled items
            for (let i = nextIndex; i >= 0; i--) {
              if (!items[i].disabled) return i;
            }
            return prev;
          });
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusedIndex >= 0 && !items[focusedIndex].disabled) {
            items[focusedIndex].onClick();
            setIsOpen(false);
            setFocusedIndex(-1);
          }
          break;
      }
    };

    const positionClasses = {
      'bottom-left': 'top-full mt-2 left-0',
      'bottom-right': 'top-full mt-2 right-0',
      'top-left': 'bottom-full mb-2 left-0',
      'top-right': 'bottom-full mb-2 right-0',
    };

    return (
      <div
        ref={dropdownRef}
        className={cn('relative inline-block', className)}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {/* Trigger */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          role="button"
          tabIndex={0}
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          {trigger}
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            className={cn(
              'absolute z-50 min-w-[200px]',
              'bg-nb-white border-3 border-nb-black shadow-nb-lg',
              'animate-in fade-in-0 zoom-in-95 duration-100',
              positionClasses[position]
            )}
            role="menu"
            aria-orientation="vertical"
          >
            {items.map((item, index) => (
              <div key={item.id}>
                <button
                  type="button"
                  className={cn(
                    'w-full px-4 py-3 text-left font-medium text-sm flex items-center gap-3',
                    'border-b-2 border-nb-black last:border-b-0',
                    'hover:bg-nb-gray-100 transition-colors duration-100',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-nb-primary focus-visible:outline-offset-[-2px]',
                    item.danger && 'text-nb-danger hover:bg-nb-danger/10',
                    item.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent',
                    focusedIndex === index && 'bg-nb-gray-50'
                  )}
                  onClick={() => {
                    if (!item.disabled) {
                      item.onClick();
                      setIsOpen(false);
                      setFocusedIndex(-1);
                    }
                  }}
                  disabled={item.disabled}
                  role="menuitem"
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  {item.icon && <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>}
                  <span className="flex-1">{item.label}</span>
                </button>
                {item.divider && !item.disabled && (
                  <div className="border-b-2 border-nb-black" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

NBDropdown.displayName = 'NBDropdown';

/**
 * Dropdown Item Component (for custom dropdown content)
 * Use this when you need more control over dropdown items
 */
export const NBDropdownItem = forwardRef<
  HTMLButtonElement,
  HTMLAttributes<HTMLButtonElement> & { destructive?: boolean; disabled?: boolean }
>(({ className, destructive, disabled, children, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      'w-full px-4 py-3 text-left font-medium text-sm',
      'border-b-2 border-nb-black last:border-b-0',
      'hover:bg-nb-gray-100 transition-colors duration-100',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-nb-primary',
      destructive && 'text-nb-danger hover:bg-nb-danger/10',
      disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent',
      className
    )}
    disabled={disabled}
    {...props}
  >
    {children}
  </button>
));

NBDropdownItem.displayName = 'NBDropdownItem';
