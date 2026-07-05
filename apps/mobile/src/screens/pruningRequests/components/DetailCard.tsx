/**
 * DetailCard — displays tree details (count, height, diameter, scheduling info)
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NBCard, NBCardHeader, NBCardContent, NBText } from '../../../components/nb';
import { DetailRow } from '../../../components/common/DetailRow';
import { nbColors } from '../../../constants/nbTokens';
import { formatDate, formatIsoWeekLabel } from '../../../utils/dateUtils';
import type { PruningRequest } from '../../../types/models.types';

interface DetailCardProps {
  request: PruningRequest;
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: nbColors.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export function DetailCard({ request }: DetailCardProps): React.JSX.Element {
  const { t } = useTranslation('pruning');
  const treeCount = request.treeCount ?? request.estimatedPlantCount;
  const rows = [
    {
      key: 'treeCount',
      label: t('detailCard.treeCount'),
      value: treeCount != null ? t('detailCard.treeCountFormat', { count: treeCount }) : '—',
    },
    ...(request.treeHeightEstimate
      ? [{
          key: 'treeHeight',
          label: t('detailCard.treeHeight'),
          value: request.treeHeightEstimate,
        }]
      : []),
    ...(request.treeDiameterEstimate
      ? [{
          key: 'treeDiameter',
          label: t('detailCard.treeDiameter'),
          value: request.treeDiameterEstimate,
        }]
      : []),
    {
      key: 'preferredWeek',
      label: t('detailCard.preferredWeek'),
      value: request.expectedYear != null && request.expectedIsoWeek != null
        ? formatIsoWeekLabel(request.expectedYear, request.expectedIsoWeek)
        : t('detailCard.notSpecified'),
    },
    {
      key: 'scheduledDate',
      label: t('detailCard.scheduledDate'),
      value: request.scheduledDate ? formatDate(request.scheduledDate) : t('detailCard.notScheduled'),
      isLast: true,
    },
  ];

  return (
    <NBCard>
      <NBCardHeader>
        <NBText variant="h2" style={styles.sectionTitle}>
          {t('detailCard.sectionTitle')}
        </NBText>
      </NBCardHeader>
      <NBCardContent>
        {rows.map((row) => (
          <DetailRow
            key={row.key}
            label={row.label}
            value={row.value}
            isLast={row.isLast}
          />
        ))}
      </NBCardContent>
    </NBCard>
  );
}
