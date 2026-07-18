/**
 * useMonitoringSocket — subscribes to the backend Socket.IO `/events` namespace
 * and applies incremental patches to the cached monitoring snapshot, replacing
 * the old full-refresh poll. The server assigns each client to its role room
 * (monitoring:city | rayon:{id} | area:{id}) on connect, so no explicit
 * subscription is needed here.
 *
 * Patches are applied to every cached snapshot query in place via
 * queryClient.setQueriesData, so markers update without remounting. Staffing
 * changes invalidate the lightweight aggregate ("Ringkasan") rollups.
 */
import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { getCookie } from '../utils/cookies';
import { snapshotKeys, aggregateKeys, type MonitoringSnapshotResponse } from '../api/monitoring-v2';
import { applyWorkerPatch, applyWorkerRemoved, type WorkerPatch } from './patch-reducers';
import type {
  UserStatusChangedEvent,
  UserAreaEvent,
} from '../api/monitoring-types';

// Empty NEXT_PUBLIC_API_URL = same origin (works on localhost + any LAN host via
// the dev proxy); server-side has no origin, so fall back to the local backend.
const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

interface UserLocationWsEvent {
  user_id: string;
  user_name: string;
  role: string;
  location_id: string;
  area_name: string;
  rayon_id: string | null;
  latitude: number;
  longitude: number;
  battery_level: number | null;
  status: string;
  is_within_area: boolean;
  timestamp: string;
}

interface UserReassignedWsEvent {
  user_id: string;
  location_id: string;
  area_name: string;
  rayon_id: string | null;
  timestamp: string;
}

interface UserClockEvent {
  user_id: string;
  timestamp: string;
}

/**
 * Connect to the monitoring socket and patch snapshot caches in place.
 * `enabled` gates the connection (e.g. only for roles that can monitor).
 */
export function useMonitoringSocket(enabled: boolean): { connected: boolean } {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const token = getCookie('access_token');
    if (!token) return;

    // Patch every cached snapshot query (city/rayon/area) with the given worker patch.
    const patchWorker = (patch: WorkerPatch) => {
      queryClient.setQueriesData<MonitoringSnapshotResponse>(
        { queryKey: snapshotKeys.all },
        (prev) =>
          prev ? { ...prev, data: applyWorkerPatch(prev.data, patch) } : prev
      );
    };

    const removeWorker = (userId: string) => {
      queryClient.setQueriesData<MonitoringSnapshotResponse>(
        { queryKey: snapshotKeys.all },
        (prev) =>
          prev ? { ...prev, data: applyWorkerRemoved(prev.data, userId) } : prev
      );
    };

    const socket = io(`${API_ORIGIN}/events`, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1_000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // Reconcile any missed events after a reconnect.
      queryClient.invalidateQueries({ queryKey: snapshotKeys.all });
      queryClient.invalidateQueries({ queryKey: aggregateKeys.all });
    });
    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('user:location', (e: UserLocationWsEvent) => {
      patchWorker({
        user_id: e.user_id,
        full_name: e.user_name,
        role: e.role,
        status: e.status as WorkerPatch['status'],
        lat: e.latitude,
        lng: e.longitude,
        location_id: e.location_id,
        area_name: e.area_name,
        rayon_id: e.rayon_id,
        is_within_area: e.is_within_area,
        battery_level: e.battery_level,
        last_update: e.timestamp,
      });
    });

    socket.on('user:status-changed', (e: UserStatusChangedEvent) => {
      patchWorker({
        user_id: e.user_id,
        status: e.new_status,
        location_id: e.location_id,
        area_name: e.area_name,
        rayon_id: e.rayon_id,
        lat: e.latitude ?? undefined,
        lng: e.longitude ?? undefined,
        last_update: e.timestamp,
      });
    });

    const onAreaEvent = (within: boolean) => (e: UserAreaEvent) => {
      patchWorker({
        user_id: e.user_id,
        is_within_area: within,
        lat: e.latitude,
        lng: e.longitude,
        last_update: e.timestamp,
      });
    };
    socket.on('user:entered-area', onAreaEvent(true));
    socket.on('user:left-area', onAreaEvent(false));

    socket.on('user:reassigned', (e: UserReassignedWsEvent) => {
      patchWorker({
        user_id: e.user_id,
        location_id: e.location_id,
        area_name: e.area_name,
        rayon_id: e.rayon_id,
        last_update: e.timestamp,
      });
    });

    socket.on('user:clock-out', (e: UserClockEvent) => removeWorker(e.user_id));

    socket.on('area:staffing-changed', () => {
      // Bubble counts are derived server-side; refetch the light aggregate.
      // TODO(5.6b): emit subscribe:region on region drill for direct room patches
      // (currently region aggregates refresh via the invalidation above).
      queryClient.invalidateQueries({ queryKey: aggregateKeys.all });
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [enabled, queryClient]);

  return { connected };
}
