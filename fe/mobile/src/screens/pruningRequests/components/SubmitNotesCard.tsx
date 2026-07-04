/**
 * SubmitNotesCard — Optional notes field for additional context.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  NBCard,
  NBCardContent,
  NBCardHeader,
  NBTextInput,
  NBText,
} from '../../../components/nb';
import { nbSpacing } from '../../../constants/nbTokens';

interface SubmitNotesCardProps {
  notes: string;
  setNotes: (v: string) => void;
}

const styles = {
  card: { marginBottom: nbSpacing[4] },
  addressTextArea: {
    minHeight: 110,
    textAlignVertical: 'top' as const,
    paddingTop: nbSpacing[2],
  },
};

export function SubmitNotesCard(props: SubmitNotesCardProps) {
  const { t } = useTranslation();
  const { notes, setNotes } = props;

  return (
    <NBCard style={styles.card}>
      <NBCardHeader>
        <NBText variant="h3">{t("pruning:submit.notesOptional")}</NBText>
      </NBCardHeader>
      <NBCardContent>
        <NBTextInput
          placeholder={t('pruning:submitNotes.placeholder')}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={5}
          inputStyle={styles.addressTextArea}
        />
      </NBCardContent>
    </NBCard>
  );
}
