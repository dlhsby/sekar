import * as admin from 'firebase-admin';
import { join } from 'path';
import { Logger } from '@nestjs/common';

let firebaseApp: admin.app.App | null = null;
const logger = new Logger('FirebaseConfig');

/**
 * Initialize Firebase Admin SDK
 *
 * This function loads the Firebase service account credentials and initializes
 * the Firebase Admin SDK for sending push notifications via FCM HTTP v1 API.
 *
 * @returns The initialized Firebase app instance
 * @throws Error if service account file is missing or invalid
 */
export function initializeFirebase(): admin.app.App {
  if (firebaseApp) {
    logger.log('Firebase Admin SDK already initialized');
    return firebaseApp;
  }

  // Check if FCM is enabled
  const fcmEnabled = process.env.FCM_ENABLED === 'true';
  if (!fcmEnabled) {
    logger.warn('FCM is disabled (FCM_ENABLED=false). Push notifications will not be sent.');
    throw new Error('FCM is disabled');
  }

  // Get service account path from environment
  const serviceAccountPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './config/firebase-service-account.json';
  const absolutePath = join(process.cwd(), serviceAccountPath);

  try {
    // Load service account JSON
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serviceAccount = require(absolutePath);

    // Validate service account structure
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error('Invalid service account JSON: missing required fields');
    }

    // Initialize Firebase Admin SDK
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    // Use console.log during bootstrap (before NestJS logger is ready)
    console.log(
      `✅ Firebase Admin SDK initialized successfully (Project: ${serviceAccount.project_id})`,
    );
    logger.log(
      `Firebase Admin SDK initialized successfully (Project: ${serviceAccount.project_id})`,
    );
    return firebaseApp;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      logger.error(
        `Firebase service account file not found at: ${absolutePath}\n` +
          'Please download the service account JSON from Firebase Console:\n' +
          '1. Go to Firebase Console → Project Settings → Service Accounts\n' +
          '2. Click "Generate new private key"\n' +
          `3. Save the file to: ${absolutePath}\n` +
          '4. Ensure the file is in .gitignore',
      );
    } else {
      logger.error('Failed to initialize Firebase Admin SDK:', error.message);
    }
    throw error;
  }
}

/**
 * Get Firebase Messaging instance
 *
 * @returns Firebase Messaging instance for sending FCM messages
 * @throws Error if Firebase is not initialized or disabled
 */
export function getMessaging(): admin.messaging.Messaging {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.messaging();
}

/**
 * Check if Firebase is initialized and ready
 *
 * @returns True if Firebase is initialized, false otherwise
 */
export function isFirebaseInitialized(): boolean {
  return firebaseApp !== null;
}

/**
 * Clean up Firebase resources (for testing)
 */
export async function cleanupFirebase(): Promise<void> {
  if (firebaseApp) {
    await firebaseApp.delete();
    firebaseApp = null;
    logger.log('Firebase Admin SDK cleaned up');
  }
}
