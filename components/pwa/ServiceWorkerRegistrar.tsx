"use client";

import { useEffect } from 'react';

/**
 * Real notifications for StrayBuddy.
 *
 * Two things happen here:
 *   1. the service worker is registered (so the app installs and can show
 *      notifications even when the page is closed)
 *   2. `notify()` asks for permission once, then hands the message to the
 *      worker, which draws the real system notification.
 *
 * The permission prompt is never shown on load: browsers frown on that, and a
 * prompt with no context gets refused. It fires the first time there is
 * actually something to say.
 */
export const NOTIFY_EVENT = 'straybuddy:notify';

type NotifyDetail = { title: string; body?: string; url?: string; tag?: string };

/** Show a real notification through the service worker, falling back to the page. */
export async function notify(detail: NotifyDetail) {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;

  let permission = Notification.permission;
  if (permission === 'default') {
    try {
      permission = await Notification.requestPermission();
    } catch {
      return false;
    }
  }
  if (permission !== 'granted') return false;

  const registration = await navigator.serviceWorker?.ready.catch(() => null);
  if (registration && 'active' in registration && registration.active) {
    registration.active.postMessage({ type: 'sb-notify', ...detail });
    return true;
  }

  // No worker yet (first run): a plain page notification still works.
  try {
    new Notification(detail.title, { body: detail.body, icon: '/icon.svg', tag: detail.tag });
    return true;
  } catch {
    return false;
  }
}

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    // The page can ask for a notification with a window event.
    const onNotify = (event: Event) => notify((event as CustomEvent<NotifyDetail>).detail);
    window.addEventListener(NOTIFY_EVENT, onNotify);

    if ('serviceWorker' in navigator && window.isSecureContext) {
      const register = () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
          /* installability is a bonus, never a blocker */
        });
      };

      if (document.readyState === 'complete') register();
      else window.addEventListener('load', register, { once: true });
    }

    return () => window.removeEventListener(NOTIFY_EVENT, onNotify);
  }, []);

  return null;
}
