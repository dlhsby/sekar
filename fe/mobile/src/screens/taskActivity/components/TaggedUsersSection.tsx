/**
 * Tagged Users Section — Multi-select for additional users
 */

import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  NBCard,
  NBCardHeader,
  NBCardContent,
  NBText,
  NBSelect,
} from '../../../components/nb';
import { nbColors } from '../../../constants/nbTokens';
import type { NBSelectOption } from '../../../components/nb/NBSelect';
import type { User } from '../../../types/models.types';
import { styles } from '../styles';

interface TaggedUsersSectionProps {
  taggedUserIds: string[];
  onTaggedUsersChange: (userIds: string[]) => void;
  needsAreaSelection: boolean;
  isLoadingUsers: boolean;
  assignableUsers: User[];
  assignedTo: string;
}

export const TaggedUsersSection: React.FC<TaggedUsersSectionProps> = ({
  taggedUserIds,
  onTaggedUsersChange,
  needsAreaSelection,
  isLoadingUsers,
  assignableUsers,
  assignedTo,
}) => {
  const { t } = useTranslation('tasks');
  const taggableOptions: NBSelectOption[] = assignableUsers
    .filter((u) => u.id !== assignedTo)
    .map((u) => ({ label: u.full_name, value: u.id }));

  return (
    <NBCard style={styles.card}>
      <NBCardHeader>
        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons name="tag-multiple-outline" size={16} color={nbColors.black} />
          <NBText variant="mono-sm" uppercase style={styles.sectionTitleStyle}>
            {' '}
            {t('tagged.sectionTitle')}
          </NBText>
        </View>
        <NBText variant="body-sm" style={styles.sectionSubtitle}>
          {t('tagged.sectionSubtitle')}
        </NBText>
      </NBCardHeader>
      <NBCardContent>
        {needsAreaSelection ? (
          <View style={styles.emptyContainer}>
            <NBText variant="body-sm" color="gray600" style={styles.emptyText}>
              {t('tagged.selectAreaFirst')}
            </NBText>
          </View>
        ) : isLoadingUsers ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={nbColors.primary} />
            <NBText variant="body-sm" color="gray600" style={styles.loadingText}>
              {t('tagged.loading')}
            </NBText>
          </View>
        ) : taggableOptions.length > 0 ? (
          <NBSelect
            label={t('tagged.label')}
            selectedValues={taggedUserIds}
            onValuesChange={onTaggedUsersChange}
            options={taggableOptions}
            placeholder={t('tagged.placeholder')}
            searchable
            searchPlaceholder={t('tagged.searchPlaceholder')}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <NBText variant="body-sm" color="gray600" style={styles.emptyText}>
              {assignedTo ? t('tagged.emptyOthers') : t('tagged.empty')}
            </NBText>
          </View>
        )}
      </NBCardContent>
    </NBCard>
  );
};
