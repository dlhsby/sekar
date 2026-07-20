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
 * Returns current user profile with resolved area/district assignment.
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
  location_id: string | null;

  @ApiPropertyOptional({ example: 'district-uuid', nullable: true })
  district_id: string | null;

  @ApiPropertyOptional({
    description: 'Region (Kawasan) assignment — the static fallback scope for korlap (ADR-045).',
    example: 'region-uuid',
    nullable: true,
  })
  region_id?: string | null;

  @ApiProperty({
    description:
      "The role's monitoring scope (ADR-044/046): where the caller lands + what they may view on " +
      'the map — city | district | region | location | none.',
    example: 'region',
  })
  monitoring_scope: string;

  @ApiProperty({
    description:
      'Permanent location assignments (korlap multi-location). The STATIC fallback for monitoring ' +
      "coverage — a korlap's live coverage is derived server-side from today's schedule occurrences; " +
      'these apply only when no occurrence exists.',
    type: [String],
    example: ['location-uuid-1', 'location-uuid-2'],
  })
  assigned_location_ids: string[];

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
