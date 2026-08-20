/**
 * Map layer visibility — the vocabulary, and the predicates that read it.
 *
 * The mobile twin of web's `lib/monitoring/layers.ts`. Deliberately a plain
 * module rather than part of the Redux slice: these are pure functions about a
 * VALUE, not about state, and living in the slice meant every test that mocked
 * the slice had to stub them too — which is how a screen test ended up failing
 * on a predicate that has nothing to do with the store.
 *
 * Each row is a SET of independent facets. A geo tier draws its outline, its
 * fill, its marker — in any combination; personnel draws individual pins,
 * collapsed team bubbles, or both. This replaced a four-way select (`all |
 * boundary | marker | none`) that could not express "outline and marker, no
 * fill" at all, and whose "Batas saja" silently meant outline *and* fill.
 */

/**
 * What a geo tier can draw. Independent — any subset is valid, including none.
 *
 * `marker` is the bubble; `label` is the name beside it. Separate because a
 * dense tier is often wanted as bubbles ALONE — at city zoom every lokasi name
 * printing at once is unreadable, while the bubbles still carry the counts.
 */
export type GeoFacet = 'boundary' | 'fill' | 'marker' | 'label';

/** Which people the map draws. `tim` alone hides anyone not on a team. */
export type PersonnelFacet = 'petugas' | 'tim';

export type GeoLayer = GeoFacet[];
export type PersonnelLayer = PersonnelFacet[];

export const GEO_FACETS: GeoFacet[] = ['boundary', 'fill', 'marker', 'label'];
export const PERSONNEL_FACETS: PersonnelFacet[] = ['petugas', 'tim'];

export interface MonitoringV2VisibleLayers {
  district: GeoLayer;
  kawasan: GeoLayer;
  lokasi: GeoLayer;
  personnel: PersonnelLayer;
  /** Mobile-only overlay (web retired its plants toggle); stays a plain switch. */
  plants: boolean;
}

export const DEFAULT_VISIBLE_LAYERS: MonitoringV2VisibleLayers = {
  district: ['boundary', 'fill', 'marker', 'label'],
  kawasan: ['boundary', 'fill', 'marker', 'label'],
  lokasi: ['boundary', 'fill', 'marker', 'label'],
  personnel: ['petugas', 'tim'],
  plants: false,
};

export const showsBoundary = (v: GeoLayer): boolean => v.includes('boundary');
export const showsFill = (v: GeoLayer): boolean => v.includes('fill');
export const showsNodeMarker = (v: GeoLayer): boolean => v.includes('marker');
/** The name beside the bubble. Independent of the bubble itself. */
export const showsNodeLabel = (v: GeoLayer): boolean => v.includes('label');
/**
 * Whether the polygon is worth mounting at all. Fill without an outline is a
 * legitimate ask (a soft wash under the pins), so this is an OR — the two facets
 * then decide stroke width and fill colour.
 */
export const showsPolygon = (v: GeoLayer): boolean => showsBoundary(v) || showsFill(v);

/** Team bubbles are built FROM the worker set, so any personnel facet needs it. */
export const showsWorkerPins = (v: PersonnelLayer): boolean => v.length > 0;
export const showsTeamBubbles = (v: PersonnelLayer): boolean => v.includes('tim');
/** Tim alone hides anyone not on a team; ticking Petugas brings them back. */
export const teamMembersOnly = (v: PersonnelLayer): boolean =>
  v.includes('tim') && !v.includes('petugas');

/** Every facet a row can hold — the target of the "Semua" shortcut. */
export function allFacets(key: keyof MonitoringV2VisibleLayers): string[] {
  return key === 'personnel' ? [...PERSONNEL_FACETS] : [...GEO_FACETS];
}

/** Add or remove one facet, preserving the canonical order. */
export function toggleFacet(
  key: keyof MonitoringV2VisibleLayers,
  current: readonly string[],
  facet: string,
): string[] {
  const next = current.includes(facet)
    ? current.filter(f => f !== facet)
    : [...current, facet];
  return allFacets(key).filter(f => next.includes(f));
}
