'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { X, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface ResponsiveShellProps {
  children: ReactNode;
  /** The existing sidebar content */
  sidebar: ReactNode;
  /** Optional top bar content rendered in the mobile/tablet header */
  header?: ReactNode;
}

/**
 * Responsive layout shell
 *
 * Applies three breakpoint layouts to every dashboard page:
 *
 * - Desktop (≥1280px):  Full sidebar (256px), direct render
 * - Tablet (768–1279px): Icon-only rail (64px), expands to overlay on click
 * - Mobile (<768px):    Hidden sidebar; top hamburger bar; slide-in drawer
 *
 * Passes `data-mobile="true"` on the root element when viewport < 768px
 * so page content can apply mobile-specific hints via CSS attribute selectors.
 */
export function ResponsiveShell({ children, sidebar, header }: ResponsiveShellProps) {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [railExpanded, setRailExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    function measure() {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsTablet(w >= 768 && w < 1280);
    }

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Close drawer on escape key
  useEffect(() => {
    if (!drawerOpen) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDrawerOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [drawerOpen]);

  // Close rail expansion when route changes by resizing
  const handleOverlayClick = useCallback(() => {
    setDrawerOpen(false);
    setRailExpanded(false);
  }, []);

  const showOverlay = drawerOpen || railExpanded;

  return (
    <div
      className="min-h-screen flex bg-nb-background"
      data-mobile={isMobile ? 'true' : undefined}
    >
      {/* ── Desktop sidebar (≥1280px) ── */}
      <nav
        aria-label={t('components:responsiveShell.mainNavigationLabel')}
        className="hidden xl:flex xl:flex-col xl:w-64 xl:shrink-0 xl:border-r-2 xl:border-nb-black"
      >
        {sidebar}
      </nav>

      {/* ── Tablet rail (768–1279px) ── */}
      {isTablet && (
        <nav
          aria-label={t('components:responsiveShell.mainNavigationLabel')}
          className="hidden md:flex xl:hidden flex-col shrink-0 border-r-2 border-nb-black transition-all duration-200"
          style={{ width: railExpanded ? 256 : 64 }}
        >
          {/* Rail toggle button */}
          <button
            onClick={() => setRailExpanded((prev) => !prev)}
            className="flex items-center justify-center h-14 border-b-2 border-nb-black hover:bg-nb-gray-100 transition-colors"
            aria-expanded={railExpanded}
            aria-label={railExpanded ? t('common:actions.close') : t('common:actions.open')}
          >
            <Menu className="h-5 w-5 text-nb-black" aria-hidden="true" />
          </button>

          <div
            className="flex-1 overflow-y-auto overflow-x-hidden"
            style={{ minWidth: railExpanded ? 256 : 64 }}
          >
            {sidebar}
          </div>
        </nav>
      )}

      {/* ── Overlay (mobile drawer + tablet expanded rail) ── */}
      {showOverlay && (
        <div
          role="presentation"
          className="fixed inset-0 z-30 bg-black/50"
          onClick={handleOverlayClick}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile drawer (slides in from left) ── */}
      {isMobile && (
        <nav
          id="mobile-drawer"
          aria-label={t('components:responsiveShell.mainNavigationLabel')}
          aria-hidden={!drawerOpen}
          className="fixed inset-y-0 left-0 z-40 w-72 flex flex-col bg-nb-sidebar border-r-2 border-nb-black shadow-nb-lg transition-transform duration-300"
          style={{ transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)' }}
        >
          <div className="flex items-center justify-between h-14 px-4 border-b-2 border-nb-black shrink-0">
            <span className="text-nb-h3 font-bold text-white uppercase tracking-wide">SEKAR</span>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-1 rounded-nb-sm border border-white/30 text-white hover:bg-white/10"
              aria-label={t('common:actions.close')}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sidebar}
          </div>
        </nav>
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        {isMobile && (
          <header className="flex items-center gap-3 h-14 px-4 border-b-2 border-nb-black bg-nb-sidebar shrink-0">
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-1.5 rounded-nb-sm border border-white/30 text-white hover:bg-white/10"
              aria-label={t('common:actions.open')}
              aria-expanded={drawerOpen}
              aria-controls="mobile-drawer"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>

            <span className="text-nb-h3 font-bold text-white uppercase tracking-wide flex-1">
              SEKAR
            </span>

            {header && (
              <div className="flex items-center gap-2">
                {header}
              </div>
            )}
          </header>
        )}

        {/* Tablet top bar (rail is on the side but we still need a top bar for header content) */}
        {isTablet && header && (
          <header className="flex items-center h-14 px-4 border-b-2 border-nb-black bg-nb-sidebar shrink-0">
            {header}
          </header>
        )}

        {children}
      </div>
    </div>
  );
}
