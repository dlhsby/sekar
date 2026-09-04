/**
 * One area row in the Wilayah list: what is here, and the three things you can
 * do about it.
 *
 * Tap the row to drill; the eye hides it; the ⓘ opens its detail. Mirrors web's
 * `AggregateNodeList` row so an operator moving between a phone and a desk reads
 * the same thing.
 *
 * Counts come from the SERVER over the full scope, so hiding a row changes what
 * is listed and never what is counted — see `hiddenEntities.ts`.
 */
import React, { memo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { NBText } from '../nb/NBText';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
import type { NodeMarker } from './NodeMarkerLayer';

export interface MonitoringNodeRowProps {
  node: NodeMarker;
  onDrill: (node: NodeMarker) => void;
  onDetail?: (node: NodeMarker) => void;
  onToggleHidden?: (id: string) => void;
  /** Shown when the level mixes tiers — kawasan and rayon-less lokasi are siblings. */
  showTier?: boolean;
}

/**
 * A count, muted when it is zero.
 *
 * A rayon's list runs to dozens of rows and most numbers on most rows are 0.
 * With every value bold, a screen of nothing-to-do looks exactly as loud as a
 * screen of problems and the eye has to read each figure to tell which. Zero is
 * the resting state, so it recedes — but only to `gray600`, which still clears
 * WCAG AA. "De-emphasised" is a contrast budget, not a licence to make text
 * invisible.
 */
function Count({ value, tone }: { value: number; tone: string }): React.JSX.Element {
  return (
    <NBText variant="caption" style={{ color: value > 0 ? tone : nbColors.gray600 }}>
      {String(value)}
    </NBText>
  );
}

function NodeRow({
  node,
  onDrill,
  onDetail,
  onToggleHidden,
  showTier = false,
}: MonitoringNodeRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const tierLabel =
    node.variant === 'district'
      ? t('monitoring:layers.districts')
      : node.variant === 'region'
        ? t('monitoring:layers.kawasan')
        : t('monitoring:layers.areas');

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.main}
        onPress={() => onDrill(node)}
        accessibilityRole="button"
        accessibilityLabel={node.name}
        testID={`node-row-${node.id}`}
      >
        <View style={styles.titleLine}>
          {showTier && (
            <View style={styles.tierChip}>
              <NBText variant="caption" color="gray600">{tierLabel}</NBText>
            </View>
          )}
          {/* `flex: 1` with `numberOfLines` is what keeps a long name from
              pushing the actions off the row — the same defect web hit with
              "Kawasan Manukan Balongsari S.D Manukan". */}
          <NBText variant="body-sm" numberOfLines={1} style={styles.name}>
            {node.name}
          </NBText>
        </View>
        <View style={styles.counts}>
          <Count value={node.scheduled} tone={nbColors.black} />
          <NBText variant="caption" color="gray600">{t('monitoring:aggregate.scheduledLabel')}</NBText>
          <Count value={node.clocked_in} tone={nbColors.statusActive} />
          <NBText variant="caption" color="gray600">{t('monitoring:aggregate.clockedInLabel')}</NBText>
          <Count value={node.belum_hadir} tone={nbColors.warning} />
          <NBText variant="caption" color="gray600">{t('monitoring:aggregate.belumHadirLabel')}</NBText>
          <Count value={node.tidak_hadir} tone={nbColors.dangerDark} />
          <NBText variant="caption" color="gray600">{t('monitoring:aggregate.tidakHadirLabel')}</NBText>
        </View>
      </TouchableOpacity>

      {onToggleHidden && (
        <TouchableOpacity
          style={styles.action}
          onPress={() => onToggleHidden(node.id)}
          accessibilityRole="button"
          accessibilityLabel={t('monitoring:hidden.hideLabel', { name: node.name })}
          testID={`node-hide-${node.id}`}
        >
          <MaterialCommunityIcons name="eye-off-outline" size={18} color={nbColors.gray600} />
        </TouchableOpacity>
      )}
      {onDetail && (
        <TouchableOpacity
          style={styles.action}
          onPress={() => onDetail(node)}
          accessibilityRole="button"
          accessibilityLabel={t('monitoring:aggregate.detailLabel', { name: node.name })}
          testID={`node-detail-${node.id}`}
        >
          <MaterialCommunityIcons name="information-outline" size={18} color={nbColors.gray600} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export const MonitoringNodeRow = memo(NodeRow);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' },
  // `minWidth: 0` is load-bearing: without it this refuses to shrink below its
  // content and a long name shoves the actions off the row instead of eliding.
  main: { flex: 1, minWidth: 0, paddingVertical: nbSpacing.sm, paddingHorizontal: nbSpacing.md },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: nbSpacing.xs },
  name: { flexShrink: 1, fontWeight: '700' },
  tierChip: {
    borderWidth: 1,
    borderColor: nbColors.gray300,
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  counts: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: nbSpacing.xs, marginTop: 2 },
  action: { justifyContent: 'center', paddingHorizontal: nbSpacing.md },
});
