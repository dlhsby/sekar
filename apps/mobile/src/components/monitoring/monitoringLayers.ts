/**
 * Monitoring map layer definitions — the toggleable map layers surfaced in the
 * wrench "Tampilan" section (ToolsOverlay). Each key must gate real rendering:
 *   workers → useLiveUsersFiltering · plants → PlantOverlayLayer ·
 *   districts/areas → MapLayerContent boundary overlays.
 * (`overdue` is intentionally omitted — it gates nothing on mobile.)
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
  { key: 'districts', label: i18n.t('monitoring:layers.districts'), icon: 'map-marker-radius' },
  { key: 'areas', label: i18n.t('monitoring:layers.areas'), icon: 'vector-polygon' },
];
