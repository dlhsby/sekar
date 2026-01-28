'use client';

import { useId, useState, useRef, useEffect } from 'react';
import { cn, nbFocusRing } from '@/lib/utils/cn';
import { ChevronDownIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface NBSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface NBSelectProps {
  /** Select label (required for accessibility) */
  label: string;
  /** Available options */
  options: NBSelectOption[];
  /** Selected value(s) */
  value?: string | string[];
  /** Change handler */
  onChange: (value: string | string[]) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Error message to display */
  error?: string;
  /** Helper text to display below select */
  helperText?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Enable search/filter */
  searchable?: boolean;
  /** Enable multi-select */
  multiple?: boolean;
  /** Custom className */
  className?: string;
  /** Required field */
  required?: boolean;
}

/**
 * Neo Brutalism Select Component
 *
 * Features:
 * - Custom styled dropdown (not native select)
 * - Search/filter option
 * - Multi-select support
 * - Keyboard navigation (Arrow keys, Enter, ESC)
 * - Accessible (ARIA labels, roles)
 * - WCAG 2.1 AA compliant
 *
 * @example
 * ```tsx
 * <NBSelect
 *   label="Status"
 *   options={[
 *     { value: 'active', label: 'Active' },
 *     { value: 'inactive', label: 'Inactive' }
 *   ]}
 *   value={status}
 *   onChange={setStatus}
 * />
 *
 * <NBSelect
 *   label="Tags"
 *   options={tagOptions}
 *   value={selectedTags}
 *   onChange={setSelectedTags}
 *   multiple
 *   searchable
 * />
 * ```
 */
export const NBSelect: React.FC<NBSelectProps> = ({
  label,
  options,
  value = '',
  onChange,
  placeholder = 'Select...',
  error,
  helperText,
  disabled = false,
  searchable = false,
  multiple = false,
  className,
  required = false,
}) => {
  const generatedId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalize value to array for easier handling
  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

  // Filter options based on search
  const filteredOptions = searchable
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  // Get display text
  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    if (multiple) {
      return `${selectedValues.length} selected`;
    }
    const selected = options.find((opt) => opt.value === selectedValues[0]);
    return selected?.label || placeholder;
  };

  // Handle option select
  const handleSelect = (optionValue: string) => {
    if (multiple) {
      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter((v) => v !== optionValue)
        : [...selectedValues, optionValue];
      onChange(newValues);
    } else {
      onChange(optionValue);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  // Handle remove (multi-select)
  const handleRemove = (optionValue: string) => {
    if (multiple) {
      onChange(selectedValues.filter((v) => v !== optionValue));
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        if (!isOpen) {
          setIsOpen(true);
          e.preventDefault();
        } else if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[focusedIndex].value);
          e.preventDefault();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Determine border color
  const borderColor = error ? 'border-nb-danger' : 'border-nb-black';

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Label */}
      <label htmlFor={generatedId} className="block text-sm font-semibold text-nb-black mb-1">
        {label}
        {required && <span className="text-nb-danger ml-1">*</span>}
      </label>

      {/* Selected values (multi-select) */}
      {multiple && selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedValues.map((val) => {
            const opt = options.find((o) => o.value === val);
            return opt ? (
              <span
                key={val}
                className="inline-flex items-center gap-1 px-2 py-1 bg-nb-primary text-nb-white text-sm font-medium border-2 border-nb-black"
              >
                {opt.label}
                <button
                  type="button"
                  onClick={() => handleRemove(val)}
                  className="hover:opacity-70"
                  aria-label={`Remove ${opt.label}`}
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </span>
            ) : null;
          })}
        </div>
      )}

      {/* Trigger button */}
      <button
        type="button"
        id={generatedId}
        className={cn(
          'w-full h-12 px-4 bg-nb-white border-3 shadow-nb-sm',
          'font-medium text-left flex items-center justify-between',
          'disabled:bg-nb-gray-100 disabled:shadow-none disabled:cursor-not-allowed',
          borderColor,
          nbFocusRing
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={generatedId}
      >
        <span className={selectedValues.length === 0 ? 'text-nb-gray-400' : ''}>
          {getDisplayText()}
        </span>
        <ChevronDownIcon
          className={cn('w-5 h-5 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-nb-white border-3 border-nb-black shadow-nb-lg max-h-60 overflow-hidden">
          {/* Search input */}
          {searchable && (
            <div className="p-2 border-b-2 border-nb-black">
              <input
                ref={inputRef}
                type="text"
                className="w-full px-3 py-2 border-2 border-nb-gray-300 focus:border-nb-primary focus:outline-none"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Options list */}
          <div className="overflow-y-auto max-h-52" role="listbox">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-nb-gray-600">No options found</div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = selectedValues.includes(option.value);
                const isFocused = index === focusedIndex;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      'w-full px-4 py-3 text-left text-sm font-medium flex items-center justify-between',
                      'border-b-2 border-nb-black last:border-b-0',
                      'hover:bg-nb-gray-100 transition-colors',
                      isFocused && 'bg-nb-gray-50',
                      isSelected && 'bg-nb-primary/10',
                      option.disabled && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    disabled={option.disabled}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span>{option.label}</span>
                    {isSelected && <CheckIcon className="w-5 h-5 text-nb-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-nb-danger font-medium" role="alert">
          {error}
        </p>
      )}

      {/* Helper text */}
      {!error && helperText && (
        <p className="mt-1 text-sm text-nb-gray-600">{helperText}</p>
      )}
    </div>
  );
};

NBSelect.displayName = 'NBSelect';
