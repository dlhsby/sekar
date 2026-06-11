/**
 * SubmitTreeDetailsCard — Tree count, height, diameter inputs.
 */

import React from 'react';
import { View } from 'react-native';
import {
  NBCard,
  NBCardContent,
  NBCardHeader,
  NBTextInput,
  NBText,
} from '../../../components/nb';
import { nbSpacing } from '../../../constants/nbTokens';

interface SubmitTreeDetailsCardProps {
  treeCount: string;
  setTreeCount: (v: string) => void;
  treeHeight: string;
  setTreeHeight: (v: string) => void;
  treeDiameter: string;
  setTreeDiameter: (v: string) => void;
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

const styles = {
  card: { marginBottom: nbSpacing[4] },
  fieldGroup: { marginBottom: nbSpacing[3] },
};

export function SubmitTreeDetailsCard(props: SubmitTreeDetailsCardProps) {
  const {
    treeCount,
    setTreeCount,
    treeHeight,
    setTreeHeight,
    treeDiameter,
    setTreeDiameter,
  } = props;

  return (
    <NBCard style={styles.card}>
      <NBCardHeader>
        <NBText variant="h3">Detail Pohon</NBText>
      </NBCardHeader>
      <NBCardContent>
        <View style={styles.fieldGroup}>
          <NBTextInput
            label="Jumlah Pohon *"
            placeholder="Contoh: 3"
            value={treeCount}
            onChangeText={(v) => setTreeCount(digitsOnly(v))}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.fieldGroup}>
          <NBTextInput
            label="Tinggi Pohon (tertinggi atau rata-rata, meter) *"
            placeholder="Contoh: 5"
            value={treeHeight}
            onChangeText={(v) => setTreeHeight(digitsOnly(v))}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.fieldGroup}>
          <NBTextInput
            label="Diameter Pohon (tertinggi atau rata-rata, cm) *"
            placeholder="Contoh: 30"
            value={treeDiameter}
            onChangeText={(v) => setTreeDiameter(digitsOnly(v))}
            keyboardType="number-pad"
          />
        </View>
      </NBCardContent>
    </NBCard>
  );
}
