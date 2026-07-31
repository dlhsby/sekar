/**
 * AttendanceShiftHeading — "which day, which shift", rendered identically on the
 * home hero, the Kehadiran hub and the Rekam Kehadiran page.
 *
 * The clock-in page used to state the same fact as a label/value table row
 * ("Jadwal Shift │ Tidak Ada Shift"), which read as a different fact from the
 * card's two-line heading. One component, one shape — so a worker moving between
 * the three surfaces sees the same sentence.
 *
 * `right` is the optional trailing affordance (e.g. "Ubah Shift"); it only
 * appears when the caller has something to offer.
 */
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { NBText } from '../nb';
import i18n from '../../i18n/config';
import { formatLongDate } from '../../utils/dateUtils';
import { nbColors, nbSpacing } from '../../constants/nbTokens';

export interface AttendanceShiftHeadingProps {
  /** Service day (YYYY-MM-DD) the heading describes. */
  date: string;
  /** Preformatted shift label, e.g. "Shift 1 · 06:00–15:00" or "Tidak Ada Shift". */
  shiftLabel: string;
  /**
   * Opens the shift picker. Rendered as the standard "Ubah Shift ✏️" link at the
   * far right of the shift line, mirroring "Clock In ✏️" on the record page.
   * Omit when there is nothing to choose between.
   */
  onChangeShift?: () => void;
  changeShiftTestID?: string;
  /**
   * Other shifts the worker is rostered to today, already formatted. Listed
   * under a "shift lain tersedia" note so a multi-shift worker sees every shift
   * they hold, not only the one their next punch would attribute to.
   */
  otherShifts?: string[];
  testID?: string;
}

export function AttendanceShiftHeading({
  date,
  shiftLabel,
  onChangeShift,
  changeShiftTestID,
  otherShifts,
  testID,
}: AttendanceShiftHeadingProps): React.JSX.Element {
  return (
    <View style={styles.root} testID={testID}>
      <NBText variant="body-sm" color="gray600">
        {formatLongDate(`${date}T00:00:00`)}
      </NBText>
      <View style={styles.shiftLine}>
        <NBText variant="body" color="black" style={styles.shiftLabel}>
          {shiftLabel}
        </NBText>
        {onChangeShift && (
          <TouchableOpacity
            onPress={onChangeShift}
            accessibilityRole="button"
            accessibilityLabel={i18n.t('attendance:clockInOut.changeShift')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID={changeShiftTestID}
            style={styles.changeShift}
          >
            <NBText variant="body-sm" color="primaryActive">
              {i18n.t('attendance:clockInOut.changeShift')}
            </NBText>
            <MaterialCommunityIcons name="pencil" size={14} color={nbColors.primaryActive} />
          </TouchableOpacity>
        )}
      </View>
      {!!otherShifts?.length && (
        <View style={styles.others}>
          <NBText variant="body-sm" color="warningDark">
            {i18n.t('attendance:clockInOut.otherShiftsAvailable')}
          </NBText>
          {otherShifts.map((label) => (
            <NBText key={label} variant="body-sm" color="warningDark">
              {label}
            </NBText>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: nbSpacing.xs },
  // Indented under the date: the shift is a detail OF that day, and the step
  // in makes the hierarchy readable without adding a label or a rule.
  shiftLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: nbSpacing.sm,
    paddingLeft: nbSpacing.sm,
  },
  changeShift: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shiftLabel: { flexShrink: 1 },
  // Deliberately NOT indented: these shifts sit outside the date above them,
  // so aligning them under it would imply they belong to that day.
  others: { gap: 2, marginTop: nbSpacing.sm },
});
