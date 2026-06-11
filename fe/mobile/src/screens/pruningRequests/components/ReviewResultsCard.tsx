/**
 * ReviewResultsCard — displays review metadata (reviewer, date, notes)
 * Only shown after reviewedAt is set.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NBCard, NBCardHeader, NBCardContent, NBText } from '../../../components/nb';
import { nbColors, nbSpacing } from '../../../constants/nbTokens';
import { formatDateTime } from '../../../utils/dateUtils';
import type { PruningRequest } from '../../../types/models.types';

interface ReviewResultsCardProps {
  request: PruningRequest;
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: nbColors.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    marginBottom: nbSpacing.md,
  },
  label: {
    color: nbColors.gray700,
    marginBottom: nbSpacing.xs,
  },
  value: {
    color: nbColors.black,
  },
  descriptionText: {
    color: nbColors.black,
    lineHeight: 24,
  },
});

export function ReviewResultsCard({ request }: ReviewResultsCardProps): React.JSX.Element | null {
  if (!request.reviewedAt) {
    return null;
  }

  return (
    <NBCard>
      <NBCardHeader>
        <NBText variant="h2" style={styles.sectionTitle}>
          ✅ HASIL REVIEW
        </NBText>
      </NBCardHeader>
      <NBCardContent>
        <View style={styles.infoRow}>
          <NBText variant="body-sm" style={styles.label}>
            Direview Oleh
          </NBText>
          <NBText variant="body" style={styles.value}>
            {request.reviewer?.full_name || 'Admin'}
          </NBText>
        </View>
        <View style={styles.infoRow}>
          <NBText variant="body-sm" style={styles.label}>
            Tanggal Review
          </NBText>
          <NBText variant="body" style={styles.value}>
            {formatDateTime(request.reviewedAt)}
          </NBText>
        </View>
        {request.reviewNotes ? (
          <View style={[styles.infoRow, { marginBottom: 0 }]}>
            <NBText variant="body-sm" style={styles.label}>
              Catatan Review
            </NBText>
            <NBText variant="body" style={styles.descriptionText}>
              {request.reviewNotes}
            </NBText>
          </View>
        ) : null}
      </NBCardContent>
    </NBCard>
  );
}
