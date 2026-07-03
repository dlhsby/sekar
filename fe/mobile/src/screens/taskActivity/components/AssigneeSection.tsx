/**
 * Assignee Section — Primary assignee selection
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

interface AssigneeSectionProps {
  assignedTo: string;
  onAssigneeChange: (userId: string) => void;
  assigneeError?: string;
  needsAreaSelection: boolean;
  isLoadingUsers: boolean;
  assignableUsers: User[];
  taggedUserIds: string[];
}

export const AssigneeSection: React.FC<AssigneeSectionProps> = ({
  assignedTo,
  onAssigneeChange,
  assigneeError,
  needsAreaSelection,
  isLoadingUsers,
  assignableUsers,
  taggedUserIds,
}) => {
  const { t } = useTranslation('tasks');
  const assigneeOptions: NBSelectOption[] = assignableUsers
    .filter((u) => !taggedUserIds.includes(u.id))
    .map((u) => ({ label: u.full_name, value: u.id }));

  return (
    <NBCard style={styles.card}>
      <NBCardHeader>
        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons name="account-arrow-right" size={16} color={nbColors.black} />
          <NBText variant="mono-sm" uppercase style={styles.sectionTitleStyle}>
            {' '}
            {t('assignee.sectionTitle')}
            <NBText variant="mono-sm" style={styles.requiredAsterisk}>
              {' '}
              *
            </NBText>
          </NBText>
        </View>
        <NBText variant="body-sm" style={styles.sectionSubtitle}>
          {t('assignee.sectionSubtitle')}
        </NBText>
      </NBCardHeader>
      <NBCardContent>
        {needsAreaSelection ? (
          <View style={styles.emptyContainer}>
            <NBText variant="body-sm" color="gray600" style={styles.emptyText}>
              {t('assignee.selectAreaFirst')}
            </NBText>
          </View>
        ) : isLoadingUsers ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={nbColors.primary} />
            <NBText variant="body-sm" color="gray600" style={styles.loadingText}>
              {t('assignee.loading')}
            </NBText>
          </View>
        ) : assigneeOptions.length > 0 ? (
          <NBSelect
            label={t('assignee.label')}
            value={assignedTo}
            onValueChange={(userId) => onAssigneeChange(userId)}
            options={assigneeOptions}
            placeholder={t('assignee.placeholder')}
            searchable
            searchPlaceholder={t('assignee.searchPlaceholder')}
            clearable
          />
        ) : (
          <View style={styles.emptyContainer}>
            <NBText variant="body-sm" color="gray600" style={styles.emptyText}>
              {t('assignee.empty')}
            </NBText>
          </View>
        )}
        {assigneeError && (
          <NBText variant="body-sm" style={styles.errorText}>
            {assigneeError}
          </NBText>
        )}
      </NBCardContent>
    </NBCard>
  );
};
