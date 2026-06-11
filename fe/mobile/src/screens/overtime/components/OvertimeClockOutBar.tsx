/**
 * OvertimeClockOutBar — FAB for clock-out (visible to overtime owner in in_progress status)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NBButton } from '../../../components/nb';
import { nbSpacing } from '../../../constants/nbTokens';

interface OvertimeClockOutBarProps {
  onPress: () => void;
}

export const OvertimeClockOutBar: React.FC<OvertimeClockOutBarProps> = ({ onPress }) => (
  <View style={styles.fab}>
    <NBButton
      title="Clock Out Lembur"
      variant="danger"
      size="lg"
      fullWidth
      onPress={onPress}
    />
  </View>
);

const styles = StyleSheet.create({
  fab: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
  },
});
