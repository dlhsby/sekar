/**
 * Date Utilities
 * Helper functions for date formatting and calculations
 */

/**
 * Format date to YYYY-MM-DD
 * @param date - Date object or string
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date to readable format (e.g., "7 January 2026")
 * @param date - Date object or string
 * @returns Formatted date string
 */
export function formatDateLong(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format time to HH:MM
 * @param date - Date object or string
 * @returns Formatted time string
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return '--:--';
  }
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format datetime to readable format
 * @param date - Date object or string (or undefined/null)
 * @returns Formatted datetime string or '-' if invalid
 */
export function formatDateTime(date: Date | string | undefined | null): string {
  if (!date) {
    return '-';
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return '-';
  }
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Get relative time (e.g., "2 hours ago", "5 minutes ago")
 * @param date - Date object or string
 * @returns Relative time string
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'baru saja';
  }
  if (diffMin < 60) {
    return `${diffMin} menit yang lalu`;
  }
  if (diffHour < 24) {
    return `${diffHour} jam yang lalu`;
  }
  if (diffDay < 7) {
    return `${diffDay} hari yang lalu`;
  }
  return formatDate(d);
}

/**
 * Calculate duration between two dates
 * @param startDate - Start date
 * @param endDate - End date (defaults to now)
 * @returns Duration object
 */
export function calculateDuration(
  startDate: Date | string,
  endDate: Date | string = new Date(),
): {
  hours: number;
  minutes: number;
  totalMinutes: number;
  formatted: string;
} {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  const diffMs = end.getTime() - start.getTime();
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    hours,
    minutes,
    totalMinutes,
    formatted: formatHours(hours, minutes),
  };
}

/**
 * Format duration in hours
 * @param hours - Number of hours (can be decimal) OR integer hours
 * @param minutes - Optional minutes (if provided, hours is treated as integer)
 * @returns Formatted string
 */
export function formatHours(hours: number, minutes?: number): string {
  if (minutes !== undefined) {
    // Called with separate hours and minutes
    if (hours === 0 && minutes === 0) {
      return '0m';
    }
    if (hours === 0) {
      return `${minutes}m`;
    }
    if (minutes === 0) {
      return `${hours}j`;
    }
    return `${hours}j ${minutes}m`;
  }

  // Called with decimal hours
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) {
    return `${h} jam`;
  }
  return `${h} jam ${m} menit`;
}

/**
 * Check if date is today
 * @param date - Date object or string
 * @returns True if date is today
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return formatDate(d) === formatDate(today);
}

/**
 * Get start of day
 * @param date - Date object (defaults to today)
 * @returns Date at 00:00:00
 */
export function getStartOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day
 * @param date - Date object (defaults to today)
 * @returns Date at 23:59:59
 */
export function getEndOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Parse ISO date string
 * @param isoString - ISO date string
 * @returns Date object or null if invalid
 */
export function parseISODate(isoString: string): Date | null {
  try {
    const date = new Date(isoString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

