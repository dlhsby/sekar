/**
 * Token Utilities
 * JWT token validation and expiry checking
 */

import { getToken } from '../services/storage/secureStorage';

/**
 * Decode JWT token payload (without verification)
 * Use only for debugging and expiry checking
 *
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
function decodeJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) {return null;}

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('[TokenUtils] Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Check if the current access token is expired or will expire soon
 *
 * @param bufferMinutes - Minutes before expiry to consider token expired (default: 1 minute)
 * @returns True if token is expired, expiring soon, or missing
 */
export async function isTokenExpired(bufferMinutes: number = 1): Promise<boolean> {
  try {
    const token = await getToken();
    if (!token) {
      console.debug('[TokenUtils] No token found');
      return true;
    }

    const decoded = decodeJWT(token);
    if (!decoded || !decoded.exp) {
      console.debug('[TokenUtils] Invalid token or missing expiry');
      return true;
    }

    const expiresAt = decoded.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const bufferMs = bufferMinutes * 60 * 1000;
    const isExpired = expiresAt - now < bufferMs;

    if (__DEV__) {
      const timeRemaining = Math.floor((expiresAt - now) / 60000);
      console.debug('[TokenUtils] Token expires at:', new Date(expiresAt).toISOString());
      console.debug('[TokenUtils] Time remaining (minutes):', timeRemaining);
      console.debug('[TokenUtils] Is expired/expiring:', isExpired);
    }

    return isExpired;
  } catch (error) {
    console.error('[TokenUtils] Error checking token expiry:', error);
    return true;
  }
}

/**
 * Get token expiry time
 *
 * @returns Expiry date or null if token invalid
 */
export async function getTokenExpiry(): Promise<Date | null> {
  try {
    const token = await getToken();
    if (!token) {return null;}

    const decoded = decodeJWT(token);
    if (!decoded || !decoded.exp) {return null;}

    return new Date(decoded.exp * 1000);
  } catch (error) {
    console.error('[TokenUtils] Error getting token expiry:', error);
    return null;
  }
}

/**
 * Get time remaining until token expires
 *
 * @returns Minutes until expiry, or null if token invalid
 */
export async function getTokenTimeRemaining(): Promise<number | null> {
  try {
    const expiry = await getTokenExpiry();
    if (!expiry) {return null;}

    const now = Date.now();
    const remaining = Math.floor((expiry.getTime() - now) / 60000);
    return remaining > 0 ? remaining : 0;
  } catch (error) {
    console.error('[TokenUtils] Error getting time remaining:', error);
    return null;
  }
}
