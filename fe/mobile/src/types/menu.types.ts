/**
 * Menu launcher types.
 * The bottom bar is a uniform Home · Menu · Profile across all roles; every other
 * feature is reached from the Menu page, whose contents are role-aware (MENU_CONFIGS).
 */
import type { EmptyIllustrationKey } from '../components/nb/illustrations';
import type { MainTabParamList } from './navigation.types';

/** A single launcher tile in the Menu grid. */
export interface MenuItem {
  /** Target route (a hidden tab screen registered in MainNavigator). */
  route: keyof MainTabParamList;
  /** Optional navigation params for the target route. */
  params?: Record<string, unknown>;
  /** User-facing label (Indonesian). */
  label: string;
  /** MaterialCommunityIcons glyph name. */
  icon: string;
  /** Optional illustration; only set where a fitting one exists. */
  illustration?: EmptyIllustrationKey;
}

/** A titled group of menu items. */
export interface MenuSection {
  title: string;
  items: MenuItem[];
}
