/**
 * WebSocket Service Index
 * Export WebSocket service and related types
 */

export { default as websocketService } from './websocketService';
export { EventType, ConnectionState } from './websocketService';
export type {
  UserLocationEvent,
  UserClockInEvent,
  UserClockOutEvent,
  AreaStaffingEvent,
  TaskAssignedEvent,
  TaskCompletedEvent,
  EventHandler,
} from './websocketService';
