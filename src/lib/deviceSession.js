import { db } from '@/lib/db';


const SESSION_KEY = 'app_session_id';

// 1. Get or create a stable device session ID in localStorage
export function getOrCreateDeviceSessionId() {
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = 'device_sn_' + crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

// 2. Register/refresh this device's session on the user profile
export async function registerActiveDeviceSession(user) {
  if (!user) return;
  const sessionId = getOrCreateDeviceSessionId();
  const currentSessions = Array.isArray(user.active_sessions) ? user.active_sessions : [];

  const sessionMeta = {
    id: sessionId,
    userAgent: navigator.userAgent,
    lastActive: Date.now(),
  };

  const index = currentSessions.findIndex(s => s.id === sessionId);
  const updated = [...currentSessions];
  if (index !== -1) updated[index] = sessionMeta;
  else updated.push(sessionMeta);

  await db.auth.updateMe({ active_sessions: updated });
}

// 3. Remove a specific session from the user profile (remote kill)
export async function forceKillRemoteSession(user, targetSessionId) {
  if (!user) return;
  const currentSessions = Array.isArray(user.active_sessions) ? user.active_sessions : [];
  const filtered = currentSessions.filter(s => s.id !== targetSessionId);
  await db.auth.updateMe({ active_sessions: filtered });
}

// 4. Check if this device's session has been remotely killed.
// Fail-safe: only report "dead" when we can positively prove the session was
// removed from a non-empty list. Any missing/empty/unknown state = still alive,
// so transient errors or an un-synced profile never sign the user out.
export function isCurrentSessionAlive(user) {
  const sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId || !user) return true;
  const sessions = Array.isArray(user.active_sessions) ? user.active_sessions : null;
  if (!sessions || sessions.length === 0) return true; // nothing registered yet
  return sessions.some((s) => s && s.id === sessionId);
}
