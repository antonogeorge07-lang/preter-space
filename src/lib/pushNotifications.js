/**
 * Notifications.
 *
 * - Registers the service worker (installable PWA + notification display).
 * - Subscribes the browser to background Web Push (VAPID) so messages arrive
 *   even when no Preter tab is open. The public VAPID key and the subscription
 *   store both live in Convex.
 * - Still shows a local notification when the tab is merely hidden.
 */
import { convexChat } from '@/lib/convexChat';

let swRegistration = null;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Register the SW, ask for permission, and store a background push
 * subscription for `userKey` (the Convex user identity, i.e. email).
 */
export async function registerPushNotifications(userKey) {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;
  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    if (userKey && Notification.permission === 'granted') {
      await subscribeToBackgroundPush(userKey);
    }
    return swRegistration;
  } catch {
    return null;
  }
}

async function subscribeToBackgroundPush(userKey) {
  if (!swRegistration || !('PushManager' in window)) return null;
  try {
    const publicKey = await convexChat.getPushPublicKey();
    if (!publicKey) return null;

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const p256dh = subscription.getKey?.('p256dh');
    const auth = subscription.getKey?.('auth');
    if (!p256dh || !auth) return null;

    await convexChat.savePushSubscription({
      userId: userKey,
      endpoint: subscription.endpoint,
      p256dh: bufferToBase64Url(p256dh),
      auth: bufferToBase64Url(auth),
    });
    return subscription;
  } catch {
    return null;
  }
}

/** Remove this browser's background push subscription (e.g. on sign out). */
export async function unsubscribeFromBackgroundPush() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    await convexChat.removePushSubscription(subscription.endpoint).catch(() => {});
    await subscription.unsubscribe();
  } catch {
    // ignore
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
    // Notification constructor unsupported (e.g. Android Chrome) - ignore.
  }
}
