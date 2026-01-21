# Web Real-Time Updates Specification

---

## Overview

Real-time update strategies for the SEKAR web dashboard, including WebSocket integration and polling patterns.

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

### Socket.IO Client Setup

```typescript
// lib/socket.ts
import { io, Socket } from 'socket.io-client';
import { getSession } from 'next-auth/react';

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) {
    return socket;
  }

  const session = await getSession();
  if (!session?.accessToken) {
    throw new Error('Not authenticated');
  }

  socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
    auth: {
      token: session.accessToken,
    },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
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
  const { data: session } = useSession();

  useEffect(() => {
    if (!session) {
      disconnectSocket();
      setSocket(null);
      setIsConnected(false);
      return;
    }

    connectSocket().then((s) => {
      setSocket(s);
      setIsConnected(s.connected);

      s.on('connect', () => setIsConnected(true));
      s.on('disconnect', () => setIsConnected(false));
    });

    return () => {
      disconnectSocket();
    };
  }, [session]);

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

### Map with Real-Time Workers

```typescript
// components/dashboard/LiveMap.tsx
'use client';

import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { useSocketRoom } from '@/hooks/useSocketRoom';
import { LocationUpdate } from '@/types/socket-events';

interface WorkerMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lastUpdate: Date;
}

export function LiveMap({ areas }: { areas: Area[] }) {
  const [workers, setWorkers] = useState<Map<string, WorkerMarker>>(new Map());

  // Subscribe to all areas
  areas.forEach((area) => {
    useSocketRoom(`area:${area.id}`);
  });

  // Handle location updates
  const handleLocationUpdate = useCallback((data: LocationUpdate) => {
    setWorkers((prev) => {
      const next = new Map(prev);
      next.set(data.workerId, {
        id: data.workerId,
        name: data.workerName,
        lat: data.latitude,
        lng: data.longitude,
        lastUpdate: new Date(data.timestamp),
      });
      return next;
    });
  }, []);

  useSocketEvent<LocationUpdate>('worker:location_update', handleLocationUpdate);

  return (
    <MapContainer
      center={[-7.2756, 112.7138]}
      zoom={13}
      className="h-[500px] rounded-lg"
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {/* Area boundaries */}
      {areas.map((area) => (
        <Circle
          key={area.id}
          center={[area.centerLat, area.centerLng]}
          radius={area.radiusMeters}
          pathOptions={{ color: 'green', fillOpacity: 0.1 }}
        />
      ))}

      {/* Worker markers */}
      {Array.from(workers.values()).map((worker) => (
        <Marker key={worker.id} position={[worker.lat, worker.lng]}>
          <Popup>
            <div>
              <strong>{worker.name}</strong>
              <p className="text-sm text-muted-foreground">
                Update: {formatRelative(worker.lastUpdate, new Date())}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
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

**Last Updated:** 2026-01-16
