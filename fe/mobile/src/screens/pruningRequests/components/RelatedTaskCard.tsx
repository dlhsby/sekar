/**
 * RelatedTaskCard — displays linked task info with "Lihat Tugas" button
 * Only shown when assignedTaskId is present.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NBCard, NBCardHeader, NBCardContent, NBText, NBButton } from '../../../components/nb';
import { nbColors, nbSpacing } from '../../../constants/nbTokens';
import type { PruningRequest } from '../../../types/models.types';

interface RelatedTaskCardProps {
  request: PruningRequest;
  onViewTask: () => void;
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: nbColors.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descriptionText: {
    color: nbColors.black,
    lineHeight: 24,
    marginBottom: nbSpacing.md,
  },
});

export function RelatedTaskCard({
  request,
  onViewTask,
}: RelatedTaskCardProps): React.JSX.Element | null {
  const { t } = useTranslation();

  if (!request.assignedTaskId) {
    return null;
  }

  const taskMessage =
    request.status === 'done'
      ? t('pruning:relatedTask.statusMessages.done')
      : request.status === 'in_progress'
        ? t('pruning:relatedTask.statusMessages.inProgress')
        : t('pruning:relatedTask.statusMessages.default');

  return (
    <NBCard>
      <NBCardHeader>
        <NBText variant="h2" style={styles.sectionTitle}>
          {t('pruning:relatedTask.title')}
        </NBText>
      </NBCardHeader>
      <NBCardContent>
        <NBText variant="body" style={styles.descriptionText}>
          {taskMessage}
        </NBText>
        <NBButton
          variant="primary"
          label={t('pruning:relatedTask.viewButton')}
          onPress={onViewTask}
          leftIcon="link-variant"
          fullWidth
        />
      </NBCardContent>
    </NBCard>
  );
}
