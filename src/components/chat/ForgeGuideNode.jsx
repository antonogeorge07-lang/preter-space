import { db } from '@/lib/db';

import { useEffect, useState } from 'react';

import { generateInviteCode } from '@/lib/inviteCode';
import { detectAndTranslate } from '@/lib/translation';

function getBrowserLang() {
  return (navigator.language || 'en').split('-')[0];
}

const WELCOME_WHISPER = "Welcome to Preter. Speak naturally in any language. Your contacts will read your words in theirs. Start by inviting someone to chat.";
const GUIDE_FLAG = 'preter_guide_created';

export default function ForgeGuideNode({ currentUser, conversations, loaded, onConversationReady }) {
  // Persist across remounts (the / to /chat/:id route switch remounts Forge)
  const [done, setDone] = useState(() => {
    try { return !!localStorage.getItem(GUIDE_FLAG); } catch { return false; }
  });

  useEffect(() => {
    if (!currentUser || done) return;
    if (!loaded) return;              // wait for the conversation list to actually load
    if (conversations.length > 0) return;  // user already has conversations

    let cancelled = false;
    setDone(true);
    try { localStorage.setItem(GUIDE_FLAG, '1'); } catch {}

    async function setup() {
      const userLang = currentUser.default_language || getBrowserLang();
      const inviteCode = generateInviteCode();
      const { translatedText: welcomeTranslated } = await detectAndTranslate(WELCOME_WHISPER, userLang);
      const welcomeText = welcomeTranslated || WELCOME_WHISPER;

      const conv = await db.entities.Conversation.create({
        participant_name: 'Preter Guide',
        participant_avatar: '',
        preferred_language: userLang,
        participant_ids: [currentUser.id],
        participant_names: [currentUser.full_name || currentUser.email || ''],
        participant_languages: JSON.stringify({ [currentUser.id]: userLang }),
        invite_code: inviteCode,
        unread_counts: JSON.stringify({ [currentUser.id]: 1 }),
        pinned: true,
        archived: false,
        last_message_preview: welcomeText,
        last_message_time: new Date().toISOString(),
      });
      if (cancelled) return;

      await db.entities.Message.create({
        conversation_id: conv.id,
        sender_id: currentUser.id,
        sender_name: 'Preter Guide',
        content: WELCOME_WHISPER,
        translated_content: welcomeText,
        original_language: 'en',
        target_language: userLang,
        type: 'text',
        is_guide: true,
      });
      if (!cancelled && onConversationReady) onConversationReady(conv);
    }

    setup().catch(() => {});
    return () => { cancelled = true; };
  }, [currentUser?.id, conversations.length, loaded, done]);

  return null;
}