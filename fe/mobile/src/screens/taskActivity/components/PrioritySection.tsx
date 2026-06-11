/**
 * Priority Section — Priority Selection with Color Coding
 */

import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  NBCard,
  NBCardHeader,
  NBCardContent,
  NBText,
} from '../../../components/nb';
import { nbColors } from '../../../constants/nbTokens';
import type { TaskPriority } from '../../../types/models.types';
import { styles } from '../styles';

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Rendah', color: nbColors.gray500 },
  { value: 'medium', label: 'Biasa', color: nbColors.info },
  { value: 'high', label: 'Tinggi', color: nbColors.warningLight },
  { value: 'urgent', label: 'Mendesak', color: nbColors.danger },
];

interface PrioritySectionProps {
  priority: TaskPriority | '';
  onPriorityChange: (priority: TaskPriority) => void;
}

export const PrioritySection: React.FC<PrioritySectionProps> = ({
  priority,
  onPriorityChange,
}) => {
  return (
    <NBCard style={styles.card}>
      <NBCardHeader>
        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons name="flag-outline" size={16} color={nbColors.black} />
          <NBText variant="mono-sm" uppercase style={styles.sectionTitleStyle}>
            {' '}
            PRIORITAS
          </NBText>
        </View>
      </NBCardHeader>
      <NBCardContent>
        {PRIORITY_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              priority === option.value && styles.optionButtonActive,
            ]}
            onPress={() => onPriorityChange(option.value)}
          >
            <NBText
              variant="body"
              style={[
                styles.optionText,
                priority === option.value && styles.optionTextActive,
              ]}
            >
              {priority === option.value ? '✓ ' : ''}
              {option.label}
            </NBText>
          </TouchableOpacity>
        ))}
      </NBCardContent>
    </NBCard>
  );
};
