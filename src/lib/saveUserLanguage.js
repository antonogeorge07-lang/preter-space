import { db } from '@/lib/db';
import { convexChat } from '@/lib/convexChat';

/**
 * Persist the user's selected target language everywhere:
 * the auth profile (Supabase) and the Convex user document, so translation
 * always has a language for this account.
 *
 * @param {string} language e.g. "en", "es", "ja"
 * @param {object} [user] optional already-loaded user; fetched when omitted
 */
export async function saveUserLanguage(language, user) {
  if (!language) return null;

  try {
    await db.auth.updateMe({ default_language: language });
  } catch {
    /* profile update is best-effort */
  }

  let me = user;
  if (!me?.email) {
    try {
      me = await db.auth.me();
    } catch {
      me = null;
    }
  }
  if (!me?.email) return null;

  try {
    await convexChat.upsertUser({
      name: me.full_name || me.name || me.email,
      email: me.email,
      language,
      ...(me.avatar_url ? { avatarUrl: me.avatar_url } : {}),
    });
  } catch {
    /* directory mirror is best-effort */
  }

  return language;
}

export default saveUserLanguage;
