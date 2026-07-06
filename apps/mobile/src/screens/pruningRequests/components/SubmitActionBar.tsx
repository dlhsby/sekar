/**
 * SubmitActionBar — Footer action buttons (Batal / Kirim).
 */

import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  NBButton,
} from '../../../components/nb';
import { nbSpacing } from '../../../constants/nbTokens';

interface SubmitActionBarProps {
  isBusy: boolean;
  handleSubmit: () => Promise<void>;
  handleLeave: () => void;
}

const styles = {
  fab: {
    paddingHorizontal: nbSpacing[4],
    paddingVertical: nbSpacing[3],
  },
  fabButtonRow: {
    flexDirection: 'row' as const,
    gap: nbSpacing[2],
  },
  fabButtonHalf: {
    flex: 1,
  },
};

export function SubmitActionBar(props: SubmitActionBarProps) {
  const { t } = useTranslation('pruning');
  const { isBusy, handleSubmit, handleLeave } = props;

  return (
    <View style={styles.fab}>
      <View style={styles.fabButtonRow}>
        <View style={styles.fabButtonHalf}>
          <NBButton
            title={t('actionBar.cancelLabel')}
            variant="secondary"
            onPress={handleLeave}
            disabled={isBusy}
            fullWidth
            size="lg"
          />
        </View>
        <View style={styles.fabButtonHalf}>
          <NBButton
            title={isBusy ? t('actionBar.submittingLabel') : t('actionBar.submitLabel')}
            onPress={handleSubmit}
            loading={isBusy}
            disabled={isBusy}
            fullWidth
            size="lg"
            testID="perantingan-submit-cta"
          />
        </View>
      </View>
    </View>
  );
}
