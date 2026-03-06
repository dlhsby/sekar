/**
 * useMapDashboard Hook
 * Manages map data fetching, filtering, clustering, and user interaction
 * Extracted from MapDashboardScreen for separation of concerns
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Alert, InteractionManager } from 'react-native';
import MapView from 'react-native-maps';
import { getActiveUsers } from '../services/api/monitoringApi';
import { get } from '../services/api/apiClient';
import {
  calculateUserStatus,
  calculateMapRegion,
  filterUsersByArea,
  filterUsersByRegion,
  getAreaCircles,
  getStatusSummary,
  clusterUsers,
  shouldCluster,
  isValidRegion,
  SURABAYA_CITY_REGION,
} from '../utils/mapUtils';
import { ROLE_LABELS, CLOCKABLE_ROLES } from '../constants/roles';
import config from '../constants/config';
import type { ActiveUserData } from '../types/api.types';
import type { Area, UserRole } from '../types/models.types';

const SURABAYA_CENTER = {
  latitude: SURABAYA_CITY_REGION.latitude,
  longitude: SURABAYA_CITY_REGION.longitude,
};

const CLUSTER_THRESHOLD = 30;

export function useMapDashboard(mapRef: React.RefObject<MapView | null>) {
  const [users, setUsers] = useState<ActiveUserData[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedUser, setSelectedUser] = useState<ActiveUserData | null>(null);
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [currentRegion, setCurrentRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch active users
  const fetchUsers = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) { setLoading(true); }
      setError(null);

      const response = await getActiveUsers();
      if (response.data) {
        setUsers(Array.isArray(response.data.users) ? response.data.users : []);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Gagal memuat data pengguna');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch areas
  const fetchAreas = useCallback(async () => {
    try {
      const response = await get<Area[]>('/areas');
      if (response.data) { setAreas(Array.isArray(response.data) ? response.data : []); }
    } catch (err) {
      console.error('Failed to fetch areas:', err);
    }
  }, []);

  // Initialize map readiness
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => { setMapReady(true); });
    return () => task.cancel();
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchUsers();
    fetchAreas();
  }, [fetchUsers, fetchAreas]);

  // Auto-refresh timer
  const fetchUsersRef = useRef(fetchUsers);
  useEffect(() => { fetchUsersRef.current = fetchUsers; }, [fetchUsers]);

  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      fetchUsersRef.current(false);
    }, config.MAP_REFRESH_INTERVAL);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, []);

  // Event handlers
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers(false);
  }, [fetchUsers]);

  const handleMarkerPress = useCallback((user: ActiveUserData) => {
    setSelectedUser(user);
  }, []);

  const handleCloseInfoCard = useCallback(() => {
    setSelectedUser(null);
  }, []);

  const handleRegionChange = useCallback((region: {
    latitude: number; longitude: number;
    latitudeDelta: number; longitudeDelta: number;
  }) => {
    setCurrentRegion(region);
  }, []);

  const handleAreaFilterPress = useCallback(() => {
    Alert.alert(
      'Filter Area',
      'Pilih area untuk ditampilkan',
      [
        { text: 'Semua Area', onPress: () => setSelectedAreaFilter(null) },
        ...areas.map(area => ({
          text: area.name,
          onPress: () => setSelectedAreaFilter(area.id),
        })),
        { text: 'Batal', style: 'cancel' as const },
      ]
    );
  }, [areas]);

  const handleFitToMarkers = useCallback(() => {
    const filtered = filterUsersByArea(users, selectedAreaFilter);
    const region = calculateMapRegion(filtered, SURABAYA_CENTER);
    mapRef.current?.animateToRegion(region, 500);
  }, [users, selectedAreaFilter, mapRef]);

  // Memoized computed values
  const filteredUsers = useMemo(
    () => filterUsersByArea(users ?? [], selectedAreaFilter),
    [users, selectedAreaFilter]
  );

  const statusSummary = useMemo(
    () => getStatusSummary(filteredUsers, areas),
    [filteredUsers, areas]
  );

  const roleCounts = useMemo(() => {
    const counts: Partial<Record<UserRole, number>> = {};
    for (const role of CLOCKABLE_ROLES) {
      const count = filteredUsers.filter(u => u.role === role).length;
      if (count > 0) { counts[role] = count; }
    }
    const noRole = filteredUsers.filter(u => !u.role).length;
    if (noRole > 0) { counts.satgas = (counts.satgas || 0) + noRole; }
    return counts;
  }, [filteredUsers]);

  const areaCircles = useMemo(() => getAreaCircles(areas), [areas]);

  const initialRegion = useMemo(
    () => calculateMapRegion(filteredUsers, SURABAYA_CENTER),
    [filteredUsers]
  );

  const regionForClustering = currentRegion || initialRegion;
  const hasValidRegion = useMemo(
    () => isValidRegion(regionForClustering),
    [regionForClustering]
  );

  const useClustering = useMemo(
    () => hasValidRegion && shouldCluster(regionForClustering, filteredUsers.length, CLUSTER_THRESHOLD),
    [hasValidRegion, regionForClustering, filteredUsers.length]
  );

  const clusters = useMemo(
    () => (useClustering && hasValidRegion) ? clusterUsers(filteredUsers, regionForClustering) : [],
    [useClustering, hasValidRegion, filteredUsers, regionForClustering]
  );

  const visibleUsers = useMemo(
    () => useClustering
      ? []
      : (currentRegion && isValidRegion(currentRegion))
        ? filterUsersByRegion(filteredUsers, currentRegion)
        : filteredUsers,
    [useClustering, currentRegion, filteredUsers]
  );

  return {
    // State
    users,
    areas,
    selectedUser,
    selectedAreaFilter,
    loading,
    refreshing,
    error,
    mapReady,
    // Computed
    filteredUsers,
    statusSummary,
    roleCounts,
    areaCircles,
    initialRegion,
    regionForClustering,
    useClustering,
    clusters,
    visibleUsers,
    // Handlers
    fetchUsers,
    handleRefresh,
    handleMarkerPress,
    handleCloseInfoCard,
    handleRegionChange,
    handleAreaFilterPress,
    handleFitToMarkers,
  };
}
