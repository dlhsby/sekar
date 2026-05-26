/**
 * MonitoringToggleSheet Component
 * Phase 3 sub-phase 3-5: NB bottom sheet with layer visibility toggles.
 *
 * Each row shows an icon + Indonesian label + Switch. Toggling a row calls
 * `onToggleLayer(key)` — the parent updates Redux and the map re-renders.
 * Uses NBModal (Phase 3 M1-R) for consistent NB styling.
 */

import React from 'react';
import {
  View,
  Switch,
  StyleSheet,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBModal } from '../nb/NBModal';
import { NBText } from '../nb/NBText';
import {
  nbColors,
  nbSpacing,
  nbBorders,
} from '../../constants/nbTokens';
import type { MonitoringV2VisibleLayers } from '../../store/slices/monitoringV2Slice';

// ─── Layer definitions ────────────────────────────────────────────────────────

interface LayerRow {
  key: keyof MonitoringV2VisibleLayers;
  label: string;
  icon: string;
}

const LAYER_ROWS: LayerRow[] = [
  { key: 'workers', label: 'Petugas', icon: 'account-hard-hat' },
  { key: 'plants', label: 'Tanaman', icon: 'tree' },
  { key: 'overdue', label: 'Jatuh Tempo', icon: 'alert-circle' },
  { key: 'rayons', label: 'Batas Rayon', icon: 'map-marker-radius' },
  { key: 'areas', label: 'Batas Area', icon: 'vector-polygon' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MonitoringToggleSheetProps {
  visible: boolean;
  visibleLayers: MonitoringV2VisibleLayers;
  onToggleLayer: (layer: keyof MonitoringV2VisibleLayers) => void;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MonitoringToggleSheet({
  visible,
  visibleLayers,
  onToggleLayer,
  onClose,
}: MonitoringToggleSheetProps): React.JSX.Element {
  return (
    <NBModal
      visible={visible}
      onClose={onClose}
      title="Tampilan Peta"
      type="sheet"
      size="sm"
    >
      {LAYER_ROWS.map((row, idx) => (
        <LayerToggleRow
          key={row.key}
          icon={row.icon}
          label={row.label}
          enabled={visibleLayers[row.key]}
          onToggle={() => onToggleLayer(row.key)}
          isLast={idx === LAYER_ROWS.length - 1}
        />
      ))}
    </NBModal>
  );
}

// ─── LayerToggleRow sub-component ─────────────────────────────────────────────

interface LayerToggleRowProps {
  icon: string;
  label: string;
  enabled: boolean;
  onToggle: () => void;
  isLast: boolean;
}

function LayerToggleRow({
  icon,
  label,
  enabled,
  onToggle,
  isLast,
}: LayerToggleRowProps): React.JSX.Element {
  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <View style={styles.rowLeft}>
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={enabled ? nbColors.primary : nbColors.gray500}
          style={styles.rowIcon}
        />
        <NBText
          variant="body"
          color={enabled ? 'black' : 'gray500'}
          style={styles.rowLabel}
        >
          {label}
        </NBText>
      </View>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{
          false: nbColors.gray200,
          true: nbColors.primary,
        }}
        thumbColor={nbColors.white}
        accessibilityLabel={`${enabled ? 'Sembunyikan' : 'Tampilkan'} ${label}`}
        accessibilityRole="switch"
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: nbSpacing.sm,
    borderBottomWidth: nbBorders.widthThin,
    borderBottomColor: nbColors.gray200,
    minHeight: 48,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowIcon: {
    marginRight: nbSpacing.sm,
    width: 24,
  },
  rowLabel: {
    flex: 1,
  },
});
