'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth/hooks';

const ADMIN_ROLES = new Set([
  'admin_rayon',
  'kepala_rayon',
  'management',
  'admin_system',
  'superadmin',
]);

/**
 * Push subscription hook
 *
 * Admin roles only. Subscribes the browser to push notifications using the
 * VAPID public key from NEXT_PUBLIC_VAPID_PUBLIC_KEY and registers the
 * subscription with the backend at POST /api/push/register.
 *
 * On cleanup (unmount or logout), unregisters via POST /api/push/unregister.
 * Any network errors are swallowed — push is non-critical.
 */
export function usePushSubscription() {
  const { user } = useAuth();
  const subscriptionRef = useRef<PushSubscription | null>(null);

  useEffect(() => {
    if (!user) return;
    if (!ADMIN_ROLES.has(user.role)) return;

    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
    if (!vapidKey) return;

    let active = true;

    async function subscribe() {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();

        const subscription =
          existing ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
          }));

        if (!active) return;
        subscriptionRef.current = subscription;

        await fetch('/api/push/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription.toJSON()),
        });
      } catch {
        // Push is non-critical — swallow errors
      }
    }

    subscribe();

    return () => {
      active = false;

      const sub = subscriptionRef.current;
      if (!sub) return;

      // Fire-and-forget unregister
      fetch('/api/push/unregister', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => {
        // Swallow errors
      });
    };
  }, [user]);
}

/**
 * Convert a base64 URL-encoded VAPID key to a Uint8Array for the push manager.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}
