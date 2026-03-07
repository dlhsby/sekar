/**
 * UserListStrip Component
 * Phase 2D: Horizontal scrolling strip of UserListCard at the bottom of the map.
 * Cards sorted: missing first → outside_area → inactive → active.
 */

import React, { useMemo, useCallback } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbShadows,
} from '../../constants/nbTokens';
import { UserListCard } from './UserListCard';
import type { LiveUser } from '../../types/models.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserListStripProps {
  users: LiveUser[];
  onUserPress: (user: LiveUser) => void;
}

// ─── Sort priority ────────────────────────────────────────────────────────────

const STATUS_PRIORITY: Record<string, number> = {
  missing: 0,
  outside_area: 1,
  inactive: 2,
  active: 3,
  offline: 4,
};

function sortByStatusPriority(a: LiveUser, b: LiveUser): number {
  const pa = STATUS_PRIORITY[a.status] ?? 99;
  const pb = STATUS_PRIORITY[b.status] ?? 99;
  return pa - pb;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UserListStrip({ users, onUserPress }: UserListStripProps): React.JSX.Element {
  const sortedUsers = useMemo(
    () => [...users].sort(sortByStatusPriority),
    [users],
  );

  const handlePress = useCallback(
    (user: LiveUser) => onUserPress(user),
    [onUserPress],
  );

  if (sortedUsers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Tidak ada pengguna aktif</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {sortedUsers.map(user => (
          <UserListCard
            key={user.id}
            user={user}
            onPress={handlePress}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: nbColors.white,
    borderTopWidth: nbBorders.base,
    borderTopColor: nbColors.black,
    ...nbShadows.lg,
  },
  scrollContent: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    gap: nbSpacing.sm,
  },
  emptyContainer: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: nbColors.white,
    borderTopWidth: nbBorders.base,
    borderTopColor: nbColors.black,
  },
  emptyText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['500'],
  },
});
