/**
 * ReviewResultsCard — displays review metadata (reviewer, date, notes)
 * Only shown after reviewedAt is set.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { NBCard, NBCardHeader, NBCardContent, NBText } from '../../../components/nb';
import { DetailRow } from '../../../components/common/DetailRow';
import { nbColors } from '../../../constants/nbTokens';
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
});

export function ReviewResultsCard({ request }: ReviewResultsCardProps): React.JSX.Element | null {
  const { t } = useTranslation();
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
        <DetailRow
          label={t("pruning:review.reviewedBy")}
          value={request.reviewer?.full_name || 'Admin'}
        />
        <DetailRow
          label={t("pruning:review.dateLabel")}
          value={formatDateTime(request.reviewedAt)}
        />
        {request.reviewNotes ? (
          <DetailRow
            label={t("pruning:review.notes")}
            value={request.reviewNotes}
            variant="description"
            isLast
          />
        ) : null}
      </NBCardContent>
    </NBCard>
  );
}
