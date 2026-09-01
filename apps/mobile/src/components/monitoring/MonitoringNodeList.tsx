/**
 * The Wilayah list — the children of where you are, one level down.
 *
 * The map's job is to SHOW what is here; this list's job is to let you go
 * somewhere. That is why it lists one level rather than the whole subtree: a
 * flattened rayon is hundreds of rows, which is not something anyone navigates.
 *
 * Hidden rows leave the list and nothing else. Every count on every remaining
 * row still includes them, because they come from the server over the full
 * scope — a list where hiding a row changed the numbers would be a list that
 * lies on request. The banner is the other half of that promise: it is always
 * visible that something is hidden, and one tap brings it back.
 */
import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NBText } from '../nb/NBText';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
import { MonitoringNodeRow } from './MonitoringNodeRow';
import type { NodeMarker } from './AggregateBubbleLayer';

export interface MonitoringNodeListProps {
  nodes: NodeMarker[];
  onDrill: (node: NodeMarker) => void;
  onDetail?: (node: NodeMarker) => void;
  isHidden?: (id: string) => boolean;
  onToggleHidden?: (id: string) => void;
  onShowAllHidden?: () => void;
}

export function MonitoringNodeList({
  nodes,
  onDrill,
  onDetail,
  isHidden,
  onToggleHidden,
  onShowAllHidden,
}: MonitoringNodeListProps): React.JSX.Element {
  const { t } = useTranslation();

  const visible = useMemo(
    () => (isHidden ? nodes.filter(n => !isHidden(n.id)) : nodes),
    [nodes, isHidden],
  );
  const hiddenCount = nodes.length - visible.length;

  /**
   * Tier chips appear only when the level actually MIXES tiers — which happens
   * at rayon scope, where kawasan and rayon-less lokasi are siblings. Derived
   * rather than passed, so it cannot disagree with what is on screen.
   */
  const showTier = useMemo(() => new Set(visible.map(n => n.variant)).size > 1, [visible]);

  if (nodes.length === 0) {
    return (
      <View style={styles.empty}>
        <NBText variant="body-sm" color="gray500" align="center">
          {t('monitoring:sidebar.noNodes')}
        </NBText>
      </View>
    );
  }

  return (
    <View testID="monitoring-node-list">
      {hiddenCount > 0 && onShowAllHidden && (
        <View style={styles.banner}>
          <NBText variant="caption" color="gray600">
            {t('monitoring:hidden.count', { count: hiddenCount })}
          </NBText>
          <TouchableOpacity
            onPress={onShowAllHidden}
            accessibilityRole="button"
            testID="restore-hidden-nodes"
          >
            <NBText variant="caption" color="black">{t('monitoring:hidden.showAll')}</NBText>
          </TouchableOpacity>
        </View>
      )}
      {visible.map(node => (
        <View key={node.id} style={styles.separator}>
          <MonitoringNodeRow
            node={node}
            onDrill={onDrill}
            onDetail={onDetail}
            onToggleHidden={onToggleHidden}
            showTier={showTier}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: nbSpacing.xs,
    paddingHorizontal: nbSpacing.md,
    backgroundColor: nbColors.gray50,
  },
  separator: { borderBottomWidth: 1, borderBottomColor: nbColors.gray100 },
  empty: { padding: nbSpacing.lg },
});
