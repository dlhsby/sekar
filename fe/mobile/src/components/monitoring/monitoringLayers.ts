/**
 * Monitoring map layer definitions.
 *
 * The 5 toggleable map layers (Petugas / Tanaman / Jatuh Tempo / Batas Rayon /
 * Batas Area). Phase 4 M3 (CP2) inlined the toggles into the wrench filter
 * ("Tampilan Peta" multiselect) and retired the standalone MonitoringToggleSheet;
 * this constant is the surviving shared definition consumed by MonitoringFilterModal.
 */

import type { MonitoringV2VisibleLayers } from '../../store/slices/monitoringV2Slice';

export interface LayerRow {
  key: keyof MonitoringV2VisibleLayers;
  label: string;
  icon: string;
}

export const LAYER_ROWS: LayerRow[] = [
  { key: 'workers', label: 'Petugas', icon: 'account-hard-hat' },
  { key: 'plants', label: 'Tanaman', icon: 'tree' },
  { key: 'overdue', label: 'Jatuh Tempo', icon: 'alert-circle' },
  { key: 'rayons', label: 'Batas Rayon', icon: 'map-marker-radius' },
  { key: 'areas', label: 'Batas Area', icon: 'vector-polygon' },
];
