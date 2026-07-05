/**
 * Unit Tests: cn utility
 * Tests className merging and Neo Brutalism helpers
 */

import { cn, nbShadowClass, nbFocusRing } from '../cn';

describe('cn utility', () => {
  it('should merge class names', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('should handle conditional classes', () => {
    expect(cn('px-4', { 'py-2': true, 'py-4': false })).toBe('px-4 py-2');
  });

  it('should merge conflicting Tailwind classes (later wins)', () => {
    const result = cn('px-4 px-6');
    expect(result).toBe('px-6');
  });

  it('should handle empty inputs', () => {
    expect(cn()).toBe('');
  });

  it('should handle arrays', () => {
    expect(cn(['px-4', 'py-2'])).toBe('px-4 py-2');
  });
});

describe('nbShadowClass', () => {
  it('should return default shadow when not pressed', () => {
    expect(nbShadowClass(false)).toBe('shadow-nb-md');
  });

  it('should return active shadow when pressed', () => {
    expect(nbShadowClass(true)).toBe('shadow-nb-active translate-x-0.5 translate-y-0.5');
  });

  it('should default to unpressed state', () => {
    expect(nbShadowClass()).toBe('shadow-nb-md');
  });
});

describe('nbFocusRing', () => {
  it('should export focus ring classes', () => {
    expect(nbFocusRing).toBe(
      'focus-visible:outline focus-visible:outline-4 focus-visible:outline-nb-primary/50 focus-visible:outline-offset-2'
    );
  });
});
