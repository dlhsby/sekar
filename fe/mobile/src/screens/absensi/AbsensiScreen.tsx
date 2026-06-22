/**
 * Absensi Screen — merges clock in/out + overtime into one tabbed screen.
 * "Absensi" tab renders the embedded ClockInOutScreen; "Lembur" tab renders the
 * OvertimeListScreen. The navigator owns the "Absensi" header; this screen owns
 * the segmented tab strip below it.
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { NBTab } from '../../components/nb';
import { nbColors, nbBorders, nbSpacing } from '../../constants/nbTokens';
import type { MainTabParamList } from '../../types/navigation.types';
import { ClockInOutScreen } from '../field/ClockInOutScreen';
import { OvertimeListScreen } from '../overtime/OvertimeListScreen';

type AbsensiTab = 'absensi' | 'lembur';

type Props = {
  navigation: NativeStackNavigationProp<MainTabParamList, 'Absensi'>;
  route: RouteProp<MainTabParamList, 'Absensi'>;
};

export function AbsensiScreen({ navigation, route }: Props): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<AbsensiTab>(route.params?.initialTab ?? 'absensi');

  return (
    <View style={styles.container}>
      <View style={styles.tabStrip}>
        <NBTab
          tabs={[
            { key: 'absensi', label: 'Absensi' },
            { key: 'lembur', label: 'Lembur' },
          ]}
          activeTab={activeTab}
          onTabChange={(key) => setActiveTab(key as AbsensiTab)}
          activeTabStyle={{ backgroundColor: nbColors.warning }}
          activeTextStyle={{ color: nbColors.black }}
        />
      </View>

      <View style={styles.content}>
        {activeTab === 'absensi' ? (
          <ClockInOutScreen embedded />
        ) : (
          <OvertimeListScreen navigation={navigation} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: nbColors.bgCanvas,
  },
  tabStrip: {
    paddingHorizontal: nbSpacing.md,
    paddingTop: nbSpacing.md,
    paddingBottom: nbSpacing.sm,
    backgroundColor: nbColors.white,
    borderBottomWidth: nbBorders.widthBase,
    borderBottomColor: nbColors.black,
  },
  content: {
    flex: 1,
  },
});

export default AbsensiScreen;
