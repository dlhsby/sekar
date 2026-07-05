/**
 * Payload structure for JWT refresh tokens.
 *
 * Refresh tokens contain minimal information (only user ID and type)
 * and are used exclusively for obtaining new access tokens.
 */
export interface RefreshTokenPayload {
  /**
   * User ID (subject)
   */
  sub: string;

  /**
   * Token type identifier to distinguish refresh tokens from access tokens
   */
  type: 'refresh';

  /**
   * Issued at timestamp (automatically added by JWT)
   */
  iat?: number;

  /**
   * Expiration timestamp (automatically added by JWT)
   */
  exp?: number;
}
