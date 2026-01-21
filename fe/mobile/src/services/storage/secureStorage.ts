/**
 * Secure Storage Service
 * Encrypted storage for sensitive data (JWT tokens, user info)
 */

import EncryptedStorage from 'react-native-encrypted-storage';
import type { User } from '../../types/models.types';

const KEYS = {
  TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user_data',
};

/**
 * Store JWT token securely
 * @param token - JWT token string
 */
export async function setToken(token: string): Promise<void> {
  try {
    await EncryptedStorage.setItem(KEYS.TOKEN, token);
  } catch (error) {
    console.error('Error storing token:', error);
    throw error;
  }
}

/**
 * Retrieve JWT token
 * @returns JWT token or null
 */
export async function getToken(): Promise<string | null> {
  try {
    return await EncryptedStorage.getItem(KEYS.TOKEN);
  } catch (error) {
    console.error('Error retrieving token:', error);
    return null;
  }
}

/**
 * Remove JWT token
 */
export async function removeToken(): Promise<void> {
  try {
    await EncryptedStorage.removeItem(KEYS.TOKEN);
  } catch (error) {
    console.error('Error removing token:', error);
    throw error;
  }
}

/**
 * Store refresh token securely
 * @param refreshToken - Refresh token string
 */
export async function setRefreshToken(refreshToken: string): Promise<void> {
  try {
    await EncryptedStorage.setItem(KEYS.REFRESH_TOKEN, refreshToken);
  } catch (error) {
    console.error('Error storing refresh token:', error);
    throw error;
  }
}

/**
 * Retrieve refresh token
 * @returns Refresh token or null
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    return await EncryptedStorage.getItem(KEYS.REFRESH_TOKEN);
  } catch (error) {
    console.error('Error retrieving refresh token:', error);
    return null;
  }
}

/**
 * Remove refresh token
 */
export async function removeRefreshToken(): Promise<void> {
  try {
    await EncryptedStorage.removeItem(KEYS.REFRESH_TOKEN);
  } catch (error) {
    console.error('Error removing refresh token:', error);
    throw error;
  }
}

/**
 * Store user data
 * @param user - User object
 */
export async function setUser(user: User): Promise<void> {
  try {
    await EncryptedStorage.setItem(KEYS.USER, JSON.stringify(user));
  } catch (error) {
    console.error('Error storing user data:', error);
    throw error;
  }
}

/**
 * Retrieve user data
 * @returns User object or null
 */
export async function getUser(): Promise<User | null> {
  try {
    const userData = await EncryptedStorage.getItem(KEYS.USER);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error retrieving user data:', error);
    return null;
  }
}

/**
 * Remove user data
 */
export async function removeUser(): Promise<void> {
  try {
    await EncryptedStorage.removeItem(KEYS.USER);
  } catch (error) {
    console.error('Error removing user data:', error);
    throw error;
  }
}

/**
 * Clear all secure storage
 */
export async function clearAll(): Promise<void> {
  try {
    await EncryptedStorage.clear();
  } catch (error) {
    console.error('Error clearing secure storage:', error);
    throw error;
  }
}

/**
 * Check if user is authenticated
 * @returns True if token exists
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return token !== null;
}

