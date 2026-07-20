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
  location_id: string;
}

/**
 * Unsubscribe from area events
 */
export class UnsubscribeAreaDto {
  @IsUUID()
  location_id: string;
}

/**
 * Subscribe to district events
 */
export class SubscribeDistrictDto {
  @IsUUID()
  district_id: string;
}

/**
 * Unsubscribe from district events
 */
export class UnsubscribeDistrictDto {
  @IsUUID()
  district_id: string;
}

/**
 * Subscribe to region events (Phase 5.5b)
 */
export class SubscribeRegionDto {
  @IsUUID()
  region_id: string;
}

/**
 * Unsubscribe from region events (Phase 5.5b)
 */
export class UnsubscribeRegionDto {
  @IsUUID()
  region_id: string;
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
  location_id: string;

  @IsString()
  location_name: string;

  @IsUUID()
  @IsOptional()
  district_id?: string | null;

  @IsUUID()
  @IsOptional()
  region_id?: string | null;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsNumber()
  @IsOptional()
  accuracy?: number | null;

  @IsNumber()
  @IsOptional()
  battery_level?: number | null;

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
  location_id: string;

  @IsString()
  location_name: string;

  @IsUUID()
  @IsOptional()
  district_id?: string | null;

  @IsUUID()
  @IsOptional()
  region_id?: string | null;

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
  location_id: string;

  @IsString()
  location_name: string;

  @IsUUID()
  @IsOptional()
  district_id?: string | null;

  @IsUUID()
  @IsOptional()
  region_id?: string | null;

  timestamp: Date;

  @IsNumber()
  duration_minutes: number;
}

/**
 * Location staffing update event
 */
export class AreaStaffingEvent {
  @IsUUID()
  location_id: string;

  @IsString()
  location_name: string;

  @IsUUID()
  @IsOptional()
  district_id: string | null;

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
  location_id: string;

  @IsString()
  location_name: string;

  @IsUUID()
  @IsOptional()
  district_id: string | null;

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
  location_id: string;

  @IsString()
  location_name: string;

  @IsUUID()
  @IsOptional()
  district_id: string | null;

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
 * Broadcast to: area room, district room, region room, city room
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
  location_id?: string | null;

  @IsString()
  @IsOptional()
  location_name?: string | null;

  @IsUUID()
  @IsOptional()
  district_id?: string | null;

  @IsUUID()
  @IsOptional()
  region_id?: string | null;

  @IsEnum(TrackingStatus)
  previous_status: TrackingStatus;

  @IsEnum(TrackingStatus)
  new_status: TrackingStatus;

  @IsNumber()
  @IsOptional()
  latitude?: number | null;

  @IsNumber()
  @IsOptional()
  longitude?: number | null;

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
 * Broadcast to: area room, district room, region room, city room
 */
export class UserAreaEvent {
  @IsUUID()
  user_id: string;

  @IsString()
  user_name: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsUUID()
  location_id: string;

  @IsString()
  location_name: string;

  @IsUUID()
  @IsOptional()
  district_id?: string | null;

  @IsUUID()
  @IsOptional()
  region_id?: string | null;

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
  previous_area_id?: string | null;

  @IsString()
  @IsOptional()
  previous_area_name?: string | null;

  @IsUUID()
  new_area_id: string;

  @IsString()
  new_area_name: string;

  @IsUUID()
  @IsOptional()
  district_id?: string | null;

  @IsUUID()
  @IsOptional()
  region_id?: string | null;

  timestamp: Date;
}

export class AreaStaffingChangedEvent {
  @IsUUID()
  location_id: string;

  @IsUUID()
  @IsOptional()
  district_id?: string | null;

  @IsUUID()
  @IsOptional()
  region_id?: string | null;

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
