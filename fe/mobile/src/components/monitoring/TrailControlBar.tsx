/**
 * TrailControlBar Component
 * Phase 2D Gap #6: Controls for location trail (date picker, shift filter, hide-others toggle).
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbBorderRadius,
  nbShadows,
} from '../../constants/nbTokens';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TrailControlBarProps {
  date: string;
  onDateChange: (date: string) => void;
  shiftId?: string;
  onShiftChange: (shiftId: string | undefined) => void;
  hideOthers: boolean;
  onHideOthersToggle: () => void;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getPreviousDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split('T')[0];
}

function getNextDay(dateStr: string): string | null {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  const next = d.toISOString().split('T')[0];
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return next <= today ? next : null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TrailControlBar({
  date,
  onDateChange,
  hideOthers,
  onHideOthersToggle,
  onClose,
}: TrailControlBarProps): React.JSX.Element {
  const nextDay = getNextDay(date);

  const handlePrevDay = useCallback(() => {
    onDateChange(getPreviousDay(date));
  }, [date, onDateChange]);

  const handleNextDay = useCallback(() => {
    if (nextDay) {
      onDateChange(nextDay);
    }
  }, [nextDay, onDateChange]);

  return (
    <View style={styles.container}>
      {/* Date navigation */}
      <View style={styles.dateRow}>
        <TouchableOpacity onPress={handlePrevDay} style={styles.navBtn}>
          <MaterialCommunityIcons name="chevron-left" size={18} color={nbColors.white} />
        </TouchableOpacity>
        <View style={styles.dateDisplay}>
          <MaterialCommunityIcons name="calendar" size={14} color={nbColors.white} />
          <Text style={styles.dateText}>{formatDisplayDate(date)}</Text>
        </View>
        <TouchableOpacity
          onPress={handleNextDay}
          style={[styles.navBtn, !nextDay && styles.navBtnDisabled]}
          disabled={!nextDay}
        >
          <MaterialCommunityIcons name="chevron-right" size={18} color={nbColors.white} />
        </TouchableOpacity>
      </View>

      {/* Controls row */}
      <View style={styles.controlsRow}>
        {/* Hide others toggle */}
        <TouchableOpacity
          onPress={onHideOthersToggle}
          style={[styles.toggleBtn, hideOthers && styles.toggleBtnActive]}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={hideOthers ? 'eye-off' : 'eye'}
            size={14}
            color={nbColors.white}
          />
          <Text style={styles.toggleText}>
            {hideOthers ? 'Tampilkan' : 'Sembunyikan'} lainnya
          </Text>
        </TouchableOpacity>

        {/* Close button */}
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeBtn}
          accessibilityLabel="Tutup trail"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="close" size={18} color={nbColors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.80)',
    paddingHorizontal: nbSpacing.md,
    paddingTop: nbSpacing.sm,
    paddingBottom: nbSpacing.sm,
    gap: nbSpacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: nbSpacing.sm,
  },
  navBtn: {
    padding: nbSpacing.xs,
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    color: nbColors.white,
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: nbSpacing.sm,
    borderRadius: nbBorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: nbColors.white,
  },
  toggleText: {
    color: nbColors.white,
    fontSize: nbTypography.fontSize.xs,
  },
  closeBtn: {
    padding: nbSpacing.xs,
  },
});
