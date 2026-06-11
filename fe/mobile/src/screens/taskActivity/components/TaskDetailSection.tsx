/**
 * Task Detail Section — Title & Description
 */

import React from 'react';
import { View } from 'react-native';
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
  return (
    <NBCard style={styles.card}>
      <NBCardHeader>
        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons name="text-box-outline" size={16} color={nbColors.black} />
          <NBText variant="mono-sm" uppercase style={styles.sectionTitleStyle}>
            {' '}
            DETAIL TUGAS
            <NBText variant="mono-sm" style={styles.requiredAsterisk}>
              {' '}
              *
            </NBText>
          </NBText>
        </View>
        <NBText variant="body-sm" style={styles.sectionSubtitle}>
          Isi judul dan deskripsi tugas
        </NBText>
      </NBCardHeader>
      <NBCardContent>
        <NBTextInput
          label="Judul *"
          value={title}
          onChangeText={onTitleChange}
          placeholder="Masukkan judul tugas..."
          error={titleError}
        />

        <View style={styles.fieldSpacer} />

        <NBTextInput
          label="Deskripsi"
          value={description}
          onChangeText={onDescriptionChange}
          placeholder="Jelaskan detail tugas..."
          multiline
          numberOfLines={6}
          maxLength={500}
          helperText={`${description.length}/500 karakter`}
          inputStyle={styles.descriptionInput}
          textAlignVertical="top"
        />
      </NBCardContent>
    </NBCard>
  );
};
