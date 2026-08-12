/**
 * Monitoring map layer definitions — the rows in the wrench "Tampilan" sheet.
 *
 * Mirrors web's `lib/monitoring/layers.ts`: each geo tier offers the same
 * four-way choice (Semua / Batas saja / Marker saja / Sembunyikan), and Petugas
 * + Tim are ONE select so "Tim on, Petugas off" — a combination that drew
 * nothing — cannot be expressed.
 *
 * Two fixes ride along:
 *  - **Kawasan gains a row.** Mobile drilled THROUGH the kawasan tier while
 *    offering no way to show or hide it, because the boundary payload's
 *    `regions[]` had no field on the client and was discarded on arrival.
 *  - **`overdue` is gone.** It gated nothing and was already documented as
 *    inert; a control that does nothing is worse than no control.
 */

import i18n from '../../i18n/config';
import type { MonitoringV2VisibleLayers } from '../../store/slices/monitoringV2Slice';

export interface LayerOption {
  value: string;
  label: string;
}

export interface LayerRow {
  key: keyof MonitoringV2VisibleLayers;
  label: string;
  icon: string;
  /** Absent for the plain on/off rows (plants). */
  options?: LayerOption[];
}

const geoOptions = (): LayerOption[] => [
  { value: 'all', label: i18n.t('monitoring:layers.option.all') },
  { value: 'boundary', label: i18n.t('monitoring:layers.option.boundary') },
  { value: 'marker', label: i18n.t('monitoring:layers.option.marker') },
  { value: 'none', label: i18n.t('monitoring:layers.option.none') },
];

/** Built lazily so the labels follow a language change. */
export const layerRows = (): LayerRow[] => [
  {
    key: 'district',
    label: i18n.t('monitoring:layers.districts'),
    icon: 'map-marker-radius',
    options: geoOptions(),
  },
  {
    key: 'kawasan',
    label: i18n.t('monitoring:layers.kawasan'),
    icon: 'shape-outline',
    options: geoOptions(),
  },
  {
    key: 'lokasi',
    label: i18n.t('monitoring:layers.areas'),
    icon: 'vector-polygon',
    options: geoOptions(),
  },
  {
    key: 'personnel',
    label: i18n.t('monitoring:layers.personnel'),
    icon: 'account-hard-hat',
    options: [
      { value: 'all', label: i18n.t('monitoring:layers.option.all') },
      { value: 'petugas', label: i18n.t('monitoring:layers.option.petugasOnly') },
      { value: 'tim', label: i18n.t('monitoring:layers.option.timOnly') },
      { value: 'none', label: i18n.t('monitoring:layers.option.none') },
    ],
  },
  { key: 'plants', label: i18n.t('monitoring:layers.plants'), icon: 'tree' },
];
