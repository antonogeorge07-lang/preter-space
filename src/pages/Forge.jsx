import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from '@/lib/router-compat';

import { db } from '@/lib/db';
import { detectAndTranslate } from '@/lib/translation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  useChatIdentity,
  useChatConversations,
  useChatMessages,
  useChatPresence,
  useReadReceipts,
  useChatMutations,
  useParticipantLanguages,
} from '@/hooks/useConvexChat';
import { safeJson } from '@/lib/chatMap';
import { convexChat } from '@/lib/convexChat';
import ConversationList from '@/components/chat/ConversationList';
import ChatView from '@/components/chat/ChatView';
import MorningSummary from '@/components/chat/MorningSummary';
import VoiceRecorder from '@/components/chat/VoiceRecorder';
import UserProfile from '@/components/chat/UserProfile';
import VideoFilePicker from '@/components/chat/VideoFilePicker';
import BottomTabBar from '@/components/chat/BottomTabBar';
import VoiceCallModal from '@/components/chat/VoiceCallModal';
import IncomingCallBanner from '@/components/chat/IncomingCallBanner';
import ForgeGuideNode from '@/components/chat/ForgeGuideNode';
import PWAInstallBanner from '@/components/chat/PWAInstallBanner';
import BlockReportModal from '@/components/chat/BlockReportModal';
import GlobalSearch from '@/components/chat/GlobalSearch';
import ContactDiscovery from '@/components/chat/ContactDiscovery';
import { registerPushNotifications, notifyIfHidden } from '@/lib/pushNotifications';
import OnboardingModal from '@/components/chat/OnboardingModal';
import { enqueue, flushQueue } from '@/lib/offlineQueue';
import { registerActiveDeviceSession, isCurrentSessionAlive } from '@/lib/deviceSession';
import { toast } from '@/components/ui/use-toast';

export default function Forge() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const authUser = useCurrentUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [voiceRecorderOpen, setVoiceRecorderOpen] = useState(false);
  const [videoRecorderOpen, setVideoRecorderOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [callType, setCallType] = useState('audio');
  const [incomingCallSession, setIncomingCallSession] = useState(null);
  const [callConversation, setCallConversation] = useState(null);
  const [replyTo, setReplyTo] = useState(null); // { id, content, sender_name }
  const [blockReportTarget, setBlockReportTarget] = useState(null);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [contactDiscoveryOpen, setContactDiscoveryOpen] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(() => !!localStorage.getItem('vl_onboarded'));
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSeenMessageId, setLastSeenMessageId] = useState(null);

  // ── Convex identity (participants are keyed by email) ────────────────────
  const { key: myKey, myLanguage, blockedUserIds } = useChatIdentity(authUser);
  const currentUser = useMemo(
    () => (authUser ? { ...authUser, id: myKey || authUser.id, auth_id: authUser.id } : null),
    [authUser, myKey],
  );

  const {
    sendMessage: sendConvexMessage,
    updateMessage,
    toggleReaction,
    createConversation,
    updateConversation,
    removeConversation,
  } = useChatMutations();

  // ── Live conversations ───────────────────────────────────────────────────
  const { conversations: myConversations, loaded: conversationsLoaded } = useChatConversations(myKey);
  const activeConversation = chatId ? myConversations.find((c) => c.id === chatId) || null : null;

  // ── Live messages / reactions / read receipts ────────────────────────────
  const { messages, messageDocs, hasMore: hasMoreMessages, loadingOlder, loadOlder } =
    useChatMessages(chatId, { blockedUserIds });
  useReadReceipts({ conversationId: chatId, key: myKey, messageDocs });

  // ── Live language preferences of everyone in this conversation ───────────
  const participantLanguages = useParticipantLanguages(activeConversation?.participant_ids || []);

  // ── Live presence + typing ───────────────────────────────────────────────
  const otherKey = (activeConversation?.participant_ids || []).find((id) => id !== myKey) || null;
  const { othersTyping, contactPresence, notifyTyping, setTyping } = useChatPresence({
    conversationId: chatId,
    key: myKey,
    otherKey,
  });

  // ── Register push notifications once authenticated ───────────────────────
  useEffect(() => {
    if (authUser) registerPushNotifications();
  }, [authUser?.id]);

  // ── Register device session + poll for remote kill ───────────────────────
  useEffect(() => {
    if (!authUser) return;
    registerActiveDeviceSession(authUser);
    const interval = setInterval(async () => {
      const fresh = await db.auth.me();
      if (!isCurrentSessionAlive(fresh)) {
        await db.auth.logout('/landing');
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [authUser?.id]);

  // ── Online/offline tracking + queue flush ────────────────────────────────
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      flushQueue(async (item) => {
        const { _id, _ts, ...payload } = item;
        await convexChat.sendMessage(payload);
      });
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ── Notify on new incoming messages while the tab is hidden ──────────────
  useEffect(() => {
    if (!messages.length) return;
    const latest = messages[messages.length - 1];
    if (latest.id === lastSeenMessageId) return;
    setLastSeenMessageId(latest.id);
    if (!lastSeenMessageId) return; // skip the initial load
    if (latest.sender_id !== myKey) {
      notifyIfHidden({
        title: latest.sender_name || 'Preter',
        body: latest.translated_content || latest.content || 'New message',
        url: `/chat/${latest.conversation_id}`,
      });
    }
  }, [messages, myKey, lastSeenMessageId]);

  // Mark messages as 'me'/'them'
  const markedMessages = useMemo(
    () =>
      messages.map((msg) => ({
        ...msg,
        sender: msg.is_guide || msg.sender_id !== myKey ? 'them' : 'me',
      })),
    [messages, myKey],
  );

  // Each participant's own account language is the source of truth for
  // "which language do I read in"; the conversation row is only a fallback.
  const getParticipantLang = useCallback(
    (conv, userId) => {
      if (!userId) return conv?.preferred_language || 'en';
      if (userId === myKey && myLanguage) return myLanguage;
      if (participantLanguages[userId]) return participantLanguages[userId];
      const langs = safeJson(conv?.participant_languages, {});
      return langs[userId] || conv?.preferred_language || 'en';
    },
    [myKey, myLanguage, participantLanguages],
  );

  // Get current user's preferred language for this conversation
  const getMyLang = useCallback(
    (conv) => getParticipantLang(conv, myKey),
    [getParticipantLang, myKey],
  );

  // Clear my unread counter when opening a conversation
  useEffect(() => {
    if (!chatId || !myKey || !activeConversation) return;
    const counts = safeJson(activeConversation.unread_counts, {});
    if (counts[myKey] > 0) {
      updateConversation(chatId, { unread_counts: { ...counts, [myKey]: 0 } }).catch(() => {});
    }
  }, [chatId, myKey, activeConversation?.unread_counts]);

  const selectConversation = useCallback(
    (conv) => {
      if (conv) navigate(`/chat/${conv.id}`);
      else navigate('/');
      setSidebarOpen(false);
    },
    [navigate],
  );

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text, expiresAt) => {
      if (!activeConversation || !myKey || isProcessing) return;

      const participantIds = activeConversation.participant_ids || [];
      const recipientIds = participantIds.filter((id) => id !== myKey);
      if (blockedUserIds.some((id) => recipientIds.includes(id))) {
        toast({ title: 'Contact blocked', description: 'Unblock them to send messages.', variant: 'destructive' });
        return;
      }

      setIsProcessing(true);
      setTyping(false);

      const recipientLang = recipientIds.length > 0
        ? getParticipantLang(activeConversation, recipientIds[0])
        : getMyLang(activeConversation);

      // Every distinct target language among recipients
      const targetLangs = [...new Set(
        (recipientIds.length > 0
          ? recipientIds.map((pid) => getParticipantLang(activeConversation, pid))
          : [getMyLang(activeConversation)]
        ).filter(Boolean),
      )];

      const meta = {
        senderName: currentUser?.full_name || myKey,
        type: 'text',
        targetLanguage: recipientLang,
        ...(expiresAt ? { expiresAt } : {}),
        ...(replyTo ? { replyToContent: replyTo.content, replyToSender: replyTo.sender_name } : {}),
      };

      const payload = {
        conversationId: activeConversation.id,
        senderId: myKey,
        text,
        meta,
        ...(replyTo ? { replyToId: replyTo.id } : {}),
      };
      if (replyTo) setReplyTo(null);

      if (!navigator.onLine) {
        enqueue(payload);
        setIsProcessing(false);
        return;
      }

      // Translate BEFORE inserting so the stored message already carries the
      // recipients' languages — no untranslated flash on their side.
      const translations = {};
      let originalLang = '';
      try {
        const results = await Promise.all(
          targetLangs.map(async (lang) => ({ lang, ...(await detectAndTranslate(text, lang)) })),
        );
        results.forEach(({ lang, translatedText, detectedLang }) => {
          if (translatedText) translations[lang] = translatedText;
          if (!originalLang && detectedLang) originalLang = detectedLang;
        });
      } catch {
        // Translation unavailable — send the original text through anyway.
      }

      const primaryTranslation = translations[recipientLang] || text;
      if (Object.keys(translations).length > 0) {
        payload.translations = translations;
        payload.meta = { ...meta, translatedContent: primaryTranslation, originalLanguage: originalLang };
      }

      try {
        await sendConvexMessage(payload);
      } catch (err) {
        const blocked = /blocked/i.test(err?.message || '');
        toast({
          title: blocked ? 'Message not delivered' : 'Could not send message',
          description: blocked
            ? 'This user has blocked you. You cannot send them messages.'
            : 'Please check your connection and try again.',
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }

      // Bump conversation preview + unread counters
      const counts = safeJson(activeConversation.unread_counts, {});
      recipientIds.forEach((pid) => { counts[pid] = (counts[pid] || 0) + 1; });
      await updateConversation(activeConversation.id, {
        last_message_preview: primaryTranslation,
        last_message_time: Date.now(),
        unread_counts: counts,
      }).catch(() => {});

      setIsProcessing(false);
    },
    [activeConversation, myKey, currentUser, replyTo, blockedUserIds, isProcessing, getMyLang, getParticipantLang, sendConvexMessage, updateMessage, updateConversation, setTyping],
  );

  // ── Media / file messages ────────────────────────────────────────────────
  const sendMediaMessage = useCallback(
    async ({ meta, text = '', preview }) => {
      if (!activeConversation || !myKey) return;
      await sendConvexMessage({
        conversationId: activeConversation.id,
        senderId: myKey,
        text,
        meta: { senderName: currentUser?.full_name || myKey, ...meta },
      });
      await updateConversation(activeConversation.id, {
        last_message_preview: preview,
        last_message_time: Date.now(),
      }).catch(() => {});
    },
    [activeConversation, myKey, currentUser, sendConvexMessage, updateConversation],
  );

  const handleReaction = useCallback(
    async (msgId, emoji) => {
      if (!myKey) return;
      await toggleReaction({ messageId: msgId, userId: myKey, emoji });
    },
    [myKey, toggleReaction],
  );

  const handleDeleteMessage = useCallback(
    async (messageId) => { await updateMessage({ messageId, deleted: true }); },
    [updateMessage],
  );

  const handleEditMessage = useCallback(
    async (messageId, newContent) => { await updateMessage({ messageId, text: newContent, edited: true }); },
    [updateMessage],
  );

  const handlePinConversation = useCallback(
    async (conv) => { await updateConversation(conv.id, { pinned: !conv.pinned }); },
    [updateConversation],
  );

  const handleArchiveConversation = useCallback(
    async (conv) => {
      await updateConversation(conv.id, { archived: !conv.archived });
      if (chatId === conv.id) navigate('/');
    },
    [chatId, navigate, updateConversation],
  );

  const handleDeleteConversation = useCallback(
    async (conv) => {
      await removeConversation({ conversationId: conv.id });
      if (chatId === conv.id) navigate('/');
    },
    [chatId, navigate, removeConversation],
  );

  const handleMuteConversation = useCallback(
    async (conv) => { await updateConversation(conv.id, { muted: !conv.muted }); },
    [updateConversation],
  );

  const handleLanguageChange = useCallback(
    async (langCode) => {
      if (!myKey) return;
      // Persist on the account first so it applies everywhere, then on the thread.
      await saveUserLanguage(langCode, authUser).catch(() => {});
      if (!activeConversation) return;
      const langs = safeJson(activeConversation.participant_languages, {});
      await updateConversation(activeConversation.id, {
        participant_languages: { ...langs, [myKey]: langCode },
        preferred_language: langCode,
      });
    },
    [activeConversation, authUser, myKey, updateConversation],
  );

  const handleImageSend = useCallback(
    (imageUrl) => sendMediaMessage({ meta: { type: 'image', imageUrl }, preview: '🖼️ Image' }),
    [sendMediaMessage],
  );

  const handleFileSend = useCallback(
    ({ file_url, file_name, file_size }) =>
      sendMediaMessage({
        meta: { type: 'file', fileUrl: file_url, fileName: file_name, fileSize: file_size },
        preview: `📎 ${file_name}`,
      }),
    [sendMediaMessage],
  );

  const handleBlockReport = useCallback((conv) => { setBlockReportTarget(conv); }, []);

  const handleNewConversation = useCallback(
    async ({ name, lang, avatar, isGroup, inviteCode, participantIds, participantNames }) => {
      if (!myKey) return null;
      const allIds = participantIds?.length ? participantIds : [myKey];
      const conversationId = await createConversation({
        isGroup: !!isGroup,
        creatorId: myKey,
        participantIds: allIds,
        title: name,
        ...(avatar ? { avatarUrl: avatar } : {}),
        participantNames: participantNames || [],
        participantLanguages: { [myKey]: lang || 'en' },
        preferredLanguage: lang || 'en',
        unreadCounts: {},
        pinned: false,
        archived: false,
        ...(inviteCode ? { inviteCode, inviteOpen: true } : {}),
      });
      navigate(`/chat/${conversationId}`);
      return { id: conversationId };
    },
    [createConversation, myKey, navigate],
  );

  const handleVoiceNoteReady = useCallback(
    (voiceData) =>
      sendMediaMessage({
        text: voiceData.transcript || '',
        meta: {
          type: 'voice',
          audioUrl: voiceData.audioUrl,
          transcript: voiceData.transcript,
          translatedTranscript: voiceData.translatedTranscript,
          translatedContent: voiceData.translatedTranscript,
          originalLanguage: voiceData.originalLanguage,
          targetLanguage: voiceData.targetLanguage,
        },
        preview: `🎤 ${voiceData.translatedTranscript || voiceData.transcript || ''}`,
      }),
    [sendMediaMessage],
  );

  const handleStartCall = useCallback(
    (type = 'audio') => {
      setCallType(type);
      setIncomingCallSession(null);
      setCallConversation(activeConversation);
      setCallOpen(true);
    },
    [activeConversation],
  );

  const handleIncomingCall = useCallback(
    (session, conv) => {
      setCallType(session?.call_type || 'audio');
      setIncomingCallSession(session);
      setCallConversation(conv || activeConversation);
      setCallOpen(true);
    },
    [activeConversation],
  );

  const showChatOnMobile = !!chatId;
  const myLang = getMyLang(activeConversation);

  // Unread counts for the sidebar
  const conversationsWithUnread = useMemo(
    () =>
      myConversations.map((conv) => ({
        ...conv,
        unread_count: safeJson(conv.unread_counts, {})[myKey] || 0,
      })),
    [myConversations, myKey],
  );

  return (
    <div className="w-screen flex relative overflow-hidden" style={{ background: 'var(--background)', height: '100svh', minHeight: '-webkit-fill-available' }}>
      {/* Subtle dot grid texture */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden dot-grid opacity-60" />
      {/* Themed ambient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="theme-orb theme-orb-1" />
        <div className="theme-orb theme-orb-2" />
        <div className="theme-orb theme-orb-3" />
      </div>

      {/* Sidebar */}
      <div className="flex-shrink-0">
        <ConversationList
          conversations={conversationsWithUnread}
          activeId={chatId}
          onSelect={selectConversation}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onPin={handlePinConversation}
          onArchive={handleArchiveConversation}
          onDeleteConversation={handleDeleteConversation}
          onMuteConversation={handleMuteConversation}
          onBlockReport={handleBlockReport}
          onProfileClick={() => setProfileOpen(true)}
          onNewConversation={handleNewConversation}
          onRefresh={() => {}}
          onSearchOpen={() => setGlobalSearchOpen(true)}
          onFindPeople={() => setContactDiscoveryOpen(true)}
          currentUser={currentUser}
        />
      </div>

      {/* Main area */}
      <div className="flex flex-1 min-w-0 flex-col relative z-10 overflow-hidden pb-[calc(60px+env(safe-area-inset-bottom))] lg:pb-0">
        {activeConversation ? (
          <ChatView
            conversation={activeConversation}
            messages={markedMessages}
            currentUser={currentUser}
            myLang={myLang}
            onSendMessage={sendMessage}
            onTyping={notifyTyping}
            onStartRecording={() => setVoiceRecorderOpen(true)}
            onStartVideo={() => setVideoRecorderOpen(true)}
            onImageSend={handleImageSend}
            onFileSend={handleFileSend}
            isProcessing={isProcessing}
            onBack={() => navigate('/')}
            onLanguageChange={handleLanguageChange}
            onDeleteMessage={handleDeleteMessage}
            onEditMessage={handleEditMessage}
            onStartCall={handleStartCall}
            replyTo={replyTo}
            onSetReplyTo={setReplyTo}
            onCancelReply={() => setReplyTo(null)}
            othersTyping={othersTyping}
            onReaction={handleReaction}
            contactPresence={contactPresence}
            hasMoreMessages={hasMoreMessages}
            loadingOlder={loadingOlder}
            onLoadOlder={loadOlder}
          />
        ) : (
          <MorningSummary
            conversations={conversationsWithUnread}
            currentUser={currentUser}
            onSelectConversation={selectConversation}
            onNewConversation={() => setSidebarOpen(true)}
          />
        )}
      </div>

      <BottomTabBar
        activeTab={profileOpen ? 'settings' : 'chats'}
        onChatsClick={() => { setProfileOpen(false); navigate('/'); }}
        onSettingsClick={() => setProfileOpen(true)}
      />

      <IncomingCallBanner
        currentUser={currentUser}
        conversations={myConversations}
        onAnswer={handleIncomingCall}
      />

      <VoiceRecorder
        isOpen={voiceRecorderOpen}
        onClose={() => setVoiceRecorderOpen(false)}
        onVoiceNoteReady={handleVoiceNoteReady}
        targetLanguage={myLang}
      />

      {videoRecorderOpen && (
        <VideoFilePicker
          onClose={() => setVideoRecorderOpen(false)}
          onVideoReady={async (videoUrl) => {
            await sendMediaMessage({ meta: { type: 'video', videoUrl }, preview: '🎥 Video' });
            setVideoRecorderOpen(false);
          }}
        />
      )}

      <VoiceCallModal
        isOpen={callOpen}
        onClose={() => { setCallOpen(false); setIncomingCallSession(null); }}
        conversation={callConversation}
        currentUser={currentUser}
        callSession={incomingCallSession}
        callType={callType}
      />

      <PWAInstallBanner />

      <ContactDiscovery
        isOpen={contactDiscoveryOpen}
        onClose={() => setContactDiscoveryOpen(false)}
        currentUser={currentUser}
        onStartConversation={async (user) => {
          const otherId = user?.email || user?.id;
          if (!otherId || !myKey) return;
          const existing = myConversations.find(
            (c) =>
              !c.is_group && !c.archived &&
              (c.participant_ids || []).length === 2 &&
              (c.participant_ids || []).includes(myKey) &&
              (c.participant_ids || []).includes(otherId),
          );
          if (existing) { navigate(`/chat/${existing.id}`); setContactDiscoveryOpen(false); return; }
          const mine = currentUser?.default_language || 'en';
          const theirs = user?.default_language || user?.language || 'en';
          const otherName = user?.full_name || user?.name || 'New Contact';
          const conversationId = await createConversation({
            isGroup: false,
            creatorId: myKey,
            participantIds: [myKey, otherId],
            title: otherName,
            ...(user?.avatar_url || user?.avatarUrl ? { avatarUrl: user.avatar_url || user.avatarUrl } : {}),
            participantNames: [currentUser?.full_name || myKey, otherName],
            participantLanguages: { [myKey]: mine, [otherId]: theirs },
            preferredLanguage: theirs,
            unreadCounts: {},
            pinned: false,
            archived: false,
          });
          navigate(`/chat/${conversationId}`);
          setContactDiscoveryOpen(false);
        }}
      />

      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-0 inset-x-0 z-[500] text-center py-1 text-xs font-medium" style={{ background: 'var(--primary)', color: 'var(--paper)' }}>
          You're offline. Messages will send when reconnected.
        </div>
      )}

      <BlockReportModal
        isOpen={!!blockReportTarget}
        conversation={blockReportTarget}
        currentUser={currentUser}
        onClose={() => setBlockReportTarget(null)}
        onBlock={async (conv) => {
          const target = (conv?.participant_ids || []).find((id) => id !== myKey);
          if (target && myKey) await convexChat.toggleBlock(myKey, target).catch(() => {});
          await updateConversation(conv.id, { archived: true }).catch(() => {});
          if (chatId === conv.id) navigate('/');
        }}
        onReport={async (conv, reason, details) => {
          const target = (conv?.participant_ids || []).find((id) => id !== myKey);
          if (!myKey) return;
          await convexChat
            .reportConversation({
              reporterId: myKey,
              targetId: target || myKey,
              ...(conv?.id ? { conversationId: conv.id } : {}),
              reason: [reason, details].filter(Boolean).join(' — '),
            })
            .catch(() => {});
        }}
      />

      {globalSearchOpen && (
        <GlobalSearch
          conversations={conversationsWithUnread}
          onSelect={selectConversation}
          onClose={() => setGlobalSearchOpen(false)}
        />
      )}

      <OnboardingModal
        isOpen={!onboardingDone && !!currentUser}
        currentUser={currentUser}
        onComplete={() => {
          localStorage.setItem('vl_onboarded', '1');
          setOnboardingDone(true);
        }}
      />

      <ForgeGuideNode
        currentUser={currentUser}
        conversations={myConversations}
        loaded={conversationsLoaded}
        onConversationReady={(conv) => navigate(`/chat/${conv.id}`)}
      />

      <UserProfile isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
