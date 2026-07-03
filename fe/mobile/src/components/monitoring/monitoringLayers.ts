/**
 * Monitoring map layer definitions.
 *
 * The 5 toggleable map layers (Petugas / Tanaman / Jatuh Tempo / Batas Rayon /
 * Batas Area). Phase 4 M3 (CP2) inlined the toggles into the wrench filter
 * ("Tampilan Peta" multiselect) and retired the standalone MonitoringToggleSheet;
 * this constant is the surviving shared definition consumed by MonitoringFilterModal.
 */

import i18n from '../../i18n/config';
import type { MonitoringV2VisibleLayers } from '../../store/slices/monitoringV2Slice';

export interface LayerRow {
  key: keyof MonitoringV2VisibleLayers;
  label: string;
  icon: string;
}

export const LAYER_ROWS: LayerRow[] = [
  { key: 'workers', label: i18n.t('monitoring:layers.workers'), icon: 'account-hard-hat' },
  { key: 'plants', label: i18n.t('monitoring:layers.plants'), icon: 'tree' },
  { key: 'overdue', label: i18n.t('monitoring:layers.overdue'), icon: 'alert-circle' },
  { key: 'rayons', label: i18n.t('monitoring:layers.rayons'), icon: 'map-marker-radius' },
  { key: 'areas', label: i18n.t('monitoring:layers.areas'), icon: 'vector-polygon' },
];
