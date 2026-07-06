/**
 * Deadline Section — Date & Time Selection
 */

import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  NBCard,
  NBCardHeader,
  NBCardContent,
  NBText,
  NBDatePicker,
  NBButton,
} from '../../../components/nb';
import { nbColors } from '../../../constants/nbTokens';
import { styles } from '../styles';

interface DeadlineSectionProps {
  deadline: Date | null;
  onDeadlineChange: (date: Date) => void;
  onDeadlineClear: () => void;
}

export const DeadlineSection: React.FC<DeadlineSectionProps> = ({
  deadline,
  onDeadlineChange,
  onDeadlineClear,
}) => {
  const { t } = useTranslation('tasks');
  const handleDateChange = (date: Date) => {
    const d = new Date(date);
    // Preserve existing time if set, otherwise default to end of day (23:59)
    if (deadline) {
      d.setHours(deadline.getHours(), deadline.getMinutes(), 0, 0);
    } else {
      d.setHours(23, 59, 0, 0);
    }
    onDeadlineChange(d);
  };

  const handleTimeChange = (timeDate: Date) => {
    if (!deadline) return;
    const d = new Date(deadline);
    d.setHours(timeDate.getHours(), timeDate.getMinutes(), 0, 0);
    onDeadlineChange(d);
  };

  return (
    <NBCard style={styles.card}>
      <NBCardHeader>
        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons name="calendar-clock" size={16} color={nbColors.black} />
          <NBText variant="mono-sm" uppercase style={styles.sectionTitleStyle}>
            {' '}
            {t('create.deadline.sectionTitle')}
          </NBText>
        </View>
        <NBText variant="body-sm" style={styles.sectionSubtitle}>
          {t('create.deadline.subtitle')}
        </NBText>
      </NBCardHeader>
      <NBCardContent>
        <NBDatePicker
          label={t('create.deadline.dateLabel')}
          value={deadline}
          onChange={handleDateChange}
          placeholder={t('create.deadline.datePlaceholder')}
          minimumDate={new Date()}
        />

        {deadline && (
          <>
            <View style={styles.fieldSpacer} />
            <NBDatePicker
              label={t('create.deadline.timeLabel')}
              value={deadline}
              onChange={handleTimeChange}
              mode="time"
              placeholder={t('create.deadline.timePlaceholder')}
            />
            <NBButton
              title={t('create.deadline.clearButton')}
              variant="secondary"
              size="sm"
              onPress={onDeadlineClear}
              style={styles.clearButton}
            />
          </>
        )}
      </NBCardContent>
    </NBCard>
  );
};
