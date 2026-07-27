'use client';

import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui';
import type { ScheduleOccurrence } from '@/lib/api/schedule-events';
import { occurrenceTone, PRESENCE_TONE_CLASS } from '@/lib/presence/tone';

interface OccurrenceChipProps {
  occurrence: ScheduleOccurrence;
  isTeam?: boolean;
  teamName?: string;
  memberCount?: number;
  onClick?: () => void;
  className?: string;
  compact?: boolean;
  hideProjectedAction?: boolean;
}

/**
 * The chip's FILL says which shift; a small dot says how the worker is doing.
 *
 * Colouring the whole chip by presence was the other option and it is worse: the
 * month and week views are read to answer "who is on shift 2", so shift identity
 * has to survive. Splitting the two axes also fixes the contradiction this chip
 * used to create — the day board rendered a presence bullet from
 * `occurrenceTone` while the same worker's chip here was coloured purely by
 * shift, so one person read differently depending on the view (ADR-050 wants one
 * reading everywhere).
 */
const SHIFT_COLORS: Record<number, { bg: string; text: string }> = {
  0: { bg: 'bg-nb-primary', text: 'text-white' },
  1: { bg: 'bg-nb-warning', text: 'text-white' },
  2: { bg: 'bg-nb-info', text: 'text-white' },
  3: { bg: 'bg-nb-danger', text: 'text-white' },
};

export function OccurrenceChip({
  occurrence,
  isTeam = false,
  teamName,
  memberCount,
  onClick,
  className = '',
  compact = false,
  hideProjectedAction = false,
}: OccurrenceChipProps) {
  const { t } = useTranslation();

  const shiftName = occurrence.shift_definition?.name ?? '';
  const shiftIndex = parseInt(shiftName.match(/\d+/)?.[0] || '0', 10) - 1;
  const colors = SHIFT_COLORS[Math.min(Math.max(shiftIndex, 0), 3)] || SHIFT_COLORS[0];

  const teamMarkerColor = occurrence.team_category?.marker_color;
  const displayName = isTeam && teamName ? `${teamName} (${memberCount || 0})` : occurrence.user.full_name;
  const isProjected = occurrence.is_projected ?? false;

  // Chips live inside clickable day cells — stop propagation so a chip click
  // never also fires the cell's "create on this day" handler.
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hideProjectedAction || !isProjected) {
      onClick?.();
    }
  };

  const projectedSuffix = isProjected ? ` (${t('schedules:calendar.projectedHint')})` : '';
  const projectedClass = isProjected ? 'opacity-60 border-dashed' : '';

  /**
   * A future row has no presence yet, and a grey dot on every one of them would
   * be noise on a month view. Only show the dot once there is something to say.
   */
  const showPresence = occurrence.lifecycle_state != null || occurrence.status !== 'planned';
  const tone = PRESENCE_TONE_CLASS[occurrenceTone(occurrence)];
  // A white ring keeps the dot legible on every shift fill (sage / amber / info
  // / danger) without hand-picking a per-fill colour.
  const presenceDot = showPresence ? (
    <span
      className={`mr-1 inline-block size-2 shrink-0 rounded-full ring-1 ring-white/80 ${tone.bg}`}
      aria-hidden
    />
  ) : null;

  if (compact) {
    return (
      <button
        onClick={handleClick}
        disabled={hideProjectedAction && isProjected}
        className={`w-full px-1.5 py-0.5 rounded-nb-sm text-xs font-medium truncate ${colors.bg} ${colors.text} hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ${projectedClass} ${className}`}
        title={`${displayName}${projectedSuffix}`}
      >
        {presenceDot}
        {displayName}
        {occurrence.is_detached && <span className="ml-1">✎</span>}
      </button>
    );
  }

  const borderStyle = teamMarkerColor ? { borderLeftColor: teamMarkerColor } : {};

  return (
    <Badge
      onClick={handleClick}
      className={`${colors.bg} ${colors.text} cursor-pointer border-2 border-nb-black px-2 py-1 text-xs font-medium ${projectedClass} ${className}`}
      title={`${displayName}${projectedSuffix} - ${shiftName}`}
      style={borderStyle}
    >
      {presenceDot}
      <span className="truncate">{displayName}</span>
      {occurrence.is_detached && (
        <span className="ml-1 inline-block rounded bg-white/20 px-1 text-xs font-bold">
          ✎
        </span>
      )}
    </Badge>
  );
}
