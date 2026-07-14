'use client';

interface YearViewProps {
  year: number;
  /** WIB today, to highlight the current month. */
  today: Date;
  onSelectMonth: (monthIndex: number) => void;
  localeCode: string;
}

/**
 * Year overview — 12 clickable months that drill into the month view. Date
 * navigation lives in the toolbar's DateNav. Per-day coverage density is a
 * follow-up (needs an aggregate endpoint; the range API caps at 62 days).
 */
export function YearView({ year, today, onSelectMonth, localeCode }: YearViewProps) {
  const isThisYear = today.getFullYear() === year;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 12 }, (_, m) => {
        const label = new Date(year, m, 1).toLocaleDateString(localeCode, { month: 'long' });
        const isCurrent = isThisYear && today.getMonth() === m;
        return (
          <button
            key={m}
            type="button"
            onClick={() => onSelectMonth(m)}
            className={`rounded-nb-base border-2 border-nb-black bg-nb-white px-4 py-6 text-center text-nb-body font-bold shadow-nb-sm transition-colors hover:bg-nb-gray-50 ${
              isCurrent ? 'outline outline-[3px] outline-nb-primary' : ''
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
