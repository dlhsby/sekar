/**
 * Assignee Section — Primary assignee selection
 */

import React from 'react';
import { View, ActivityIndicator } from 'react-native';
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
            PENUGASAN
            <NBText variant="mono-sm" style={styles.requiredAsterisk}>
              {' '}
              *
            </NBText>
          </NBText>
        </View>
        <NBText variant="body-sm" style={styles.sectionSubtitle}>
          Pilih petugas yang ditugaskan
        </NBText>
      </NBCardHeader>
      <NBCardContent>
        {needsAreaSelection ? (
          <View style={styles.emptyContainer}>
            <NBText variant="body-sm" color="gray600" style={styles.emptyText}>
              Pilih lokasi terlebih dahulu
            </NBText>
          </View>
        ) : isLoadingUsers ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={nbColors.primary} />
            <NBText variant="body-sm" color="gray600" style={styles.loadingText}>
              Memuat daftar petugas...
            </NBText>
          </View>
        ) : assigneeOptions.length > 0 ? (
          <NBSelect
            label="Petugas"
            value={assignedTo}
            onValueChange={(userId) => onAssigneeChange(userId)}
            options={assigneeOptions}
            placeholder="Pilih petugas..."
            searchable
            searchPlaceholder="Cari nama petugas..."
            clearable
          />
        ) : (
          <View style={styles.emptyContainer}>
            <NBText variant="body-sm" color="gray600" style={styles.emptyText}>
              Tidak ada petugas yang dapat ditugaskan di area ini
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
