import { IsString, IsUUID, IsNumber, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { UserRole } from '../../modules/users/entities/user.entity';
import {
  TrackingStatus,
  ActivityStatus,
  LocationStatus,
} from '../../modules/monitoring/entities/user-tracking-status.entity';

/**
 * Subscribe to area events
 */
export class SubscribeAreaDto {
  @IsUUID()
  area_id: string;
}

/**
 * Unsubscribe from area events
 */
export class UnsubscribeAreaDto {
  @IsUUID()
  area_id: string;
}

/**
 * Subscribe to rayon events
 */
export class SubscribeRayonDto {
  @IsUUID()
  rayon_id: string;
}

/**
 * Unsubscribe from rayon events
 */
export class UnsubscribeRayonDto {
  @IsUUID()
  rayon_id: string;
}

/**
 * User location update event (Phase 2D enhanced)
 *
 * New fields: status, is_within_area, shift_name
 */
export class UserLocationEvent {
  @IsUUID()
  user_id: string;

  @IsString()
  user_name: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsUUID()
  shift_id: string;

  @IsString()
  shift_name: string;

  @IsUUID()
  area_id: string;

  @IsString()
  area_name: string;

  @IsUUID()
  @IsOptional()
  rayon_id: string | null;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsNumber()
  @IsOptional()
  accuracy: number | null;

  @IsNumber()
  @IsOptional()
  battery_level: number | null;

  @IsEnum(TrackingStatus)
  status: TrackingStatus;

  @IsBoolean()
  is_within_area: boolean;

  @IsString()
  activity: ActivityStatus;

  @IsString()
  location: LocationStatus;

  timestamp: Date;
}

/**
 * User clock-in event
 */
export class UserClockInEvent {
  @IsUUID()
  user_id: string;

  @IsString()
  user_name: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsUUID()
  shift_id: string;

  @IsUUID()
  area_id: string;

  @IsString()
  area_name: string;

  @IsUUID()
  @IsOptional()
  rayon_id: string | null;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  timestamp: Date;
}

/**
 * User clock-out event
 */
export class UserClockOutEvent {
  @IsUUID()
  user_id: string;

  @IsString()
  user_name: string;

  @IsUUID()
  shift_id: string;

  @IsUUID()
  area_id: string;

  @IsString()
  area_name: string;

  @IsUUID()
  @IsOptional()
  rayon_id: string | null;

  timestamp: Date;

  @IsNumber()
  duration_minutes: number;
}

/**
 * Area staffing update event
 */
export class AreaStaffingEvent {
  @IsUUID()
  area_id: string;

  @IsString()
  area_name: string;

  @IsUUID()
  @IsOptional()
  rayon_id: string | null;

  workers_required: number;
  workers_online: number;
  workers_offline: number;
  is_fully_staffed: boolean;
  staffing_delta: number;

  timestamp: Date;
}

/**
 * Task assigned event
 */
export class TaskAssignedEvent {
  @IsUUID()
  task_id: string;

  @IsString()
  title: string;

  @IsUUID()
  area_id: string;

  @IsString()
  area_name: string;

  @IsUUID()
  @IsOptional()
  rayon_id: string | null;

  @IsUUID()
  assigned_to: string;

  @IsString()
  assignee_name: string;

  @IsString()
  priority: string;

  deadline?: Date;

  timestamp: Date;
}

/**
 * Task completed event
 */
export class TaskCompletedEvent {
  @IsUUID()
  task_id: string;

  @IsString()
  title: string;

  @IsUUID()
  area_id: string;

  @IsString()
  area_name: string;

  @IsUUID()
  @IsOptional()
  rayon_id: string | null;

  @IsUUID()
  completed_by: string;

  @IsString()
  completer_name: string;

  timestamp: Date;
}

/**
 * User status changed event (Phase 2D)
 *
 * Emitted when a user's tracking status transitions between states.
 * Broadcast to: area room, rayon room, city room
 */
export class UserStatusChangedEvent {
  @IsUUID()
  user_id: string;

  @IsString()
  user_name: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsUUID()
  @IsOptional()
  area_id: string | null;

  @IsString()
  @IsOptional()
  area_name: string | null;

  @IsUUID()
  @IsOptional()
  rayon_id: string | null;

  @IsEnum(TrackingStatus)
  previous_status: TrackingStatus;

  @IsEnum(TrackingStatus)
  new_status: TrackingStatus;

  @IsNumber()
  @IsOptional()
  latitude: number | null;

  @IsNumber()
  @IsOptional()
  longitude: number | null;

  @IsString()
  activity: ActivityStatus;

  @IsString()
  location: LocationStatus;

  timestamp: Date;
}

/**
 * User left area / entered area event (Phase 2D)
 *
 * Emitted when boundary crossing is detected.
 * Broadcast to: area room, rayon room, city room
 */
export class UserAreaEvent {
  @IsUUID()
  user_id: string;

  @IsString()
  user_name: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsUUID()
  area_id: string;

  @IsString()
  area_name: string;

  @IsUUID()
  @IsOptional()
  rayon_id: string | null;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  timestamp: Date;
}

/**
 * Event types enumeration
 */
export class UserReassignedEvent {
  @IsUUID()
  user_id: string;

  @IsString()
  user_name: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsUUID()
  @IsOptional()
  previous_area_id: string | null;

  @IsString()
  @IsOptional()
  previous_area_name: string | null;

  @IsUUID()
  new_area_id: string;

  @IsString()
  new_area_name: string;

  @IsUUID()
  @IsOptional()
  rayon_id: string | null;

  timestamp: Date;
}

export class AreaStaffingChangedEvent {
  @IsUUID()
  area_id: string;

  @IsUUID()
  @IsOptional()
  rayon_id: string | null;

  @IsNumber()
  active_count: number;

  @IsNumber()
  required_count: number;

  @IsBoolean()
  is_met: boolean;

  timestamp: Date;
}

export enum EventType {
  // Location & status
  USER_LOCATION = 'user:location',
  USER_STATUS_CHANGED = 'user:status-changed',
  USER_LEFT_AREA = 'user:left-area',
  USER_ENTERED_AREA = 'user:entered-area',
  USER_REASSIGNED = 'user:reassigned',

  // Shift lifecycle
  USER_CLOCK_IN = 'user:clock-in',
  USER_CLOCK_OUT = 'user:clock-out',

  // Operational
  AREA_STAFFING = 'area:staffing',
  AREA_STAFFING_CHANGED = 'area:staffing-changed',
  TASK_ASSIGNED = 'task:assigned',
  TASK_COMPLETED = 'task:completed',
}
