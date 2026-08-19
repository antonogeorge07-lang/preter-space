/**
 * Personal invite links.
 * A user's invite link points at an open, single-member conversation that any
 * contact can join (`/join/:code`). The code is cached locally so repeated
 * shares never create duplicate invite conversations.
 */
import { convexChat } from '@/lib/convexChat';
import { generateInviteCode, getInviteUrl } from '@/lib/inviteCode';

const CACHE_KEY = 'preter_invite_code';

function readCache() {
  try {
    return localStorage.getItem(CACHE_KEY) || null;
  } catch {
    return null;
  }
}

function writeCache(code) {
  try {
    localStorage.setItem(CACHE_KEY, code);
  } catch {
    /* storage unavailable - link still works this session */
  }
}

/** Returns a shareable invite URL for the current user, creating one if needed. */
export async function ensurePersonalInviteUrl(currentUser) {
  const existing = currentUser?.invite_code || readCache();
  if (existing) return getInviteUrl(existing);

  const me = currentUser?.id || currentUser?.email;
  if (!me) return `${window.location.origin}/landing`;

  const code = generateInviteCode();
  const name = currentUser?.full_name || currentUser?.email || 'You';
  await convexChat.createConversation({
    isGroup: false,
    creatorId: me,
    participantIds: [me],
    title: name,
    participantNames: [name],
    participantLanguages: { [me]: currentUser?.default_language || 'en' },
    preferredLanguage: currentUser?.default_language || 'en',
    inviteCode: code,
    inviteOpen: true,
    unreadCounts: {},
  });
  writeCache(code);
  return getInviteUrl(code);
}
