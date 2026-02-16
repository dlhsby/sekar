/**
 * Cookie Utilities
 * Client-side cookie management for authentication
 */

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name) {
      return decodeURIComponent(cookieValue);
    }
  }
  return undefined;
}

/**
 * Set a cookie
 */
export function setAuthCookie(
  name: string,
  value: string,
  options: {
    expires?: Date;
    maxAge?: number;
    path?: string;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  } = {}
): void {
  if (typeof document === 'undefined') return;

  const {
    expires,
    maxAge,
    path = '/',
    // Only use secure cookies if explicitly enabled via env var OR in production HTTPS
    // For HTTP testing, set NEXT_PUBLIC_SECURE_COOKIES=false
    secure = process.env.NEXT_PUBLIC_SECURE_COOKIES === 'true',
    sameSite = 'lax',
  } = options;

  let cookieString = `${name}=${encodeURIComponent(value)}`;

  if (expires) {
    cookieString += `; expires=${expires.toUTCString()}`;
  }
  if (maxAge !== undefined) {
    cookieString += `; max-age=${maxAge}`;
  }
  cookieString += `; path=${path}`;
  if (secure) {
    cookieString += '; secure';
  }
  cookieString += `; samesite=${sameSite}`;

  document.cookie = cookieString;
}

/**
 * Delete a cookie by name
 */
export function deleteCookie(name: string, path: string = '/'): void {
  if (typeof document === 'undefined') return;

  // Set cookie with expired date to delete it
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
}

/**
 * Clear all auth-related cookies
 * Used when logging out or when auth fails
 */
export function clearAuthCookies(): void {
  deleteCookie('access_token');
  deleteCookie('refresh_token');
}

/**
 * Check if auth cookies exist
 * Note: This only checks if cookies exist, not if they're valid
 */
export function hasAuthCookies(): boolean {
  return getCookie('access_token') !== undefined;
}
