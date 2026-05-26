/**
 * MapFab — Neo Brutalism floating-action button for map overlays.
 *
 * Used by MapDashboardScreen (filter / layers / refresh / my-location) and by
 * LocationTrailModal (refresh). Single source of truth for the circular FAB
 * style: 44×44, white card, 2px black border, hard-edge shadow.
 */

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { nbColors, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';

interface MapFabProps {
  icon: string;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
}

export function MapFab({
  icon,
  onPress,
  accessibilityLabel,
  disabled = false,
}: MapFabProps): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.fab, disabled && styles.fabDisabled]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <MaterialCommunityIcons name={icon} size={20} color={nbColors.black} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 44,
    height: 44,
    borderRadius: nbRadius.base,
    backgroundColor: nbColors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    ...nbShadows.md,
  },
  fabDisabled: {
    opacity: 0.5,
  },
});
