import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBModal } from '../nb/NBModal';
import { NBText } from '../nb/NBText';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
  nbShadows,
} from '../../constants/nbTokens';
import { formatDateTime } from '../../utils/dateUtils';
import { calculateDistance } from '../../utils/gpsUtils';
import type { Shift } from '../../types/models.types';

interface ShiftDetailModalProps {
  visible: boolean;
  onClose: () => void;
  shift: Shift | null;
}

export function ShiftDetailModal({ visible, onClose, shift }: ShiftDetailModalProps) {
  const { t: tAttendance } = useTranslation('attendance');
  const { t } = useTranslation();

  const locationStatus = React.useMemo(() => {
    if (
      !shift?.location?.gps_lat ||
      !shift?.location?.gps_lng ||
      shift.clock_in_gps_lat == null ||
      shift.clock_in_gps_lng == null
    ) {
      return { isInside: false, distance: 0 };
    }
    const distance = calculateDistance(
      shift.clock_in_gps_lat,
      shift.clock_in_gps_lng,
      shift.location.gps_lat,
      shift.location.gps_lng,
    );
    return { isInside: distance <= (shift.location.radius_meters ?? 100), distance };
  }, [shift]);

  const { isInside, distance } = locationStatus;

  return (
    <NBModal
      type="sheet"
      visible={visible}
      onClose={onClose}
      title={tAttendance('shiftDetail.title')}
      testID="shift-detail-modal"
    >
      {!shift ? (
        <View style={styles.empty}>
          <NBText variant="h3" color="gray600" style={styles.emptyText}>
            {t('shifts.noShiftActive')}
          </NBText>
        </View>
      ) : (
        <View>
          <InfoRow
            icon="map-marker"
            label={tAttendance('shiftDetail.location')}
            even
          >
            <NBText variant="body" color="black">{shift.location?.name || tAttendance('shifts.unknown')}</NBText>
            {!!shift.location?.address && (
              <NBText variant="caption" color="gray600">{shift.location.address}</NBText>
            )}
            {!!shift.location?.gps_lat && !!shift.location?.gps_lng && (
              <NBText variant="mono-sm" color="gray600">
                {`${Number(shift.location.gps_lat).toFixed(6)}, ${Number(shift.location.gps_lng).toFixed(6)}`}
              </NBText>
            )}
          </InfoRow>

          {!!shift.location?.locationType?.name && (
            <InfoRow icon="office-building" label={tAttendance('shiftDetail.areaType')}>
              <NBText variant="body" color="black">{shift.location.locationType.name}</NBText>
            </InfoRow>
          )}

          <InfoRow icon="clock-outline" label={tAttendance('shiftDetail.clockIn')} even>
            <NBText variant="body" color="black">{formatDateTime(shift.clock_in_time)}</NBText>
          </InfoRow>

          <InfoRow icon="crosshairs-gps" label={tAttendance('shiftDetail.gpsClockIn')}>
            <NBText variant="mono-sm" color="black">
              {shift.clock_in_gps_lat != null && shift.clock_in_gps_lng != null
                ? `${Number(shift.clock_in_gps_lat).toFixed(6)}, ${Number(shift.clock_in_gps_lng).toFixed(6)}`
                : 'N/A'}
            </NBText>
          </InfoRow>

          {/* Location validation */}
          <View
            style={[
              styles.validationSection,
              isInside ? styles.validationOk : styles.validationFail,
            ]}
          >
            <View
              style={[
                styles.accentBar,
                { backgroundColor: isInside ? nbColors.successDark : nbColors.dangerDark },
              ]}
            />
            <View style={styles.validationBody}>
              <View style={styles.validationRow}>
                <View
                  style={[
                    styles.validationIconBox,
                    {
                      backgroundColor: isInside
                        ? nbColors.successLight
                        : nbColors.dangerLight,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={isInside ? 'check-circle' : 'alert-circle'}
                    size={22}
                    color={isInside ? nbColors.successDark : nbColors.dangerDark}
                  />
                </View>
                <NBText variant="body" color="black" style={styles.validationLabel}>
                  {tAttendance('shiftDetail.validation')}
                </NBText>
                <View
                  style={[
                    styles.validationBadge,
                    { backgroundColor: isInside ? nbColors.successDark : nbColors.dangerDark },
                  ]}
                >
                  <NBText variant="caption" color="white">
                    {isInside ? tAttendance('shiftDetail.withinArea') : tAttendance('shiftDetail.outsideArea')}
                  </NBText>
                </View>
              </View>

              <View style={styles.metricsRow}>
                <MetricTile label={tAttendance('shiftDetail.distance')} value={`${Math.round(distance)}m`} />
                <MetricTile label={tAttendance('shiftDetail.radius')} value={`${shift.location?.radius_meters || 100}m`} />
              </View>
            </View>
          </View>
        </View>
      )}
    </NBModal>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  even,
  children,
}: {
  icon: string;
  label: string;
  even?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.row, even && styles.rowEven]}>
      <MaterialCommunityIcons
        name={icon}
        size={18}
        color={nbColors.gray700}
        style={styles.rowIcon}
      />
      <NBText variant="body-sm" color="gray600" style={styles.rowLabel}>
        {label}
      </NBText>
      <View style={styles.rowValue}>{children}</View>
    </View>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricTile}>
      <NBText variant="caption" color="gray600" style={styles.metricLabel}>
        {label.toUpperCase()}
      </NBText>
      <NBText variant="h3" color="black">{value}</NBText>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    paddingVertical: nbSpacing['2xl'],
  },
  emptyText: {
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.xs,
    borderBottomWidth: nbBorders.widthThin,
    borderBottomColor: nbColors.gray200,
    alignItems: 'flex-start',
  },
  rowEven: {
    backgroundColor: nbColors.gray50,
  },
  rowIcon: {
    marginRight: nbSpacing.sm,
    marginTop: 2,
  },
  rowLabel: {
    width: 100,
    flexShrink: 0,
    fontWeight: '600',
  },
  rowValue: {
    flex: 1,
  },
  // Validation section
  validationSection: {
    marginTop: nbSpacing.md,
    borderWidth: nbBorders.widthThick,
    borderRadius: nbRadius.base,
    overflow: 'hidden',
    flexDirection: 'row',
    ...nbShadows.sm,
  },
  validationOk: {
    backgroundColor: nbColors.successLight,
    borderColor: nbColors.successDark,
  },
  validationFail: {
    backgroundColor: nbColors.dangerLight,
    borderColor: nbColors.dangerDark,
  },
  accentBar: {
    width: 4,
  },
  validationBody: {
    flex: 1,
    padding: nbSpacing.sm,
  },
  validationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: nbSpacing.sm,
  },
  validationIconBox: {
    width: 36,
    height: 36,
    borderRadius: nbRadius.sm,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: nbSpacing.sm,
  },
  validationLabel: {
    flex: 1,
    fontWeight: '700',
  },
  validationBadge: {
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: 3,
    borderRadius: nbRadius.sm,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
  metricTile: {
    flex: 1,
    backgroundColor: nbColors.white,
    padding: nbSpacing.sm,
    borderRadius: nbRadius.sm,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    alignItems: 'center',
  },
  metricLabel: {
    letterSpacing: 0.5,
    marginBottom: 2,
  },
});
