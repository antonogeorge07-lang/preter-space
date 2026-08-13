import { convexChat } from '@/lib/convexChat';

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

      const conversationId = await convexChat.createConversation({
        isGroup: false,
        creatorId: currentUser.id,
        participantIds: [currentUser.id],
        title: 'Preter Guide',
        participantNames: [currentUser.full_name || currentUser.email || ''],
        participantLanguages: { [currentUser.id]: userLang },
        preferredLanguage: userLang,
        inviteCode,
        inviteOpen: true,
        unreadCounts: { [currentUser.id]: 1 },
        pinned: true,
        archived: false,
        lastMessagePreview: welcomeText,
      });
      if (cancelled) return;

      await convexChat.sendMessage({
        conversationId,
        senderId: currentUser.id,
        text: WELCOME_WHISPER,
        translations: { [userLang]: welcomeText },
        meta: {
          senderName: 'Preter Guide',
          type: 'text',
          translatedContent: welcomeText,
          originalLanguage: 'en',
          targetLanguage: userLang,
          isGuide: true,
        },
      });
      if (!cancelled && onConversationReady) onConversationReady({ id: conversationId });
    }

    setup().catch(() => {});
    return () => { cancelled = true; };
  }, [currentUser?.id, conversations.length, loaded, done]);

  return null;
}