'use client';

import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui';
import type { ScheduleOccurrence } from '@/lib/api/schedule-events';

interface OccurrenceChipProps {
  occurrence: ScheduleOccurrence;
  isTeam?: boolean;
  teamName?: string;
  memberCount?: number;
  onClick?: () => void;
  className?: string;
  compact?: boolean;
}

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
}: OccurrenceChipProps) {
  const { t } = useTranslation();

  const shiftIndex = parseInt(occurrence.shift_definition.name?.match(/\d+/)?.[0] || '0', 10) - 1;
  const colors = SHIFT_COLORS[Math.min(shiftIndex, 3)] || SHIFT_COLORS[0];

  const displayName = isTeam && teamName ? `${teamName} (${memberCount || 0})` : occurrence.user.full_name;

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`w-full px-1.5 py-0.5 rounded-nb-sm text-xs font-medium truncate ${colors.bg} ${colors.text} hover:opacity-80 transition-opacity ${className}`}
        title={displayName}
      >
        {displayName}
        {occurrence.is_detached && <span className="ml-1">✎</span>}
      </button>
    );
  }

  return (
    <Badge
      onClick={onClick}
      className={`${colors.bg} ${colors.text} cursor-pointer border-none px-2 py-1 text-xs font-medium ${className}`}
      title={`${displayName} - ${occurrence.shift_definition.name}`}
    >
      <span className="truncate">{displayName}</span>
      {occurrence.is_detached && (
        <span className="ml-1 inline-block rounded bg-white/20 px-1 text-xs font-bold">
          ✎
        </span>
      )}
    </Badge>
  );
}
