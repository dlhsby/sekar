/**
 * NBMenuCard — a single launcher tile for the Menu grid.
 * Reusable so the grid is composed, not hand-rolled per call site. Built on NBCard
 * (interactive) + an NB icon box + label. All visuals come from design tokens.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { nbColors, nbBorders, nbRadius, nbShadows, nbSpacing } from '../../constants/nbTokens';
import { NBCard } from './NBCard';
import { NBText } from './NBText';
import { ILLUSTRATIONS, type EmptyIllustrationKey } from './illustrations';

export interface NBMenuCardProps {
  /** MaterialCommunityIcons glyph name (used when no illustration is set). */
  icon: string;
  /** User-facing label. */
  label: string;
  /** Optional illustration; replaces the icon box when provided. */
  illustration?: EmptyIllustrationKey;
  /** Tap handler. */
  onPress: () => void;
  /** Test ID. */
  testID?: string;
}

const ICON_SIZE = 28;
const ILLUSTRATION_SIZE = 56;

export const NBMenuCard: React.FC<NBMenuCardProps> = ({
  icon,
  label,
  illustration,
  onPress,
  testID,
}) => {
  const Illustration = illustration ? ILLUSTRATIONS[illustration] : null;

  return (
    <NBCard
      interactive
      onPress={onPress}
      style={styles.card}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.body}>
        {Illustration ? (
          <Illustration size={ILLUSTRATION_SIZE} />
        ) : (
          <View style={styles.iconBox}>
            <MaterialCommunityIcons name={icon} size={ICON_SIZE} color={nbColors.black} />
          </View>
        )}
        <NBText variant="body-sm" color="black" align="center" numberOfLines={2} style={styles.label}>
          {label}
        </NBText>
      </View>
    </NBCard>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    paddingVertical: nbSpacing.md,
    paddingHorizontal: nbSpacing.sm,
  },
  body: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: nbSpacing.sm,
  },
  iconBox: {
    width: ILLUSTRATION_SIZE,
    height: ILLUSTRATION_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nbColors.primary,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.md,
    ...nbShadows.xs,
  },
  label: {
    marginTop: nbSpacing.xs,
  },
});

export default NBMenuCard;
