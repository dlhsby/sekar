/**
 * SubmitTreeDetailsCard — Tree count, height, diameter inputs.
 */

import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('pruning');
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
        <NBText variant="h3">{t('submitTreeDetailsCard.title')}</NBText>
      </NBCardHeader>
      <NBCardContent>
        <View style={styles.fieldGroup}>
          <NBTextInput
            label={t('submitTreeDetailsCard.treeCountLabel')}
            placeholder={t('submitTreeDetailsCard.treeCountPlaceholder')}
            value={treeCount}
            onChangeText={(v) => setTreeCount(digitsOnly(v))}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.fieldGroup}>
          <NBTextInput
            label={t('submitTreeDetailsCard.treeHeightLabel')}
            placeholder={t('submitTreeDetailsCard.treeHeightPlaceholder')}
            value={treeHeight}
            onChangeText={(v) => setTreeHeight(digitsOnly(v))}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.fieldGroup}>
          <NBTextInput
            label={t('submitTreeDetailsCard.treeDiameterLabel')}
            placeholder={t('submitTreeDetailsCard.treeDiameterPlaceholder')}
            value={treeDiameter}
            onChangeText={(v) => setTreeDiameter(digitsOnly(v))}
            keyboardType="number-pad"
          />
        </View>
      </NBCardContent>
    </NBCard>
  );
}
