'use client';

/**
 * Dashboard Loading State
 *
 * Loading skeleton displayed during page transitions within the dashboard.
 * Features:
 * - Skeleton placeholders for dashboard content
 * - Shimmer animation effect
 * - Matches dashboard layout structure
 * - Accessible (aria-busy, aria-label)
 */
import { useTranslation } from 'react-i18next';

export default function DashboardLoading() {
  const { t } = useTranslation();
  return (
    <div className="animate-pulse" aria-busy="true" aria-label={t("common:a11y.loadingDashboard")}>
      {/* Page title skeleton */}
      <div className="mb-6">
        <div className="h-10 w-64 bg-nb-gray-200 border-2 border-nb-black mb-2" />
        <div className="h-5 w-96 bg-nb-gray-100 border-2 border-nb-black" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-nb-white border-2 border-nb-black shadow-nb-sm p-6">
            <div className="h-6 w-24 bg-nb-gray-200 border-2 border-nb-black mb-3" />
            <div className="h-10 w-20 bg-nb-gray-300 border-2 border-nb-black" />
          </div>
        ))}
      </div>

      {/* Content card skeleton */}
      <div className="bg-nb-white border-2 border-nb-black shadow-nb-sm">
        {/* Card header */}
        <div className="border-b-3 border-nb-black p-6">
          <div className="h-8 w-48 bg-nb-gray-200 border-2 border-nb-black" />
        </div>

        {/* Card content */}
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="h-12 w-12 bg-nb-gray-200 border-2 border-nb-black flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-3/4 bg-nb-gray-200 border-2 border-nb-black" />
                <div className="h-4 w-1/2 bg-nb-gray-100 border-2 border-nb-black" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shimmer effect overlay */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        .animate-pulse {
          position: relative;
        }

        .animate-pulse::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.3) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
