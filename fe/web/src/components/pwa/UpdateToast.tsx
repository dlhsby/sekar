'use client';

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

/**
 * Service worker update toast
 *
 * Watches `navigator.serviceWorker` for a waiting service worker registration.
 * When a new SW is waiting, shows a Sonner toast with a "Muat ulang" action
 * that sends `SKIP_WAITING` to the SW and reloads the page.
 */
export function UpdateToast() {
  const { t } = useTranslation(['components']);
  const shownRef = useRef(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    function showUpdateToast(registration: ServiceWorkerRegistration) {
      if (shownRef.current) return;
      shownRef.current = true;

      toast(t('components:updateToast.title'), {
        description: t('components:updateToast.description'),
        duration: Infinity,
        action: {
          label: t('components:updateToast.actionLabel'),
          onClick: () => {
            registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          },
        },
        onDismiss: () => {
          shownRef.current = false;
        },
      });
    }

    function checkRegistration(registration: ServiceWorkerRegistration) {
      if (registration.waiting) {
        showUpdateToast(registration);
        return;
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateToast(registration);
          }
        });
      });
    }

    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        checkRegistration(registration);
      }
    });

    // Also listen for controller changes (in case SW activates while page is open)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // This fires after SKIP_WAITING + claim — page is already reloading
    });
  }, []);

  return null;
}
