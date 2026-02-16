import { IsString, IsUUID, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { UserRole } from '../../modules/users/entities/user.entity';

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
 * User location update event
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

  @IsUUID()
  area_id: string;

  @IsString()
  area_name: string;

  @IsUUID()
  @IsOptional()
  rayon_id?: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsNumber()
  @IsOptional()
  accuracy?: number;

  @IsNumber()
  @IsOptional()
  battery_level?: number;

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
  rayon_id?: string;

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
  rayon_id?: string;

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
  rayon_id?: string;

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
  rayon_id?: string;

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
  rayon_id?: string;

  @IsUUID()
  completed_by: string;

  @IsString()
  completer_name: string;

  timestamp: Date;
}

/**
 * Event types enumeration
 */
export enum EventType {
  USER_LOCATION = 'user:location',
  USER_CLOCK_IN = 'user:clock-in',
  USER_CLOCK_OUT = 'user:clock-out',
  AREA_STAFFING = 'area:staffing',
  TASK_ASSIGNED = 'task:assigned',
  TASK_COMPLETED = 'task:completed',
}
