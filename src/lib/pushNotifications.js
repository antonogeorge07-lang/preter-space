import { db } from '@/lib/db';


function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function saveSubscriptionToProfile(subscription) {
  try {
    await db.auth.updateMe({ push_subscription: JSON.stringify(subscription) });
  } catch {}
}

export async function registerPushNotifications() {
  if (!('serviceWorker' in navigator) || !('Notification' in window) || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    // Check for existing subscription first
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      // Fetch public VAPID key from backend (secrets are server-only)
      const keyRes = await db.functions.invoke('getVapidKey', {});
      const VAPID_PUBLIC_KEY = keyRes?.data?.publicKey;
      if (!VAPID_PUBLIC_KEY) return;
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    await saveSubscriptionToProfile(subscription);
    return subscription;
  } catch {
    // Silent fail — push is an enhancement
  }
}

/**
 * Show a local (non-push) notification when the tab is hidden.
 * Use for incoming messages when the user is on another tab.
 */
export function notifyIfHidden({ title = 'Preter', body, url = '/' }) {
  if (document.visibilityState === 'visible') return;
  if (Notification.permission !== 'granted') return;
  const n = new Notification(title, { body, icon: '/icon-192.png', tag: 'preter-live' });
  n.onclick = () => { window.focus(); window.location.href = url; n.close(); };
}

/**
 * Send a real background push to a target user's stored subscription.
 * Call this from anywhere after sending a message.
 */
export async function sendPushToUser({ subscription, title, body, url }) {
  if (!subscription) return;
  try {
    const sub = typeof subscription === 'string' ? JSON.parse(subscription) : subscription;
    await db.functions.invoke('sendPush', { subscription: sub, title, body, url });
  } catch {}
}