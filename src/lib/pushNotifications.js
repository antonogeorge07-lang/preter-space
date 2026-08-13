/**
 * Notifications.
 *
 * The app registers a service worker (installable PWA + notification display)
 * and shows local notifications for incoming messages when the tab isn't the
 * active one. Server-sent background push (VAPID) is not enabled, so there is
 * no dead backend call here — notifications are delivered by the client while
 * a Preter tab is open.
 */

let swRegistration = null;

export async function registerPushNotifications() {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;
  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    return swRegistration;
  } catch {
    return null;
  }
}

/**
 * Show a local notification when the tab is hidden.
 */
export function notifyIfHidden({ title = 'Preter', body, url = '/' }) {
  if (typeof window === 'undefined') return;
  if (document.visibilityState === 'visible') return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const options = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'preter-message',
    data: { url },
  };

  if (swRegistration?.showNotification) {
    swRegistration.showNotification(title, options).catch(() => {});
    return;
  }

  try {
    const n = new Notification(title, options);
    n.onclick = () => { window.focus(); window.location.href = url; n.close(); };
  } catch {
    // Notification constructor unsupported (e.g. Android Chrome) — ignore.
  }
}
