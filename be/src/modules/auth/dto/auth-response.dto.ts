import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

/**
 * Data Transfer Object for authentication response.
 *
 * Returned after successful login containing JWT token and user information.
 */
export class AuthResponseDto {
  /**
   * JWT access token for API authentication.
   * Include this token in Authorization header as "Bearer {token}".
   *
   * @example 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
   */
  @ApiProperty({
    description: 'JWT access token',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidXNlcm5hbWUiOiJ3b3JrZXIxIiwicm9sZSI6IndvcmtlciIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  })
  access_token: string;

  /**
   * Authenticated user information.
   */
  @ApiProperty({
    description: 'User information',
    example: {
      id: '8127dc81-97cf-4c6e-a1b4-b1ace284ea78',
      username: 'worker1',
      full_name: 'Pekerja Satu',
      role: 'worker',
    },
  })
  user: {
    id: string;
    username: string;
    full_name: string;
    role: UserRole;
  };
}
