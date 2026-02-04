/**
 * Unit Tests: UI Store
 * Tests Zustand store for sidebar and mobile menu state management
 */

import { useUIStore } from '../ui';
import { renderHook, act } from '@testing-library/react';

describe('UI Store', () => {
  afterEach(() => {
    // Reset store to initial state after each test
    act(() => {
      useUIStore.setState({
        sidebarOpen: true,
        mobileMenuOpen: false,
      });
    });
  });

  describe('initial state', () => {
    it('should have sidebar open by default', () => {
      const { result } = renderHook(() => useUIStore());

      expect(result.current.sidebarOpen).toBe(true);
    });

    it('should have mobile menu closed by default', () => {
      const { result } = renderHook(() => useUIStore());

      expect(result.current.mobileMenuOpen).toBe(false);
    });

    it('should provide all required actions', () => {
      const { result } = renderHook(() => useUIStore());

      expect(typeof result.current.toggleSidebar).toBe('function');
      expect(typeof result.current.toggleMobileMenu).toBe('function');
      expect(typeof result.current.setSidebarOpen).toBe('function');
      expect(typeof result.current.closeAllMenus).toBe('function');
    });
  });

  describe('toggleSidebar', () => {
    it('should toggle sidebar from open to closed', () => {
      const { result } = renderHook(() => useUIStore());

      expect(result.current.sidebarOpen).toBe(true);

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarOpen).toBe(false);
    });

    it('should toggle sidebar from closed to open', () => {
      const { result } = renderHook(() => useUIStore());

      // Close first
      act(() => {
        result.current.toggleSidebar();
      });
      expect(result.current.sidebarOpen).toBe(false);

      // Then toggle to open
      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarOpen).toBe(true);
    });

    it('should toggle multiple times correctly', () => {
      const { result } = renderHook(() => useUIStore());

      expect(result.current.sidebarOpen).toBe(true);

      act(() => {
        result.current.toggleSidebar(); // false
        result.current.toggleSidebar(); // true
        result.current.toggleSidebar(); // false
      });

      expect(result.current.sidebarOpen).toBe(false);
    });
  });

  describe('toggleMobileMenu', () => {
    it('should toggle mobile menu from closed to open', () => {
      const { result } = renderHook(() => useUIStore());

      expect(result.current.mobileMenuOpen).toBe(false);

      act(() => {
        result.current.toggleMobileMenu();
      });

      expect(result.current.mobileMenuOpen).toBe(true);
    });

    it('should toggle mobile menu from open to closed', () => {
      const { result } = renderHook(() => useUIStore());

      // Open first
      act(() => {
        result.current.toggleMobileMenu();
      });
      expect(result.current.mobileMenuOpen).toBe(true);

      // Then toggle to close
      act(() => {
        result.current.toggleMobileMenu();
      });

      expect(result.current.mobileMenuOpen).toBe(false);
    });

    it('should toggle multiple times correctly', () => {
      const { result } = renderHook(() => useUIStore());

      expect(result.current.mobileMenuOpen).toBe(false);

      act(() => {
        result.current.toggleMobileMenu(); // true
        result.current.toggleMobileMenu(); // false
        result.current.toggleMobileMenu(); // true
      });

      expect(result.current.mobileMenuOpen).toBe(true);
    });
  });

  describe('setSidebarOpen', () => {
    it('should set sidebar to open', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setSidebarOpen(false);
      });
      expect(result.current.sidebarOpen).toBe(false);

      act(() => {
        result.current.setSidebarOpen(true);
      });

      expect(result.current.sidebarOpen).toBe(true);
    });

    it('should set sidebar to closed', () => {
      const { result } = renderHook(() => useUIStore());

      expect(result.current.sidebarOpen).toBe(true);

      act(() => {
        result.current.setSidebarOpen(false);
      });

      expect(result.current.sidebarOpen).toBe(false);
    });

    it('should be idempotent', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setSidebarOpen(true);
        result.current.setSidebarOpen(true);
      });

      expect(result.current.sidebarOpen).toBe(true);
    });
  });

  describe('closeAllMenus', () => {
    it('should close both sidebar and mobile menu', () => {
      const { result } = renderHook(() => useUIStore());

      // Ensure both are open
      act(() => {
        result.current.setSidebarOpen(true);
        result.current.toggleMobileMenu(); // Open mobile menu
      });
      expect(result.current.sidebarOpen).toBe(true);
      expect(result.current.mobileMenuOpen).toBe(true);

      // Close all
      act(() => {
        result.current.closeAllMenus();
      });

      expect(result.current.sidebarOpen).toBe(false);
      expect(result.current.mobileMenuOpen).toBe(false);
    });

    it('should work when menus are already closed', () => {
      const { result } = renderHook(() => useUIStore());

      // Close both
      act(() => {
        result.current.setSidebarOpen(false);
        if (result.current.mobileMenuOpen) {
          result.current.toggleMobileMenu();
        }
      });

      // Close all again
      act(() => {
        result.current.closeAllMenus();
      });

      expect(result.current.sidebarOpen).toBe(false);
      expect(result.current.mobileMenuOpen).toBe(false);
    });

    it('should work when only sidebar is open', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setSidebarOpen(true);
      });
      expect(result.current.sidebarOpen).toBe(true);
      expect(result.current.mobileMenuOpen).toBe(false);

      act(() => {
        result.current.closeAllMenus();
      });

      expect(result.current.sidebarOpen).toBe(false);
      expect(result.current.mobileMenuOpen).toBe(false);
    });

    it('should work when only mobile menu is open', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setSidebarOpen(false);
        result.current.toggleMobileMenu();
      });
      expect(result.current.sidebarOpen).toBe(false);
      expect(result.current.mobileMenuOpen).toBe(true);

      act(() => {
        result.current.closeAllMenus();
      });

      expect(result.current.sidebarOpen).toBe(false);
      expect(result.current.mobileMenuOpen).toBe(false);
    });
  });

  describe('independent state management', () => {
    it('should manage sidebar and mobile menu independently', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.toggleSidebar(); // Close sidebar
      });
      expect(result.current.sidebarOpen).toBe(false);
      expect(result.current.mobileMenuOpen).toBe(false);

      act(() => {
        result.current.toggleMobileMenu(); // Open mobile menu
      });
      expect(result.current.sidebarOpen).toBe(false);
      expect(result.current.mobileMenuOpen).toBe(true);

      act(() => {
        result.current.toggleSidebar(); // Open sidebar
      });
      expect(result.current.sidebarOpen).toBe(true);
      expect(result.current.mobileMenuOpen).toBe(true);
    });
  });

  describe('concurrent access', () => {
    it('should maintain consistent state across multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useUIStore());
      const { result: result2 } = renderHook(() => useUIStore());

      // Initial state should be the same
      expect(result1.current.sidebarOpen).toBe(result2.current.sidebarOpen);
      expect(result1.current.mobileMenuOpen).toBe(result2.current.mobileMenuOpen);

      // Update through one hook
      act(() => {
        result1.current.toggleSidebar();
      });

      // Both hooks should reflect the change
      expect(result1.current.sidebarOpen).toBe(result2.current.sidebarOpen);
    });
  });
});
