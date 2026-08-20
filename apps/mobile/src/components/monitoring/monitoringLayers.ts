/**
 * Monitoring map layer definitions — the rows in the wrench "Tampilan" sheet.
 *
 * Mirrors web's `lib/monitoring/layers.ts`: each geo tier offers the same four
 * INDEPENDENT facets (Batas / Isian / Marker / Nama), and personnel offers Petugas +
 * Tim. Any subset is valid, including none — Semua and Sembunyikan are
 * shortcuts over the set, not values in it.
 *
 * Two fixes ride along:
 *  - **Kawasan gains a row.** Mobile drilled THROUGH the kawasan tier while
 *    offering no way to show or hide it, because the boundary payload's
 *    `regions[]` had no field on the client and was discarded on arrival.
 *  - **`overdue` is gone.** It gated nothing and was already documented as
 *    inert; a control that does nothing is worse than no control.
 */

import i18n from '../../i18n/config';
import type { MonitoringV2VisibleLayers, MonitoringMode } from '../../store/slices/monitoringV2Slice';

/**
 * Monitoring modes (ADR-060), in display order. Mirrors web's `MODE_OPTIONS`;
 * labels resolve at render so a language change follows.
 */
export const MODE_OPTIONS: { value: MonitoringMode; labelKey: string }[] = [
  { value: 'drill', labelKey: 'monitoring:mode.drill' },
  { value: 'zoom', labelKey: 'monitoring:mode.zoom' },
  { value: 'viewport', labelKey: 'monitoring:mode.viewport' },
];

export interface LayerFacet {
  value: string;
  label: string;
}

export interface LayerRow {
  key: keyof MonitoringV2VisibleLayers;
  label: string;
  icon: string;
  /** Absent for the plain on/off rows (plants). */
  facets?: LayerFacet[];
}

const geoFacets = (): LayerFacet[] => [
  { value: 'boundary', label: i18n.t('monitoring:layers.facet.boundary') },
  { value: 'fill', label: i18n.t('monitoring:layers.facet.fill') },
  { value: 'marker', label: i18n.t('monitoring:layers.facet.marker') },
  { value: 'label', label: i18n.t('monitoring:layers.facet.label') },
];

/** Built lazily so the labels follow a language change. */
export const layerRows = (): LayerRow[] => [
  {
    key: 'district',
    label: i18n.t('monitoring:layers.districts'),
    icon: 'map-marker-radius',
    facets: geoFacets(),
  },
  {
    key: 'kawasan',
    label: i18n.t('monitoring:layers.kawasan'),
    icon: 'shape-outline',
    facets: geoFacets(),
  },
  {
    key: 'lokasi',
    label: i18n.t('monitoring:layers.areas'),
    icon: 'vector-polygon',
    facets: geoFacets(),
  },
  {
    key: 'personnel',
    label: i18n.t('monitoring:layers.personnel'),
    icon: 'account-hard-hat',
    facets: [
      { value: 'petugas', label: i18n.t('monitoring:layers.facet.petugas') },
      { value: 'tim', label: i18n.t('monitoring:layers.facet.tim') },
    ],
  },
  { key: 'plants', label: i18n.t('monitoring:layers.plants'), icon: 'tree' },
];
