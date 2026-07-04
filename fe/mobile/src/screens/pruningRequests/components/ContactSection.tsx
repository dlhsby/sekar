/**
 * ContactSection — renders contact card with pemohon and ketua RT/RW rows
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { NBCard, NBCardHeader, NBCardContent, NBText } from '../../../components/nb';
import { ContactRow } from './ContactRow';
import { nbColors } from '../../../constants/nbTokens';
import { StyleSheet } from 'react-native';
import type { PruningRequest } from '../../../types/models.types';

interface ContactSectionProps {
  request: PruningRequest;
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: nbColors.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export function ContactSection({ request }: ContactSectionProps): React.JSX.Element {
  const { t } = useTranslation();
  const hasContact =
    request.requesterName ||
    request.requesterPhone ||
    request.rtLeaderName ||
    request.rtLeaderPhone;

  if (!hasContact) {
    return null as any;
  }

  return (
    <NBCard>
      <NBCardHeader>
        <NBText variant="h2" style={styles.sectionTitle}>
          👤 KONTAK
        </NBText>
      </NBCardHeader>
      <NBCardContent>
        {request.requesterName || request.requesterPhone ? (
          <ContactRow
            label={t("pruning:contact.applicant")}
            name={request.requesterName}
            phone={request.requesterPhone}
          />
        ) : null}
        {request.rtLeaderName || request.rtLeaderPhone ? (
          <ContactRow
            label="Ketua RT/RW"
            name={request.rtLeaderName}
            phone={request.rtLeaderPhone}
            isLast
          />
        ) : null}
      </NBCardContent>
    </NBCard>
  );
}
