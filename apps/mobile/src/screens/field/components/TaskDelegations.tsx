/**
 * TaskDelegations Component
 * Renders delegation chain (ADR-038)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../../../components/nb';
import { nbColors, nbSpacing } from '../../../constants/nbTokens';
import { formatDateTime } from '../../../utils/dateUtils';
import * as tasksApi from '../../../services/api/tasksApi';

interface TaskDelegationsProps {
  delegations: tasksApi.TaskDelegation[];
}

export function TaskDelegations({ delegations }: TaskDelegationsProps): React.JSX.Element | null {
  if (delegations.length === 0) { return null; }

  return (
    <View>
      {delegations.map((d, idx) => (
        <View key={d.id} style={styles.detailRow}>
          <Icon
            name={idx === delegations.length - 1 ? 'arrow-right-circle' : 'arrow-right'}
            size={14}
            color={nbColors.gray500}
          />
          <NBText variant="body-sm" style={styles.detailRowTextStyle}>
            {d.from_user
              ? `${d.from_user.full_name} (${d.from_user.role})`
              : 'Sistem'}
            {' → '}
            {d.to_user.full_name} ({d.to_user.role})
            {'  ·  '}
            {formatDateTime(d.created_at)}
          </NBText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
    marginBottom: nbSpacing.xs,
  },
  detailRowTextStyle: {
    flex: 1,
  },
});
