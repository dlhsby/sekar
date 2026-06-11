/**
 * NotesCard — displays request notes/catatan
 * Only shown when notes are present.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { NBCard, NBCardHeader, NBCardContent, NBText } from '../../../components/nb';
import { nbColors } from '../../../constants/nbTokens';
import type { PruningRequest } from '../../../types/models.types';

interface NotesCardProps {
  request: PruningRequest;
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
  },
});

export function NotesCard({ request }: NotesCardProps): React.JSX.Element | null {
  if (!request.notes) {
    return null;
  }

  return (
    <NBCard>
      <NBCardHeader>
        <NBText variant="h2" style={styles.sectionTitle}>
          📝 CATATAN
        </NBText>
      </NBCardHeader>
      <NBCardContent>
        <NBText variant="body" style={styles.descriptionText}>
          {request.notes}
        </NBText>
      </NBCardContent>
    </NBCard>
  );
}
