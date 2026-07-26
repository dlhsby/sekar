/**
 * Shared page-layout constants — the standard mobile screen padding + rhythm.
 *
 * Every scrollable screen body should apply `screenContent` to its
 * ScrollView/FlatList `contentContainerStyle` so horizontal edges and the
 * top/bottom breathing room are identical app-wide (matching the home screen).
 * Inter-section spacing is owned by `HomeSectionDivider`'s margins — screens
 * must NOT add a `gap` on the content container or per-card `marginBottom`, or
 * the rhythm doubles up unevenly.
 */
import { nbSpacing } from './nbTokens';

/** Standard scroll-content padding for a mobile page. */
export const screenContent = {
  paddingHorizontal: nbSpacing.md,
  paddingTop: nbSpacing.sm,
  paddingBottom: nbSpacing.md,
} as const;

/** `screenContent` plus `flexGrow: 1` — for pages whose short content should
 *  still fill the viewport (e.g. so the background pattern reaches the bottom). */
export const screenContentGrow = {
  ...screenContent,
  flexGrow: 1,
} as const;
