import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

/**
 * Data Transfer Object for authentication response.
 *
 * Returned after successful login/refresh containing JWT tokens and user information.
 */
export class AuthResponseDto {
  /**
   * JWT access token for API authentication.
   * Include this token in Authorization header as "Bearer {token}".
   * Short-lived token (15 minutes) for API requests.
   *
   * @example 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
   */
  @ApiProperty({
    description: 'JWT access token (15 minutes expiration)',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidXNlcm5hbWUiOiJ3b3JrZXIxIiwicm9sZSI6IndvcmtlciIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  })
  access_token: string;

  /**
   * JWT refresh token for obtaining new access tokens.
   * Long-lived token (7 days) used to refresh expired access tokens.
   * Store securely and use with /auth/refresh endpoint.
   *
   * @example 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
   */
  @ApiProperty({
    description: 'JWT refresh token (7 days expiration) for obtaining new access tokens',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  })
  refresh_token: string;

  /**
   * Authenticated user information.
   */
  @ApiProperty({
    description: 'User information',
    example: {
      id: '8127dc81-97cf-4c6e-a1b4-b1ace284ea78',
      username: 'satgas1',
      full_name: 'Pekerja Satu',
      role: 'satgas',
      location_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      district_id: null,
    },
  })
  user: {
    id: string;
    username: string;
    full_name: string;
    role: UserRole;
    location_id: string | null;
    district_id: string | null;
    kecamatan_id: string | null;
    kecamatan_name: string | null;
    phone_number: string | null;
    profile_picture_url: string | null;
    // Phase 4-7 (M3a): drives the mobile ChangePasswordScreen forced flow.
    password_must_change: boolean;
  };
}
