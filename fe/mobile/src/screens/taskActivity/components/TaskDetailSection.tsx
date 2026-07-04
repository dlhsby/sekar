/**
 * Task Detail Section — Title & Description
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
  NBTextInput,
} from '../../../components/nb';
import { nbColors } from '../../../constants/nbTokens';
import { styles } from '../styles';

interface TaskDetailSectionProps {
  title: string;
  onTitleChange: (text: string) => void;
  titleError?: string;
  description: string;
  onDescriptionChange: (text: string) => void;
}

export const TaskDetailSection: React.FC<TaskDetailSectionProps> = ({
  title,
  onTitleChange,
  titleError,
  description,
  onDescriptionChange,
}) => {
  const { t } = useTranslation('components');

  return (
    <NBCard style={styles.card}>
      <NBCardHeader>
        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons name="text-box-outline" size={16} color={nbColors.black} />
          <NBText variant="mono-sm" uppercase style={styles.sectionTitleStyle}>
            {' '}
            {t('taskDetailSection.title')}
            <NBText variant="mono-sm" style={styles.requiredAsterisk}>
              {' '}
              *
            </NBText>
          </NBText>
        </View>
        <NBText variant="body-sm" style={styles.sectionSubtitle}>
          {t('taskDetailSection.subtitle')}
        </NBText>
      </NBCardHeader>
      <NBCardContent>
        <NBTextInput
          label={t('taskDetailSection.titleLabel')}
          value={title}
          onChangeText={onTitleChange}
          placeholder={t('taskDetailSection.titlePlaceholder')}
          error={titleError}
        />

        <View style={styles.fieldSpacer} />

        <NBTextInput
          label={t('taskDetailSection.descriptionLabel')}
          value={description}
          onChangeText={onDescriptionChange}
          placeholder={t('taskDetailSection.descriptionPlaceholder')}
          multiline
          numberOfLines={6}
          maxLength={500}
          helperText={t('taskDetailSection.helperText', { current: description.length })}
          inputStyle={styles.descriptionInput}
          textAlignVertical="top"
        />
      </NBCardContent>
    </NBCard>
  );
};
