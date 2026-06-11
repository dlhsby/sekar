/**
 * useWebSocketUpdates Hook
 * Manages WebSocket subscription lifecycle for real-time user location and status updates.
 * Consolidated from MapDashboardScreen lines 156–235.
 */

import { useEffect } from 'react';
import { AppDispatch } from '../../../store/store';
import websocketService from '../../../services/websocket/websocketService';
import type { UserLocationEvent } from '../../../services/websocket/websocketService';
import type { TrackingStatus, PresenceActivity, PresenceLocation } from '../../../types/models.types';
import { updateLiveUser, fetchStaffingSummary } from '../../../store/slices/monitoringSlice';

export function useWebSocketUpdates(dispatch: AppDispatch): void {
  useEffect(() => {
    let mounted = true;

    const setupWebSocket = async () => {
      const connected = await websocketService.connect();
      if (!connected || !mounted) return;
    };

    void setupWebSocket();

    const unsubLocation = websocketService.onUserLocation((data: UserLocationEvent) => {
      if (!mounted) return;
      dispatch(updateLiveUser({
        id: data.user_id,
        latitude: data.latitude,
        longitude: data.longitude,
        status: data.status as TrackingStatus,
        battery_level: data.battery_level,
        last_update: typeof data.timestamp === 'string' ? data.timestamp : new Date(data.timestamp).toISOString(),
        is_within_area: data.is_within_area,
        ...(data.activity ? { activity: data.activity as PresenceActivity } : {}),
        ...(data.location ? { location: data.location as PresenceLocation } : {}),
      }));
    });

    const unsubStatus = websocketService.onUserStatusChanged((data) => {
      if (!mounted) return;
      dispatch(updateLiveUser({
        id: data.user_id,
        status: data.new_status as TrackingStatus,
        ...(data.activity ? { activity: data.activity } : {}),
        ...(data.location ? { location: data.location } : {}),
      }));
    });

    const unsubLeftArea = websocketService.onUserLeftArea((data) => {
      if (!mounted) return;
      dispatch(updateLiveUser({
        id: data.user_id,
        is_within_area: false,
        outside_boundary: true,
      }));
    });

    const unsubEnteredArea = websocketService.onUserEnteredArea((data) => {
      if (!mounted) return;
      dispatch(updateLiveUser({
        id: data.user_id,
        is_within_area: true,
        outside_boundary: false,
      }));
    });

    const unsubReassigned = websocketService.onUserReassigned((data) => {
      if (!mounted) return;
      dispatch(updateLiveUser({
        id: data.user_id,
        area_id: data.new_area_id,
        area_name: data.new_area_name,
      }));
    });

    const unsubStaffing = websocketService.onAreaStaffingChanged(() => {
      if (!mounted) return;
      dispatch(fetchStaffingSummary(undefined));
    });

    return () => {
      mounted = false;
      unsubLocation();
      unsubStatus();
      unsubLeftArea();
      unsubEnteredArea();
      unsubReassigned();
      unsubStaffing();
    };
  }, [dispatch]);
}
