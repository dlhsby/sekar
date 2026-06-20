# Web Real-Time Updates Specification

**Last Updated:** 2026-06-20
**Status:** Phases 4–5 Complete (Socket.IO + AuthContext; NextAuth.js deprecated; Mapbox GL map, NOT react-leaflet)

---

## Overview

Real-time update strategies for the SEKAR web dashboard, including **Socket.IO Redis adapter** (Phase 3 M2+) integration and polling patterns. Auth via custom `AuthContext` (NOT NextAuth.js).

---

## Technology Options

| Approach | Use Case | Latency |
|----------|----------|---------|
| WebSocket | Live tracking, instant updates | <500ms |
| Server-Sent Events | One-way updates | <1s |
| Polling | Simple refresh, fallback | 5-30s |
| React Query refetch | Data freshness | Configurable |

---

## WebSocket Implementation

### Socket.IO Client Setup (Phase 3 M2+)

> **Updated for AuthContext (Phase 3 M1-R):** Token now comes from `AuthContext`, not NextAuth.

```typescript
// lib/socket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectSocket(accessToken: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  // Token passed from AuthContext (middleware has already verified httpOnly cookie)
  socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000', {
    auth: {
      token: accessToken, // from AuthContext.user.accessToken
    },
    transports: ['websocket'], // fallback to polling if WS unavailable
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    secure: process.env.NODE_ENV === 'production',
  });

  socket.on('connect', () => {
    console.log('WebSocket connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('WebSocket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('WebSocket error:', error);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}
```

### Socket Provider

```typescript
// providers/SocketProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { connectSocket, disconnectSocket } from '@/lib/socket';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth(); // from AuthContext, NOT useSession()

  useEffect(() => {
    if (!user?.accessToken) {
      disconnectSocket();
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const s = connectSocket(user.accessToken);
    setSocket(s);
    setIsConnected(s.connected);

    s.on('connect', () => setIsConnected(true));
    s.on('disconnect', () => setIsConnected(false));

    return () => {
      disconnectSocket();
    };
  }, [user?.accessToken]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
```

### Socket Hooks

```typescript
// hooks/useSocketEvent.ts
import { useEffect } from 'react';
import { useSocket } from '@/providers/SocketProvider';

export function useSocketEvent<T>(
  event: string,
  handler: (data: T) => void
) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler]);
}

// Usage
useSocketEvent<LocationUpdate>('worker:location_update', (data) => {
  console.log('Location update:', data);
  // Update map marker
});
```

### Subscribe to Room

```typescript
// hooks/useSocketRoom.ts
import { useEffect } from 'react';
import { useSocket } from '@/providers/SocketProvider';

export function useSocketRoom(room: string) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.emit('join_room', room);

    return () => {
      socket.emit('leave_room', room);
    };
  }, [socket, room]);
}

// Usage - subscribe to specific area updates
useSocketRoom(`area:${areaId}`);
```

---

## Real-Time Event Types

### Worker Events

```typescript
// types/socket-events.ts
export interface LocationUpdate {
  workerId: string;
  workerName: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  areaId: string;
}

export interface ShiftEvent {
  type: 'clock_in' | 'clock_out';
  workerId: string;
  workerName: string;
  areaId: string;
  areaName: string;
  timestamp: string;
}

export interface ReportEvent {
  reportId: string;
  workerId: string;
  workerName: string;
  areaId: string;
  areaName: string;
  condition: string;
  timestamp: string;
}

export interface TaskEvent {
  type: 'assigned' | 'started' | 'completed';
  taskId: string;
  taskTitle: string;
  workerId: string;
  workerName: string;
  timestamp: string;
}
```

---

## Live Location Tracking

### Map with Real-Time Workers (Phase 2D+ — Mapbox GL, NOT react-leaflet)

> **Deployed change (Phase 2D, Mar 2026):** SEKAR uses **Mapbox GL** for the monitoring map with full polygon boundaries, real-time worker markers, and search. react-leaflet was prototyped but replaced.

```typescript
// fe/web/src/components/monitoring/MonitoringMap.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl, { Map, Marker } from 'mapbox-gl';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { useSocketRoom } from '@/hooks/useSocketRoom';
import { LocationUpdate } from '@/types/socket-events';

interface WorkerMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: 'active' | 'idle' | 'outside_area' | 'missing' | 'offline';
  lastUpdate: Date;
}

export function MonitoringMap({ areas }: { areas: Area[] }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const markers = useRef<Map<string, Marker>>(new Map());
  const [workers, setWorkers] = useState<Map<string, WorkerMarker>>(new Map());

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [112.7138, -7.2756], // Surabaya
      zoom: 13,
    });

    // Add area boundaries as GeoJSON
    areas.forEach((area) => {
      map.current?.addSource(`area-${area.id}`, {
        type: 'geojson',
        data: area.boundary, // GeoJSON polygon
      });
      map.current?.addLayer({
        id: `area-fill-${area.id}`,
        type: 'fill',
        source: `area-${area.id}`,
        paint: { 'fill-color': '#7FBC8C', 'fill-opacity': 0.1 },
      });
    });
  }, [areas]);

  // Subscribe to all areas & handle location updates
  areas.forEach((area) => {
    useSocketRoom(`area:${area.id}`);
  });

  const handleLocationUpdate = useCallback((data: LocationUpdate) => {
    if (!map.current) return;

    setWorkers((prev) => {
      const next = new Map(prev);
      next.set(data.workerId, {
        id: data.workerId,
        name: data.workerName,
        lat: data.latitude,
        lng: data.longitude,
        status: data.status || 'active',
        lastUpdate: new Date(data.timestamp),
      });
      return next;
    });

    // Update or create marker
    let marker = markers.current.get(data.workerId);
    if (!marker) {
      marker = new Marker()
        .setLngLat([data.longitude, data.latitude])
        .addTo(map.current!);
      markers.current.set(data.workerId, marker);
    } else {
      marker.setLngLat([data.longitude, data.latitude]);
    }
  }, []);

  useSocketEvent<LocationUpdate>('worker:location_update', handleLocationUpdate);

  return <div ref={mapContainer} className="h-[500px] rounded-lg border-2 border-nb-black shadow-nb-md" />;
```

---

## Live Activity Feed

```typescript
// components/dashboard/ActivityFeed.tsx
'use client';

import { useState, useCallback } from 'react';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

interface Activity {
  id: string;
  type: 'shift_start' | 'shift_end' | 'report' | 'task';
  message: string;
  timestamp: Date;
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);

  const addActivity = useCallback((activity: Activity) => {
    setActivities((prev) => [activity, ...prev].slice(0, 50)); // Keep last 50
  }, []);

  // Listen for shift events
  useSocketEvent('worker:shift_start', (data: ShiftEvent) => {
    addActivity({
      id: `shift-${Date.now()}`,
      type: 'shift_start',
      message: `${data.workerName} clock in di ${data.areaName}`,
      timestamp: new Date(data.timestamp),
    });
  });

  useSocketEvent('worker:shift_end', (data: ShiftEvent) => {
    addActivity({
      id: `shift-${Date.now()}`,
      type: 'shift_end',
      message: `${data.workerName} clock out dari ${data.areaName}`,
      timestamp: new Date(data.timestamp),
    });
  });

  // Listen for report events
  useSocketEvent('report:new', (data: ReportEvent) => {
    addActivity({
      id: `report-${data.reportId}`,
      type: 'report',
      message: `${data.workerName} membuat laporan di ${data.areaName}`,
      timestamp: new Date(data.timestamp),
    });
  });

  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'shift_start':
        return <PlayCircle className="h-4 w-4 text-green-500" />;
      case 'shift_end':
        return <StopCircle className="h-4 w-4 text-red-500" />;
      case 'report':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'task':
        return <CheckCircle className="h-4 w-4 text-purple-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Aktivitas Terkini
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {activities.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Belum ada aktivitas
              </p>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  {getIcon(activity.type)}
                  <div className="flex-1">
                    <p className="text-sm">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(activity.timestamp, {
                        addSuffix: true,
                        locale: id,
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
```

---

## Polling with React Query

### Auto-Refresh Data

```typescript
// hooks/useReportsWithPolling.ts
export function useReportsWithPolling(filters: ReportFilters) {
  return useQuery({
    queryKey: ['reports', filters],
    queryFn: () => reportsApi.getReports(filters),
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchIntervalInBackground: false, // Don't refetch when tab is hidden
  });
}
```

### Manual Refresh

```typescript
// components/reports/ReportsTable.tsx
export function ReportsTable() {
  const { data, refetch, isFetching } = useReports(filters);

  return (
    <div>
      <div className="flex justify-between">
        <h2>Laporan</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>
      {/* Table content */}
    </div>
  );
}
```

### Invalidate on WebSocket Event

```typescript
// Invalidate query cache when receiving WebSocket event
useSocketEvent('report:new', () => {
  queryClient.invalidateQueries({ queryKey: ['reports'] });
});

useSocketEvent('worker:shift_start', () => {
  queryClient.invalidateQueries({ queryKey: ['active-shifts'] });
});
```

---

## Connection Status Indicator

```typescript
// components/ui/connection-status.tsx
'use client';

import { useSocket } from '@/providers/SocketProvider';
import { Wifi, WifiOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function ConnectionStatus() {
  const { isConnected } = useSocket();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-xs text-green-500">Live</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-400">Offline</span>
            </>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {isConnected
          ? 'Terhubung ke server real-time'
          : 'Tidak terhubung ke server real-time'}
      </TooltipContent>
    </Tooltip>
  );
}
```

---

## Real-Time Stats Card

```typescript
// components/dashboard/LiveStats.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { useDashboardStats } from '@/hooks/useDashboardStats';

export function LiveStats() {
  const { data: initialStats } = useDashboardStats();
  const [stats, setStats] = useState(initialStats);

  // Update stats on initial load
  useEffect(() => {
    if (initialStats) setStats(initialStats);
  }, [initialStats]);

  // Listen for real-time updates
  useSocketEvent('worker:shift_start', () => {
    setStats((prev) => prev && { ...prev, activeWorkers: prev.activeWorkers + 1 });
  });

  useSocketEvent('worker:shift_end', () => {
    setStats((prev) => prev && { ...prev, activeWorkers: prev.activeWorkers - 1 });
  });

  useSocketEvent('report:new', () => {
    setStats((prev) => prev && { ...prev, todayReports: prev.todayReports + 1 });
  });

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard
        title="Petugas Aktif"
        value={stats?.activeWorkers ?? 0}
        icon={Users}
        live
      />
      <StatCard
        title="Laporan Hari Ini"
        value={stats?.todayReports ?? 0}
        icon={FileText}
        live
      />
      {/* More stats */}
    </div>
  );
}
```

---

## Notification Toast

```typescript
// hooks/useRealtimeNotifications.ts
import { useToast } from '@/components/ui/use-toast';
import { useSocketEvent } from '@/hooks/useSocketEvent';

export function useRealtimeNotifications() {
  const { toast } = useToast();

  useSocketEvent('report:new', (data: ReportEvent) => {
    toast({
      title: 'Laporan Baru',
      description: `${data.workerName} membuat laporan di ${data.areaName}`,
      action: (
        <ToastAction altText="Lihat" onClick={() => router.push(`/reports/${data.reportId}`)}>
          Lihat
        </ToastAction>
      ),
    });
  });

  useSocketEvent('alert:urgent', (data: AlertEvent) => {
    toast({
      variant: 'destructive',
      title: 'Peringatan!',
      description: data.message,
    });
  });
}
```

---

## Environment Variables

```env
# WebSocket
NEXT_PUBLIC_WS_URL=ws://localhost:3000
```

---

## Dependencies

```bash
npm install socket.io-client
```

---

## Best Practices

1. **Reconnection Handling**: Implement automatic reconnection with exponential backoff
2. **State Sync**: Re-fetch data on reconnect to ensure consistency
3. **Cleanup**: Always disconnect and clean up listeners on unmount
4. **Error Boundaries**: Wrap real-time components in error boundaries
5. **Fallback**: Use polling as fallback when WebSocket is unavailable
6. **Batching**: Batch rapid updates to prevent UI thrashing

---

## Phase 2D: Enhanced WebSocket Events

### New Events (3)

| Event | Payload | Action |
|-------|---------|--------|
| `user:status-changed` | `{ user_id, user_name, role, area_id, area_name, rayon_id, previous_status, new_status, latitude, longitude, timestamp }` | Update user in TanStack Query cache, recalculate status counts, toast if new_status is 'missing' |
| `user:left-area` | `{ user_id, user_name, role, area_id, area_name, rayon_id, latitude, longitude, timestamp }` | Update user `is_within_area` to false, visual warning on marker |
| `user:entered-area` | `{ user_id, user_name, role, area_id, area_name, rayon_id, latitude, longitude, timestamp }` | Update user `is_within_area` to true, clear warning |

### Enhanced Existing Event

| Event | New Fields | Description |
|-------|-----------|-------------|
| `user:location` | `status: TrackingStatus`, `is_within_area: boolean`, `shift_name: string` | Real-time location with computed status and boundary check |

### TanStack Query Cache Invalidation

```typescript
// On user:status-changed event
queryClient.setQueryData(['monitoring', 'live-users'], (old) => {
  // Update specific user's status in cached data
  // Recalculate status count totals
});

// On user:left-area / user:entered-area
queryClient.setQueryData(['monitoring', 'live-users'], (old) => {
  // Update specific user's is_within_area flag
});

// Toast notification for missing status
if (event.new_status === 'missing') {
  toast.warning(`${event.user_name} tidak terdeteksi di ${event.area_name}`);
}
```

### WebSocket Room Assignment (Phase 2D Fix)

```typescript
// Auto-join based on role (fixed PascalCase bug)
switch (user.role) {
  case 'superadmin':
  case 'admin_system':
  case 'top_management':
    socket.emit('join', { room: 'city' });
    break;
  case 'kepala_rayon':
  case 'admin_data':
    socket.emit('join', { room: `rayon:${user.rayon_id}` });
    break;
  case 'korlap':
    socket.emit('join', { room: `area:${user.area_id}` });
    break;
}
```

**Last Updated:** 2026-03-03

**Last Updated:** 2026-01-16
