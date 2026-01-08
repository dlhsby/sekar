/**
 * Authentication and Security Constants
 */
export const AuthConstants = {
  /**
   * Bcrypt salt rounds for password hashing
   * Higher = more secure but slower
   */
  BCRYPT_SALT_ROUNDS: 10,

  /**
   * JWT token expiration default
   */
  JWT_DEFAULT_EXPIRATION: '7d',

  /**
   * Maximum login attempts before lockout (future feature)
   */
  MAX_LOGIN_ATTEMPTS: 5,

  /**
   * Account lockout duration in minutes (future feature)
   */
  LOCKOUT_DURATION_MINUTES: 15,
} as const;

/**
 * Validation Constants
 */
export const ValidationConstants = {
  /**
   * Minimum password length
   */
  PASSWORD_MIN_LENGTH: 6,

  /**
   * Maximum username length
   */
  USERNAME_MAX_LENGTH: 50,

  /**
   * Maximum full name length
   */
  FULL_NAME_MAX_LENGTH: 100,
} as const;


