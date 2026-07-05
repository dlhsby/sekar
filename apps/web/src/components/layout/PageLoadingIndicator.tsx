'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePathname } from 'next/navigation';

/**
 * Page Loading Indicator
 *
 * Shows a progress bar at the top of the page during navigation.
 * Inspired by YouTube/GitHub loading bars.
 */
export function PageLoadingIndicator() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Start loading animation (async to avoid cascading renders)
    const startTimer = setTimeout(() => {
      setLoading(true);
      setProgress(0);
    }, 0);

    // Simulate progress
    const timer1 = setTimeout(() => setProgress(30), 50);
    const timer2 = setTimeout(() => setProgress(60), 150);
    const timer3 = setTimeout(() => setProgress(90), 300);

    // Complete loading after a short delay
    const completeTimer = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 200);
    }, 500);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(completeTimer);
    };
  }, [pathname]);

  if (!loading && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 h-1 bg-nb-primary z-50 transition-all duration-200 ease-out"
      style={{
        width: `${progress}%`,
        opacity: loading ? 1 : 0,
      }}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={t("common:a11y.pageLoading")}
    />
  );
}
