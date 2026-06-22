/**
 * Menu Screen — role-aware launcher.
 * The bottom bar is uniform (Home · Menu · Profile); every other feature is reached
 * here as a grid of NBMenuCard tiles, grouped into sections per MENU_CONFIGS[role].
 */

import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppSelector } from '../../store/hooks';
import { NBBackgroundPattern, NBMenuCard, NBText } from '../../components/nb';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
import { MENU_CONFIGS } from '../../constants/menuConfigs';
import type { MainTabParamList } from '../../types/navigation.types';

type Props = {
  navigation: NativeStackNavigationProp<MainTabParamList, 'Menu'>;
};

export function MenuScreen({ navigation }: Props): React.JSX.Element {
  const role = useAppSelector((state) => state.auth.user?.role) ?? 'satgas';
  const sections = MENU_CONFIGS[role] ?? [];

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.bgCanvas}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <NBText variant="h3" color="black" style={styles.sectionTitle}>
              {section.title}
            </NBText>
            <View style={styles.grid}>
              {section.items.map((item) => (
                <View key={`${item.route}:${item.label}`} style={styles.cell}>
                  <NBMenuCard
                    icon={item.icon}
                    label={item.label}
                    illustration={item.illustration}
                    testID={`menu-${item.route}-${item.label}`}
                    onPress={() =>
                      (navigation as any).navigate(item.route, item.params)
                    }
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: nbSpacing.md,
    paddingTop: nbSpacing.md,
    paddingBottom: nbSpacing.xl,
  },
  section: { marginBottom: nbSpacing.lg },
  sectionTitle: { marginBottom: nbSpacing.sm },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: nbSpacing.sm,
  },
  cell: {
    // Two columns with a single gap between them.
    flexBasis: '47%',
    flexGrow: 1,
  },
});

export default MenuScreen;
