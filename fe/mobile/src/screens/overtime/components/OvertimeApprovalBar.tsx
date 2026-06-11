/**
 * OvertimeApprovalBar — FAB with approve/reject or reject-reason submission
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  NBButton,
  NBCardTextInput,
} from '../../../components/nb';
import {
  nbSpacing,
} from '../../../constants/nbTokens';

interface OvertimeApprovalBarProps {
  showRejectInput: boolean;
  rejectReason: string;
  isSubmitting: boolean;
  onTolakPress: () => void;
  onApprovePress: () => void;
  onBatalPress: () => void;
  onRejectSubmitPress: () => void;
  onRejectReasonChange: (text: string) => void;
}

export const OvertimeApprovalBar: React.FC<OvertimeApprovalBarProps> = ({
  showRejectInput,
  rejectReason,
  isSubmitting,
  onTolakPress,
  onApprovePress,
  onBatalPress,
  onRejectSubmitPress,
  onRejectReasonChange,
}) => {
  if (showRejectInput) {
    return (
      <>
        <NBCardTextInput
          title="ALASAN PENOLAKAN"
          required
          value={rejectReason}
          onChangeText={onRejectReasonChange}
          placeholder="Jelaskan alasan penolakan lembur ini..."
          maxLength={1000}
          numberOfLines={4}
          style={styles.rejectInputSection}
        />
        <View style={styles.fab}>
          <View style={styles.approvalButtonRow}>
            <View style={styles.approvalButtonHalf}>
              <NBButton
                title="Batal"
                variant="secondary"
                onPress={onBatalPress}
                fullWidth
                size="lg"
              />
            </View>
            <View style={styles.approvalButtonHalf}>
              <NBButton
                title="Kirim Penolakan"
                variant="danger"
                onPress={onRejectSubmitPress}
                disabled={isSubmitting || !rejectReason.trim()}
                loading={isSubmitting}
                size="lg"
                fullWidth
              />
            </View>
          </View>
        </View>
      </>
    );
  }

  return (
    <View style={styles.fab}>
      <View style={styles.approvalButtonRow}>
        <View style={styles.approvalButtonHalf}>
          <NBButton
            title="Tolak"
            variant="danger"
            onPress={onTolakPress}
            disabled={isSubmitting}
            fullWidth
            size="lg"
          />
        </View>
        <View style={styles.approvalButtonHalf}>
          <NBButton
            title="Setujui"
            variant="success"
            onPress={onApprovePress}
            disabled={isSubmitting}
            loading={isSubmitting}
            fullWidth
            size="lg"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fab: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
  },
  approvalButtonRow: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
  approvalButtonHalf: {
    flex: 1,
  },
  rejectInputSection: {
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
  },
});
