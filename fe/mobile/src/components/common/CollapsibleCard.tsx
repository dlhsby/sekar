/**
 * CollapsibleCard Component
 * Expandable card with chevron indicator and smooth animation
 * Neo Brutalism 2.0 compliant with WCAG 2.1 AA accessibility
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  LayoutAnimation,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbSpacing,
  nbType,
  nbBorders,
  nbRadius,
  nbShadows,
} from '../../constants/nbTokens';
import { useCollapsible } from '../../hooks/useCollapsible';


interface CollapsibleCardProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  style?: any;
}

export function CollapsibleCard({
  title,
  children,
  defaultExpanded = false,
  style,
}: CollapsibleCardProps): React.ReactElement {
  const { t } = useTranslation();
  // expanded resets to defaultExpanded when the host screen blurs (see useCollapsible).
  const { expanded, toggle } = useCollapsible(defaultExpanded);
  const rotateAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  // Drive the chevron rotation from `expanded` so it stays in sync whether the
  // change came from a tap or the on-blur reset.
  useEffect(() => {
    rotateAnim.stopAnimation();
    Animated.timing(rotateAnim, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      // See NBSelect for rationale — JS-driven sidesteps Fabric's
      // native-node lifecycle race on quick mount/unmount.
      useNativeDriver: false,
    }).start();
  }, [expanded, rotateAnim]);

  // Stop the rotation animation if the card unmounts mid-toggle.
  // Prevents `connectAnimatedNodeToView: Animated node ... does not exist`
  // SoftException when a parent unmounts immediately after a tap.
  useEffect(() => {
    return () => {
      rotateAnim.stopAnimation();
    };
  }, [rotateAnim]);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext({
      duration: 200,
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
    });
    toggle();
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        onPress={toggleExpanded}
        style={styles.header}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={expanded ? t('components:ui.tap.close') : t('components:ui.tap.open')}
        accessibilityState={{ expanded }}
      >
        <Text style={styles.title}>{title}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <MaterialCommunityIcons
            name="chevron-down"
            size={24}
            color={nbColors.black}
          />
        </Animated.View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: nbColors.bgSurface,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: nbSpacing.sm,
    minHeight: 48, // Touch target
  },
  title: {
    fontSize: nbType.body.fontSize,
    fontWeight: nbType.h1.fontWeight,
    color: nbColors.black,
    flex: 1,
  },
  content: {
    paddingHorizontal: nbSpacing.sm,
    paddingBottom: nbSpacing.sm,
    borderTopWidth: nbBorders.widthThin,
    borderTopColor: nbColors.gray200,
  },
});
