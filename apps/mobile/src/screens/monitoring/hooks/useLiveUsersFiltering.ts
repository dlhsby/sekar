/**
 * useLiveUsersFiltering Hook
 * Computes filtered users, clustering, label mode, and summary statistics.
 * Consolidated from MapDashboardScreen lines 290–361.
 */

import React, { useMemo } from 'react';
import { clusterUsers, shouldCluster } from '../../../utils/mapUtils';
import { userAxes } from '../../../utils/statusHelpers';
import { scopeMatches } from '../../../utils/monitoringScope';
import { groupWorkersByTeam, isTeamGroup, type TeamGroup } from '../../../utils/teamGrouping';
import type { LiveUser, UserRole, PresenceActivity } from '../../../types/models.types';
import type { MonitoringFilters } from '../../../types/api.types';
import type { MonitoringV2VisibleLayers } from '../../../store/slices/monitoringV2Slice';

type LabelMode = 'none' | 'abbrev' | 'full';

interface UseLiveUsersFilteringReturn {
  /** Individual worker pins to render (team members collapsed out, unless a team is selected). */
  visibleUsers: LiveUser[];
  /** Collapsed team bubbles (≥2 members) to render alongside the pins (empty when a team is selected). */
  teamBubbles: TeamGroup[];
  useClustering: boolean;
  clusters: any[];
  labelMode: LabelMode;
  staffedAreas: number;
  totalAreas: number;
  lastUpdated: string | null;
}

export function useLiveUsersFiltering(
  liveUsers: LiveUser[],
  activityFilter: PresenceActivity | null,
  filters: MonitoringFilters,
  visibleLayers: MonitoringV2VisibleLayers,
  currentRegion: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number },
  boundaries: any,
  scope: 'city' | 'district' | 'region' | 'location',
  viewId: string | null,
  /** When set, show ONLY that team's members (as pins) and hide the rest (ADR-048). */
  selectedTeamId: string | null = null,
): UseLiveUsersFilteringReturn {
  const scopedUsers = React.useMemo(() => {
    if (!visibleLayers.workers) { return []; }
    if (!Array.isArray(liveUsers)) { return []; }
    let users = liveUsers.filter(u => u.status !== 'offline');
    // Render each worker at their OWN drill tier: keep only those whose occurrence
    // `display_scope` matches the current scope (+ node id below city). City scope
    // thus shows city/ad-hoc "Luar Jadwal" workers; a location shows its own crew.
    users = users.filter(u => scopeMatches(u, scope, viewId));
    if (activityFilter) {
      users = users.filter(u => userAxes(u).activity === activityFilter);
    }
    if (filters.location && filters.location.length > 0) {
      const locs = filters.location;
      users = users.filter(u => locs.includes(userAxes(u).location));
    }
    return users;
  }, [liveUsers, activityFilter, filters.location, visibleLayers.workers, scope, viewId]);

  // Collapse ≥2-member teams into team bubbles (ADR-048). With a team selected,
  // show ONLY its members as individual pins and no team bubbles — so `visibleUsers`
  // (and thus clustering below) stays consistent with what's on the map.
  const { visibleUsers, teamBubbles } = React.useMemo(() => {
    if (selectedTeamId) {
      return {
        visibleUsers: scopedUsers.filter(u => u.team_id === selectedTeamId),
        teamBubbles: [] as TeamGroup[],
      };
    }
    const renderables = groupWorkersByTeam(scopedUsers);
    return {
      visibleUsers: renderables.filter((r): r is LiveUser => !isTeamGroup(r)),
      teamBubbles: renderables.filter(isTeamGroup),
    };
  }, [scopedUsers, selectedTeamId]);

  const staffedAreas = useMemo(() => {
    if (!Array.isArray(liveUsers)) { return 0; }
    const ids = new Set(
      liveUsers.filter(u => u.status === 'active' && u.location_id).map(u => u.location_id),
    );
    return ids.size;
  }, [liveUsers]);

  const totalAreas = useMemo(() => {
    if (!boundaries?.districts) { return 0; }
    return boundaries.districts.reduce((sum: number, r: any) => sum + (r.areas?.length ?? 0), 0);
  }, [boundaries]);

  const lastUpdated = useMemo(() => {
    if (!Array.isArray(liveUsers) || liveUsers.length === 0) { return null; }
    const timestamps = liveUsers
      .map(u => u.last_update)
      .filter(Boolean)
      .map(t => new Date(t!).getTime());
    if (timestamps.length === 0) { return null; }
    return new Date(Math.max(...timestamps)).toISOString();
  }, [liveUsers]);

  const useClustering = React.useMemo(
    // Never cluster while a team is selected — the whole point is to see its
    // individual members, so keep them as pins regardless of zoom.
    () => (selectedTeamId ? false : shouldCluster(currentRegion, visibleUsers.length)),
    [currentRegion, visibleUsers.length, selectedTeamId],
  );

  const clusters = React.useMemo(
    () =>
      useClustering
        ? clusterUsers(
            visibleUsers.map(u => ({
              id: u.id,
              username: u.full_name,
              full_name: u.full_name,
              role: u.role as UserRole,
              shift: { id: u.shift_id, clock_in_time: u.clock_in_time, area: { id: u.location_id ?? '', name: u.location_name } },
              latest_location: { gps_lat: u.latitude, gps_lng: u.longitude, logged_at: u.last_update },
            })),
            currentRegion,
          )
        : [],
    [useClustering, visibleUsers, currentRegion],
  );

  const labelMode = React.useMemo<LabelMode>(() => {
    const delta = currentRegion.latitudeDelta;
    if (delta >= 0.015) { return 'none'; }
    if (delta > 0.005) { return 'abbrev'; }
    return 'full';
  }, [currentRegion.latitudeDelta]);

  return {
    visibleUsers,
    teamBubbles,
    useClustering,
    clusters,
    labelMode,
    staffedAreas,
    totalAreas,
    lastUpdated,
  };
}
