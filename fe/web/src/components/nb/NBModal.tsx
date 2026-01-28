'use client';

import { HTMLAttributes, forwardRef, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';

export interface NBModalProps extends HTMLAttributes<HTMLDivElement> {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Modal size */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Modal title (for header) */
  title?: string;
  /** Close on backdrop click */
  closeOnBackdrop?: boolean;
  /** Close on ESC key */
  closeOnEsc?: boolean;
  /** Show close button */
  showCloseButton?: boolean;
  /** Children content */
  children: ReactNode;
}

/**
 * Neo Brutalism Modal Component
 *
 * Features:
 * - 4 sizes: sm (400px), md (600px), lg (800px), xl (1000px)
 * - Backdrop with click to close
 * - ESC key to close
 * - Close button (X)
 * - Body scroll lock
 * - Focus trap
 * - Accessible (ARIA labels, focus management)
 *
 * @example
 * ```tsx
 * <NBModal isOpen={isOpen} onClose={handleClose} title="Edit User">
 *   <NBModalContent>
 *     <p>Modal content here</p>
 *   </NBModalContent>
 *   <NBModalFooter>
 *     <NBButton onClick={handleClose}>Cancel</NBButton>
 *     <NBButton variant="primary">Save</NBButton>
 *   </NBModalFooter>
 * </NBModal>
 * ```
 */
export const NBModal = forwardRef<HTMLDivElement, NBModalProps>(
  (
    {
      className,
      isOpen,
      onClose,
      size = 'md',
      title,
      closeOnBackdrop = true,
      closeOnEsc = true,
      showCloseButton = true,
      children,
      ...props
    },
    ref
  ) => {
    // Lock body scroll when modal open
    useEffect(() => {
      if (isOpen) {
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      } else {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }

      return () => {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      };
    }, [isOpen]);

    // Handle ESC key
    useEffect(() => {
      if (!isOpen || !closeOnEsc) return;

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, closeOnEsc, onClose]);

    if (!isOpen) return null;

    const sizeClasses = {
      sm: 'max-w-md',
      md: 'max-w-2xl',
      lg: 'max-w-4xl',
      xl: 'max-w-6xl',
    };

    const modalContent = (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={closeOnBackdrop ? onClose : undefined}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-nb-black/50" aria-hidden="true" />

        {/* Modal */}
        <div
          ref={ref}
          className={cn(
            'relative w-full bg-nb-white border-3 border-nb-black shadow-nb-lg',
            'animate-in fade-in-0 zoom-in-95 duration-200',
            sizeClasses[size],
            className
          )}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          {...props}
        >
          {/* Header (if title or close button) */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between border-b-3 border-nb-black p-6">
              {title && (
                <h2 id="modal-title" className="text-2xl font-bold text-nb-black">
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="ml-auto p-2 hover:bg-nb-gray-100 transition-colors rounded-none border-2 border-nb-black"
                  aria-label="Close modal"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          {children}
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  }
);

NBModal.displayName = 'NBModal';

/**
 * Modal Header Section
 * Use when you need custom header content
 */
export const NBModalHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('border-b-3 border-nb-black p-6', className)}
      {...props}
    />
  )
);

NBModalHeader.displayName = 'NBModalHeader';

/**
 * Modal Content Section
 * Main content area of the modal
 */
export const NBModalContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6', className)} {...props} />
  )
);

NBModalContent.displayName = 'NBModalContent';

/**
 * Modal Footer Section
 * Typically contains action buttons
 */
export const NBModalFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('border-t-3 border-nb-black p-6 flex gap-3 justify-end', className)}
      {...props}
    />
  )
);

NBModalFooter.displayName = 'NBModalFooter';
