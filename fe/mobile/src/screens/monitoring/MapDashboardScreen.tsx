/**
 * MapDashboardScreen
 * Real-time map view showing active user locations
 * Phase 2C: 8-role support, boundary warnings, user terminology
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Platform,
} from 'react-native';
import MapView, { Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import {
  nbColors,
  nbTypography,
  nbSpacing,
  nbShadows,
  nbBorders,
  nbBorderRadius,
  nbTouchTarget,
} from '../../constants/nbTokens';
import { NBButton, NBCard, NBBackgroundPattern } from '../../components/nb';
import { UserMarker } from '../../components/monitoring/UserMarker';
import { UserInfoCard } from '../../components/monitoring/UserInfoCard';
import { MapErrorBoundary } from '../../components/monitoring/MapErrorBoundary';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { calculateUserStatus } from '../../utils/mapUtils';
import { ROLE_LABELS } from '../../constants/roles';
import { useMapDashboard } from '../../hooks';
import type { UserRole } from '../../types/models.types';

/** Helper: role icon for summary row */
function getRoleIcon(role: UserRole): string {
  switch (role) {
    case 'linmas': return 'shield-account';
    case 'korlap': return 'clipboard-account';
    case 'admin_data': return 'file-document-edit';
    case 'kepala_rayon': return 'account-star';
    case 'satgas':
    default: return 'account-hard-hat';
  }
}

/** Helper: role color for summary row */
function getRoleColor(role: UserRole): string {
  switch (role) {
    case 'linmas': return nbColors.navy;
    case 'korlap': return nbColors.accentSky;
    case 'admin_data': return nbColors.warning;
    case 'kepala_rayon': return nbColors.primary;
    case 'satgas':
    default: return nbColors.primary;
  }
}

/**
 * MapDashboardScreen - Main monitoring map view
 */
export function MapDashboardScreen(): React.JSX.Element {
  const mapRef = useRef<MapView>(null);

  const {
    areas,
    selectedUser,
    selectedAreaFilter,
    loading,
    refreshing,
    error,
    mapReady,
    filteredUsers,
    statusSummary,
    roleCounts,
    areaCircles,
    initialRegion,
    regionForClustering,
    useClustering,
    clusters,
    visibleUsers,
    fetchUsers,
    handleRefresh,
    handleMarkerPress,
    handleCloseInfoCard,
    handleRegionChange,
    handleAreaFilterPress,
    handleFitToMarkers,
  } = useMapDashboard(mapRef);

  if (loading || !mapReady) {
    return (
      <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.background} patternColor={nbColors.primary} opacity={0.06}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <Text style={styles.loadingText}>Memuat peta...</Text>
        </View>
      </NBBackgroundPattern>
    );
  }

  if (error && filteredUsers.length === 0) {
    return (
      <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.background} patternColor={nbColors.primary} opacity={0.06}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <NBButton title="Coba Lagi" onPress={() => fetchUsers()} variant="primary" style={styles.retryButton} />
        </View>
      </NBBackgroundPattern>
    );
  }

  return (
    <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.background} patternColor={nbColors.primary} opacity={0.06}>
      <View style={styles.container}>
        <MapErrorBoundary onReset={() => fetchUsers()}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          userInterfaceStyle="light"
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation={false}
          showsMyLocationButton={false}
          toolbarEnabled={false}
          onRegionChangeComplete={handleRegionChange}
        >
        {areaCircles.map(circle => (
          <Circle
            key={circle.key}
            center={circle.center}
            radius={circle.radius}
            strokeColor={nbColors.primary}
            strokeWidth={2}
            fillColor="rgba(46, 125, 50, 0.1)"
          />
        ))}

        {useClustering && clusters.map(cluster => (
          <UserMarker
            key={cluster.id}
            user={cluster.workers[0]}
            status={calculateUserStatus(cluster.workers[0], areas)}
            onPress={() => {
              if (cluster.pointCount > 1 && mapRef.current) {
                mapRef.current.animateToRegion({
                  ...cluster.coordinate,
                  latitudeDelta: regionForClustering.latitudeDelta / 3,
                  longitudeDelta: regionForClustering.longitudeDelta / 3,
                }, 300);
              } else {
                handleMarkerPress(cluster.workers[0]);
              }
            }}
            clusterCount={cluster.pointCount > 1 ? cluster.pointCount : undefined}
          />
        ))}

        {!useClustering && visibleUsers.map(user => (
          <UserMarker
            key={`user-${user.id}`}
            user={user}
            status={calculateUserStatus(user, areas)}
            onPress={() => handleMarkerPress(user)}
          />
        ))}
        </MapView>
      </MapErrorBoundary>

      {/* Top controls */}
      <View style={styles.topControls}>
        <NBCard variant="elevated" style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <View style={[styles.statusDot, { backgroundColor: nbColors.success }]} />
              <Text style={styles.summaryText}>{statusSummary.active}</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.statusDot, { backgroundColor: nbColors.warning }]} />
              <Text style={styles.summaryText}>{statusSummary.warning}</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.statusDot, { backgroundColor: nbColors.danger }]} />
              <Text style={styles.summaryText}>{statusSummary.outside}</Text>
            </View>
            <View style={styles.summarySeparator} />
            <Text style={styles.summaryTotal}>Total: {statusSummary.total}</Text>
          </View>
          <View style={styles.roleRow}>
            {Object.entries(roleCounts).map(([role, count]) => (
              <View key={role} style={styles.roleItem}>
                <MaterialCommunityIcons name={getRoleIcon(role as UserRole)} size={16} color={getRoleColor(role as UserRole)} />
                <Text style={styles.roleText}>{ROLE_LABELS[role as UserRole] || role}: {count}</Text>
              </View>
            ))}
          </View>
        </NBCard>

        <View style={styles.actionButtons}>
          <NBButton
            title={selectedAreaFilter ? areas.find(a => a.id === selectedAreaFilter)?.name || 'Filter' : 'Semua Area'}
            onPress={handleAreaFilterPress}
            variant="secondary"
            size="sm"
            style={styles.actionButton}
          />
          <NBButton
            title="Perbarui"
            onPress={handleRefresh}
            disabled={refreshing}
            loading={refreshing}
            variant="secondary"
            size="sm"
            style={styles.actionButton}
          />
          <NBButton
            title="Perbesar"
            onPress={handleFitToMarkers}
            variant="secondary"
            size="sm"
            style={styles.actionButton}
          />
        </View>
      </View>

      {/* Bottom user list */}
      <View style={styles.bottomContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.userList}
          contentContainerStyle={styles.userListContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[nbColors.primary]} tintColor={nbColors.primary} />
          }
        >
          {filteredUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Tidak ada pengguna aktif</Text>
            </View>
          ) : (
            filteredUsers.map(user => {
              const status = calculateUserStatus(user, areas);
              const statusColor = status === 'active' ? nbColors.success : status === 'warning' ? nbColors.warning : nbColors.danger;
              const roleIcon = getRoleIcon(user.role as UserRole);
              const roleColor = getRoleColor(user.role as UserRole);

              return (
                <TouchableOpacity key={`list-${user.id}`} style={styles.userListItem} onPress={() => handleMarkerPress(user)}>
                  <View style={[styles.userStatusDot, { backgroundColor: statusColor }]} />
                  <MaterialCommunityIcons name={roleIcon} size={16} color={roleColor} style={styles.userRoleIcon} />
                  <View style={styles.userListItemContent}>
                    <Text style={styles.userListName} numberOfLines={1}>{user.full_name}</Text>
                    <Text style={styles.userListArea} numberOfLines={1}>{user.shift.area.name}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* User info card (slide-up) */}
      <UserInfoCard user={selectedUser} visible={selectedUser !== null} onClose={handleCloseInfoCard} />
    </View>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: nbSpacing.lg,
  },
  map: {
    flex: 1,
  },
  loadingText: {
    marginTop: nbSpacing.md,
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray['500'],
  },
  errorText: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.danger,
    textAlign: 'center',
    marginBottom: nbSpacing.md,
  },
  retryButton: {
    backgroundColor: nbColors.primary,
    paddingHorizontal: nbSpacing.lg,
    paddingVertical: nbSpacing.md,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
  },
  topControls: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    left: nbSpacing.md,
    right: nbSpacing.md,
  },
  summaryCard: {
    backgroundColor: nbColors.white,
    borderRadius: nbBorderRadius.base,
    padding: nbSpacing.md,
    marginBottom: nbSpacing.sm,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    ...nbShadows.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: nbSpacing.md,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: nbSpacing.xs,
  },
  summaryText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.gray['700'],
  },
  summarySeparator: {
    flex: 1,
  },
  summaryTotal: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.gray['700'],
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: nbSpacing.sm,
    paddingTop: nbSpacing.sm,
    borderTopWidth: nbBorders.thin,
    borderTopColor: nbColors.gray['300'],
    gap: nbSpacing.sm,
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: nbSpacing.md,
  },
  roleText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['500'],
    marginLeft: nbSpacing.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: nbColors.white,
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.md,
    borderRadius: nbBorderRadius.base,
    alignItems: 'center',
    minHeight: nbTouchTarget.minHeight,
    justifyContent: 'center',
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: nbColors.white,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: nbBorders.base,
    borderTopColor: nbColors.black,
    ...nbShadows.lg,
  },
  userList: {
    maxHeight: 100,
  },
  userListContent: {
    padding: nbSpacing.md,
    gap: nbSpacing.sm,
  },
  userListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: nbColors.gray['100'],
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.md,
    borderRadius: nbBorderRadius.sm,
    marginRight: nbSpacing.sm,
    minWidth: 150,
    borderWidth: nbBorders.thin,
    borderColor: nbColors.black,
  },
  userStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: nbSpacing.xs,
  },
  userRoleIcon: {
    marginRight: nbSpacing.sm,
  },
  userListItemContent: {
    flex: 1,
  },
  userListName: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.gray['700'],
    marginBottom: 2,
  },
  userListArea: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['500'],
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: nbSpacing.lg,
  },
  emptyStateText: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray['500'],
  },
});
