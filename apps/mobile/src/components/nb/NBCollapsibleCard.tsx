import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
  nbShadows,
} from '../../constants/nbTokens';
import { useCollapsible } from '../../hooks/useCollapsible';

export interface NBCollapsibleCardProps {
  /** Left side of the header row — fills flex: 1 */
  headerLeft: React.ReactNode;
  /** Optional content between the left content and the chevron */
  headerRight?: React.ReactNode;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export function NBCollapsibleCard({
  headerLeft,
  headerRight,
  defaultExpanded = false,
  children,
  style,
  accessibilityLabel,
  testID,
}: NBCollapsibleCardProps): React.JSX.Element {
  const { expanded, toggle } = useCollapsible(defaultExpanded);

  return (
    <View style={[styles.card, style]} testID={testID}>
      <TouchableOpacity
        style={styles.header}
        onPress={toggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? (expanded ? 'Sembunyikan' : 'Tampilkan')}
        accessibilityState={{ expanded }}
      >
        <View style={styles.headerLeft}>{headerLeft}</View>
        {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : null}
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={nbColors.gray600}
          style={styles.chevron}
        />
      </TouchableOpacity>
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: nbColors.white,
    borderRadius: nbRadius.md,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
    overflow: 'hidden',
    ...nbShadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    marginRight: nbSpacing.xs,
  },
  chevron: {
    marginLeft: nbSpacing.xs,
  },
  body: {
    paddingHorizontal: nbSpacing.md,
    paddingBottom: nbSpacing.sm,
  },
});
