import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

class AssignedAreaTypeDto {
  @ApiProperty({ example: 'area-type-uuid' })
  id: string;

  @ApiProperty({ example: 'Taman Kota' })
  name: string;
}

class AssignedAreaDto {
  @ApiProperty({ example: 'area-uuid' })
  id: string;

  @ApiProperty({ example: 'Taman Bungkul' })
  name: string;

  @ApiProperty({ example: -7.2906 })
  gps_lat: number;

  @ApiProperty({ example: 112.7383 })
  gps_lng: number;

  @ApiProperty({ example: 200 })
  radius_meters: number;

  @ApiPropertyOptional({
    description: 'GeoJSON Polygon boundary for polygon-based geofencing',
    nullable: true,
  })
  boundary_polygon?: object | null;

  @ApiPropertyOptional({ type: AssignedAreaTypeDto, nullable: true })
  area_type: AssignedAreaTypeDto | null;
}

/**
 * Response DTO for GET /auth/me
 *
 * Returns current user profile with resolved area/rayon assignment.
 */
export class MeResponseDto {
  @ApiProperty({ example: 'user-uuid' })
  id: string;

  @ApiProperty({ example: 'satgas1' })
  username: string;

  @ApiProperty({ example: 'Pekerja Satu' })
  full_name: string;

  @ApiPropertyOptional({ example: '081234567890', nullable: true })
  phone_number?: string | null;

  @ApiPropertyOptional({
    description: 'Profile picture as base64 data URI',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    nullable: true,
  })
  profile_picture_url?: string | null;

  @ApiProperty({ enum: UserRole, example: UserRole.SATGAS })
  role: UserRole;

  @ApiPropertyOptional({ example: 'area-uuid', nullable: true })
  area_id: string | null;

  @ApiPropertyOptional({ example: 'rayon-uuid', nullable: true })
  rayon_id: string | null;

  @ApiPropertyOptional({ example: 'Tegalsari', nullable: true })
  kecamatan_name?: string | null;

  @ApiPropertyOptional({ example: 'kecamatan-uuid', nullable: true })
  kecamatan_id?: string | null;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  created_at: Date;

  @ApiPropertyOptional({ type: AssignedAreaDto, nullable: true })
  assigned_area?: AssignedAreaDto | null;

  // Phase 4-7 (M3a): mobile reads this to gate ChangePasswordScreen.
  @ApiProperty({ example: false })
  password_must_change: boolean;

  // Dynamic RBAC (ADR-044): the caller's granted permission keys (may include
  // wildcards like `*:*`, `user:*`). Powers the web `usePermissions()` hook.
  @ApiProperty({ type: [String], example: ['role:read', 'user:*'] })
  permissions: string[];
}
