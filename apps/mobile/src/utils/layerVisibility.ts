/**
 * Map layer visibility — the vocabulary, and the predicates that read it.
 *
 * The mobile twin of web's `lib/monitoring/layers.ts`. Deliberately a plain
 * module rather than part of the Redux slice: these are pure functions about a
 * VALUE, not about state, and living in the slice meant every test that mocked
 * the slice had to stub them too — which is how a screen test ended up failing
 * on a predicate that has nothing to do with the store.
 *
 * Each geo tier can draw its outline, its marker, both, or neither. Petugas and
 * Tim are ONE value, so "Tim on, Petugas off" — which drew an empty map — cannot
 * be expressed at all.
 */

export type LayerVisibility = 'all' | 'boundary' | 'marker' | 'none';

/** `tim` shows ONLY team members, collapsed into team bubbles. */
export type PersonnelVisibility = 'all' | 'petugas' | 'tim' | 'none';

export interface MonitoringV2VisibleLayers {
  district: LayerVisibility;
  kawasan: LayerVisibility;
  lokasi: LayerVisibility;
  personnel: PersonnelVisibility;
  /** Mobile-only overlay (web retired its plants toggle); stays a plain switch. */
  plants: boolean;
}

export const DEFAULT_VISIBLE_LAYERS: MonitoringV2VisibleLayers = {
  district: 'all',
  kawasan: 'all',
  lokasi: 'all',
  personnel: 'all',
  plants: false,
};

export const showsBoundary = (v: LayerVisibility): boolean => v === 'all' || v === 'boundary';
export const showsNodeMarker = (v: LayerVisibility): boolean => v === 'all' || v === 'marker';
export const showsWorkerPins = (v: PersonnelVisibility): boolean =>
  v === 'all' || v === 'petugas' || v === 'tim';
export const showsTeamBubbles = (v: PersonnelVisibility): boolean => v === 'all' || v === 'tim';
/** `tim` hides anyone not on a team; the other options show everyone. */
export const teamMembersOnly = (v: PersonnelVisibility): boolean => v === 'tim';
