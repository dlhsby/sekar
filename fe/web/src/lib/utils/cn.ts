import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper precedence
 * Combines clsx for conditional classes and tailwind-merge for deduplication
 *
 * @param inputs - Class names, objects, or arrays to merge
 * @returns Merged className string
 *
 * @example
 * cn('px-4 py-2', 'bg-blue-500') // 'px-4 py-2 bg-blue-500'
 * cn('px-4', { 'py-2': true, 'py-4': false }) // 'px-4 py-2'
 * cn('px-4 px-6') // 'px-6' (later takes precedence)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Helper to apply Neo Brutalism shadow with press animation
 * Used for interactive elements with shadow transitions
 *
 * @param pressed - Whether the element is in pressed state
 * @returns className string for shadow and transform
 *
 * @example
 * <button className={nbShadowClass(isPressed)}>Click me</button>
 */
export const nbShadowClass = (pressed: boolean = false) => {
  return pressed ? 'shadow-nb-active translate-x-0.5 translate-y-0.5' : 'shadow-nb-md';
};

/**
 * Helper for focus ring (keyboard navigation)
 * Consistent focus indicator across all interactive elements
 *
 * @returns className string for focus-visible outline
 *
 * @example
 * <button className={cn('px-4 py-2', nbFocusRing)}>Click me</button>
 */
export const nbFocusRing =
  'focus-visible:outline focus-visible:outline-4 focus-visible:outline-nb-primary/50 focus-visible:outline-offset-2';
