/**
 * DateTimeValue — a date + time value for the attendance InfoTableRows.
 * The date is small/muted; the time is larger and emphasized (body-lg uses
 * Inter-Medium, which renders heavier than body on Android — a plain fontWeight
 * override would not, since NBText picks the font file by the variant's weight).
 */
import React from 'react';
import { NBText } from '../nb';
import { formatLongDate, formatTime } from '../../utils/dateUtils';

export interface DateTimeValueProps {
  /** Date/time source (ISO string or Date). */
  source: Date | string;
}

export function DateTimeValue({ source }: DateTimeValueProps): React.JSX.Element {
  return (
    <>
      <NBText variant="caption" color="gray600">{formatLongDate(source)}</NBText>
      <NBText variant="body-lg" color="black">{formatTime(source)}</NBText>
    </>
  );
}

export default DateTimeValue;
