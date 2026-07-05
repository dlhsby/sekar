import { create } from 'zustand';

/**
 * UI State Interface
 * Manages global UI state for the dashboard
 *
 * Note: User state is now managed by AuthContext (see @/lib/auth/context.tsx)
 */
export interface UIState {
  /** Sidebar open state (desktop collapsible, mobile overlay) */
  sidebarOpen: boolean;
  /** Mobile menu open state */
  mobileMenuOpen: boolean;

  /** Toggle sidebar visibility */
  toggleSidebar: () => void;
  /** Toggle mobile menu visibility */
  toggleMobileMenu: () => void;
  /** Set sidebar state explicitly */
  setSidebarOpen: (open: boolean) => void;
  /** Close all menus/overlays */
  closeAllMenus: () => void;
}

/**
 * UI Store
 *
 * Zustand store for managing global UI state including:
 * - Sidebar visibility (responsive behavior)
 * - Mobile menu state
 *
 * @example
 * ```tsx
 * const { sidebarOpen, toggleSidebar } = useUIStore();
 *
 * <button onClick={toggleSidebar}>
 *   {sidebarOpen ? 'Close' : 'Open'} Sidebar
 * </button>
 * ```
 */
export const useUIStore = create<UIState>((set) => ({
  // Initial state
  sidebarOpen: true, // Desktop: open by default
  mobileMenuOpen: false,

  // Actions
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  closeAllMenus: () => set({ sidebarOpen: false, mobileMenuOpen: false }),
}));
