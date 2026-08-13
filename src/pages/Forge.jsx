import { db } from '@/lib/db';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from '@/lib/router-compat';

import { detectAndTranslate } from '@/lib/translation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
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
import { enqueue, flushQueue, getQueue } from '@/lib/offlineQueue';
import { registerActiveDeviceSession, isCurrentSessionAlive } from '@/lib/deviceSession';
import { toast } from '@/components/ui/use-toast';

export default function Forge() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [voiceRecorderOpen, setVoiceRecorderOpen] = useState(false);
  const [videoRecorderOpen, setVideoRecorderOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [callType, setCallType] = useState('audio');
  const [incomingCallSession, setIncomingCallSession] = useState(null);
  const [callConversation, setCallConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [replyTo, setReplyTo] = useState(null); // { id, content, sender_name }
  const [blockReportTarget, setBlockReportTarget] = useState(null);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [contactDiscoveryOpen, setContactDiscoveryOpen] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(() => !!localStorage.getItem('vl_onboarded'));
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const typingTimerRef = useRef(null);
  const chatIdRef = useRef(chatId);
  chatIdRef.current = chatId;

  // ── Register push notifications once authenticated ───────────────────────
  useEffect(() => {
    if (currentUser) registerPushNotifications();
  }, [currentUser?.id]);

  // ── Register device session + poll for remote kill ───────────────────────
  useEffect(() => {
    if (!currentUser) return;
    registerActiveDeviceSession(currentUser);
    const interval = setInterval(async () => {
      const fresh = await db.auth.me();
      if (!isCurrentSessionAlive(fresh)) {
        await db.auth.logout('/landing');
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // ── Online/offline tracking + queue flush ────────────────────────────────
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      flushQueue(async (item) => {
        const { _id, _ts, ...payload } = item;
        await db.entities.Message.create(payload);
      });
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  // ── Real-time conversations ──────────────────────────────────────────────
  useEffect(() => {
    db.entities.Conversation.list('-last_message_time', 200).then(all => {
      setConversations(all);
      setConversationsLoaded(true);
    });
    const unsub = db.entities.Conversation.subscribe((event) => {
      setConversations(prev => {
        if (event.type === 'create') return [event.data, ...prev];
        if (event.type === 'update') return prev.map(c => c.id === event.data.id ? event.data : c);
        if (event.type === 'delete') return prev.filter(c => c.id !== event.data.id);
        return prev;
      });
    });
    return unsub;
  }, []);

  // ── Real-time messages for active chat ──────────────────────────────────
  useEffect(() => {
    if (!chatId) { setMessages([]); return; }
    db.entities.Message.filter({ conversation_id: chatId }, 'created_date', 300).then(msgs => {
      setMessages(msgs);
    });
    const unsub = db.entities.Message.subscribe((event) => {
      if (event.data?.conversation_id !== chatIdRef.current) return;
      setMessages(prev => {
        if (event.type === 'create') {
          const msg = event.data;
          // Notify if tab hidden and message is from someone else
          if (msg.sender_id !== currentUser?.id) {
            notifyIfHidden({ title: msg.sender_name || 'Forge', body: msg.translated_content || msg.content || 'New message', url: `/chat/${msg.conversation_id}` });
          }
          return [...prev, msg];
        }
        if (event.type === 'update') return prev.map(m => m.id === event.data.id ? event.data : m);
        if (event.type === 'delete') return prev.filter(m => m.id !== event.data.id);
        return prev;
      });
    });
    return unsub;
  }, [chatId]);

  // Filter to conversations this user owns or is a participant in
  const myConversations = conversations.filter(c => {
    if (!currentUser) return true;
    const ids = c.participant_ids || [];
    return c.created_by_id === currentUser.id || ids.includes(currentUser.id);
  });

  const activeConversation = chatId ? myConversations.find(c => c.id === chatId) || null : null;

  // Derive blocked user IDs — stored as a native array on the user profile
  const blockedUserIds = Array.isArray(currentUser?.blocked_user_ids)
    ? currentUser.blocked_user_ids
    : [];

  // Mark messages as 'me'/'them', filter out messages from blocked users
  const markedMessages = messages
    .filter(msg => !blockedUserIds.includes(msg.sender_id))
    .map(msg => ({
      ...msg,
      sender: (msg.is_guide || msg.sender_id !== currentUser?.id) ? 'them' : 'me',
    }));

  // Get current user's preferred language for this conversation
  const getMyLang = useCallback((conv) => {
    if (!conv || !currentUser) return conv?.preferred_language || 'en';
    try {
      const langs = JSON.parse(conv.participant_languages || '{}');
      return langs[currentUser.id] || conv.preferred_language || 'en';
    } catch { return conv.preferred_language || 'en'; }
  }, [currentUser]);

  // Mark unread as read + mark messages read_by when opening chat
  useEffect(() => {
    if (!chatId || !currentUser || !activeConversation) return;
    // Clear unread count
    try {
      const counts = JSON.parse(activeConversation.unread_counts || '{}');
      if (counts[currentUser.id] > 0) {
        counts[currentUser.id] = 0;
        db.entities.Conversation.update(chatId, { unread_counts: JSON.stringify(counts) });
      }
    } catch {}
    // Mark unread messages as read_by this user
    const unread = messages.filter(m => {
      if (m.sender_id === currentUser.id || m.deleted) return false;
      try { const rb = JSON.parse(m.read_by || '[]'); return !rb.includes(currentUser.id); } catch { return true; }
    });
    unread.forEach(m => {
      try {
        const rb = JSON.parse(m.read_by || '[]');
        db.entities.Message.update(m.id, { read_by: JSON.stringify([...rb, currentUser.id]) });
      } catch {}
    });
  }, [chatId, currentUser?.id, messages.length]);

  const selectConversation = useCallback((conv) => {
    if (conv) navigate(`/chat/${conv.id}`);
    else navigate('/');
    setSidebarOpen(false);
  }, [navigate]);

  // ── Typing indicator ─────────────────────────────────────────────────────
  const sendTyping = useCallback(async (isTyping) => {
    if (!activeConversation || !currentUser) return;
    try {
      const ids = JSON.parse(activeConversation.typing_user_ids || '[]');
      const alreadyIn = ids.includes(currentUser.id);
      if (isTyping && !alreadyIn) {
        await db.entities.Conversation.update(activeConversation.id, {
          typing_user_ids: JSON.stringify([...ids, currentUser.id]),
        });
      } else if (!isTyping && alreadyIn) {
        await db.entities.Conversation.update(activeConversation.id, {
          typing_user_ids: JSON.stringify(ids.filter(id => id !== currentUser.id)),
        });
      }
    } catch {}
  }, [activeConversation, currentUser]);

  const handleTyping = useCallback(() => {
    sendTyping(true);
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => sendTyping(false), 3000);
  }, [sendTyping]);

  // Stop typing on unmount/conv change
  useEffect(() => {
    return () => {
      clearTimeout(typingTimerRef.current);
      if (activeConversation && currentUser) {
        try {
          const ids = JSON.parse(activeConversation.typing_user_ids || '[]');
          if (ids.includes(currentUser.id)) {
            db.entities.Conversation.update(activeConversation.id, {
              typing_user_ids: JSON.stringify(ids.filter(id => id !== currentUser.id)),
            });
          }
        } catch {}
      }
    };
  }, [chatId]);

  // Helper: get a specific participant's language in a conversation
  const getParticipantLang = useCallback((conv, userId) => {
    if (!conv || !userId) return conv?.preferred_language || 'en';
    try {
      const langs = JSON.parse(conv.participant_languages || '{}');
      return langs[userId] || conv.preferred_language || 'en';
    } catch { return conv.preferred_language || 'en'; }
  }, []);

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text, expiresAt) => {
    if (!activeConversation || !currentUser || isProcessing) return;

    // Check if any recipient has blocked the current user
    const blockCheckIds = (activeConversation.participant_ids || []).filter(id => id !== currentUser.id);
    // We can only enforce our own block list client-side; backend RLS guards the rest
    if (blockedUserIds.some(id => blockCheckIds.includes(id))) {
      toast({ title: 'Contact blocked', description: 'Unblock them to send messages.', variant: 'destructive' });
      return;
    }
    setIsProcessing(true);
    sendTyping(false);
    clearTimeout(typingTimerRef.current);

    // Find the OTHER participant(s) and their language
    const participantIds = activeConversation.participant_ids || [];
    const recipientIds = participantIds.filter(id => id !== currentUser.id);
    // Use first recipient's language as the target translation language
    const recipientLang = recipientIds.length > 0
      ? getParticipantLang(activeConversation, recipientIds[0])
      : getMyLang(activeConversation);

    const msgPayload = {
      conversation_id: activeConversation.id,
      sender_id: currentUser.id,
      sender_name: currentUser.full_name || currentUser.email,
      content: text,
      translated_content: '',
      original_language: '',
      target_language: recipientLang,
      type: 'text',
      ...(expiresAt && { expires_at: expiresAt }),
    };

    if (replyTo) {
      msgPayload.reply_to_id = replyTo.id;
      msgPayload.reply_to_content = replyTo.content;
      msgPayload.reply_to_sender = replyTo.sender_name;
      setReplyTo(null);
    }

    if (!navigator.onLine) {
      enqueue(msgPayload);
      setIsProcessing(false);
      return;
    }

    // Recipient-side block lists are enforced by the database on insert.
    let newMsg;
    try {
      newMsg = await db.entities.Message.create(msgPayload);
    } catch (err) {
      const blocked = /blocked by recipient/i.test(err?.message || '');
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

    // Increment unread counts for all OTHER participants
    try {
      const counts = JSON.parse(activeConversation.unread_counts || '{}');
      participantIds.forEach(pid => {
        if (pid !== currentUser.id) counts[pid] = (counts[pid] || 0) + 1;
      });
      await db.entities.Conversation.update(activeConversation.id, {
        last_message_preview: text,
        last_message_time: new Date().toISOString(),
        unread_counts: JSON.stringify(counts),
      });
    } catch {
      await db.entities.Conversation.update(activeConversation.id, {
        last_message_preview: text,
        last_message_time: new Date().toISOString(),
      });
    }

    setIsProcessing(false);

    // Translate to recipient's language so they can read it
    const { translatedText: translated, detectedLang: originalLang } = await detectAndTranslate(text, recipientLang);
    await db.entities.Message.update(newMsg.id, {
      translated_content: translated,
      original_language: originalLang,
    });

    if (translated !== text) {
      await db.entities.Conversation.update(activeConversation.id, {
        last_message_preview: translated,
      });
    }
  }, [activeConversation, currentUser, replyTo, getMyLang, getParticipantLang, sendTyping]);

  const handleReaction = useCallback(async (msgId, emoji) => {
    if (!currentUser) return;
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const reactions = (() => { try { return JSON.parse(msg.reactions || '{}'); } catch { return {}; } })();
    const users = reactions[emoji] || [];
    if (users.includes(currentUser.id)) {
      reactions[emoji] = users.filter(id => id !== currentUser.id);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...users, currentUser.id];
    }
    await db.entities.Message.update(msgId, { reactions: JSON.stringify(reactions) });
  }, [currentUser, messages]);

  const handleDeleteMessage = useCallback(async (messageId) => {
    await db.entities.Message.update(messageId, { deleted: true });
  }, []);

  const handleEditMessage = useCallback(async (messageId, newContent) => {
    await db.entities.Message.update(messageId, { content: newContent, edited: true });
  }, []);

  const handlePinConversation = useCallback(async (conv) => {
    await db.entities.Conversation.update(conv.id, { pinned: !conv.pinned });
  }, []);

  const handleArchiveConversation = useCallback(async (conv) => {
    await db.entities.Conversation.update(conv.id, { archived: !conv.archived });
    if (chatId === conv.id) navigate('/');
  }, [chatId, navigate]);

  const handleDeleteConversation = useCallback(async (conv) => {
    await db.entities.Conversation.delete(conv.id);
    if (chatId === conv.id) navigate('/');
  }, [chatId, navigate]);

  const handleMuteConversation = useCallback(async (conv) => {
    await db.entities.Conversation.update(conv.id, { muted: !conv.muted });
  }, []);

  const handleLanguageChange = useCallback(async (langCode) => {
    if (!activeConversation || !currentUser) return;
    // Save per-user language preference
    try {
      const langs = JSON.parse(activeConversation.participant_languages || '{}');
      langs[currentUser.id] = langCode;
      await db.entities.Conversation.update(activeConversation.id, {
        participant_languages: JSON.stringify(langs),
        preferred_language: langCode, // keep legacy field too
      });
    } catch {
      await db.entities.Conversation.update(activeConversation.id, { preferred_language: langCode });
    }
  }, [activeConversation, currentUser]);

  const handleImageSend = useCallback(async (imageUrl) => {
    if (!activeConversation || !currentUser) return;
    await db.entities.Message.create({
      conversation_id: activeConversation.id,
      sender_id: currentUser.id,
      sender_name: currentUser.full_name || currentUser.email,
      content: '',
      type: 'image',
      image_url: imageUrl,
    });
    await db.entities.Conversation.update(activeConversation.id, {
      last_message_preview: '🖼️ Image',
      last_message_time: new Date().toISOString(),
    });
  }, [activeConversation, currentUser]);

  const handleFileSend = useCallback(async ({ file_url, file_name, file_size }) => {
    if (!activeConversation || !currentUser) return;
    await db.entities.Message.create({
      conversation_id: activeConversation.id,
      sender_id: currentUser.id,
      sender_name: currentUser.full_name || currentUser.email,
      content: '',
      type: 'file',
      file_url,
      file_name,
      file_size,
    });
    await db.entities.Conversation.update(activeConversation.id, {
      last_message_preview: `📎 ${file_name}`,
      last_message_time: new Date().toISOString(),
    });
  }, [activeConversation, currentUser]);

  const handleBlockReport = useCallback((conv) => {
    setBlockReportTarget(conv);
  }, []);

  const handleNewConversation = useCallback(async ({ name, lang, avatar, isGroup, inviteCode, participantIds, participantNames }) => {
    const myId = currentUser?.id;
    const allIds = participantIds?.length ? participantIds : [myId].filter(Boolean);
    const initialLangs = {};
    if (myId) initialLangs[myId] = lang || 'en';

    const conv = await db.entities.Conversation.create({
      participant_name: name,
      participant_avatar: avatar,
      preferred_language: lang || 'en',
      participant_ids: allIds,
      participant_names: participantNames || [],
      participant_languages: JSON.stringify(initialLangs),
      invite_code: inviteCode,
      invite_open: !!inviteCode,
      unread_counts: '{}',
      pinned: false,
      archived: false,
      is_group: !!isGroup,
    });
    navigate(`/chat/${conv.id}`);
    return conv;
  }, [navigate, currentUser]);

  const handleVoiceNoteReady = useCallback(async (voiceData) => {
    if (!activeConversation || !currentUser) return;
    await db.entities.Message.create({
      conversation_id: activeConversation.id,
      sender_id: currentUser.id,
      sender_name: currentUser.full_name || currentUser.email,
      content: voiceData.transcript,
      translated_content: voiceData.translatedTranscript,
      original_language: voiceData.originalLanguage,
      target_language: voiceData.targetLanguage,
      type: 'voice',
      audio_url: voiceData.audioUrl,
      transcript: voiceData.transcript,
      translated_transcript: voiceData.translatedTranscript,
    });
    await db.entities.Conversation.update(activeConversation.id, {
      last_message_preview: `🎤 ${voiceData.translatedTranscript || voiceData.transcript}`,
      last_message_time: new Date().toISOString(),
    });
  }, [activeConversation, currentUser]);

  const handleStartCall = useCallback((type = 'audio') => {
    setCallType(type);
    setIncomingCallSession(null);
    setCallConversation(activeConversation);
    setCallOpen(true);
  }, [activeConversation]);

  const handleIncomingCall = useCallback((session, conv) => {
    setCallType(session?.call_type || 'audio');
    setIncomingCallSession(session);
    setCallConversation(conv || activeConversation);
    setCallOpen(true);
  }, [activeConversation]);

  // ── Presence: update my own presence every 30s ───────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const upsertPresence = async () => {
      const existing = await db.entities.UserPresence.filter({ user_id: currentUser.id }, '-updated_date', 1);
      if (existing.length > 0) {
        await db.entities.UserPresence.update(existing[0].id, { last_active: new Date().toISOString(), status: 'online', user_name: currentUser.full_name || currentUser.email });
      } else {
        await db.entities.UserPresence.create({ user_id: currentUser.id, user_name: currentUser.full_name || currentUser.email, last_active: new Date().toISOString(), status: 'online' });
      }
    };
    upsertPresence();
    const interval = setInterval(upsertPresence, 30000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // ── Presence: read contact's presence for active chat ────────────────────
  const [contactPresence, setContactPresence] = useState(null);
  useEffect(() => {
    if (!activeConversation || !currentUser) { setContactPresence(null); return; }
    const otherId = (activeConversation.participant_ids || []).find(id => id !== currentUser.id);
    if (!otherId) { setContactPresence(null); return; }
    const load = async () => {
      const records = await db.entities.UserPresence.filter({ user_id: otherId }, '-updated_date', 1);
      if (!records.length) { setContactPresence(null); return; }
      const rec = records[0];
      const diff = (Date.now() - new Date(rec.last_active).getTime()) / 1000;
      if (diff < 90) { setContactPresence('online'); return; }
      const mins = Math.round(diff / 60);
      if (mins < 60) setContactPresence(`${mins}m ago`);
      else if (mins < 1440) setContactPresence(`${Math.round(mins / 60)}h ago`);
      else setContactPresence(`${Math.round(mins / 1440)}d ago`);
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [activeConversation?.id, currentUser?.id]);

  const showChatOnMobile = !!chatId;
  const myLang = getMyLang(activeConversation);

  // Derive real typing users (not me)
  const typingUserIds = (() => {
    try { return JSON.parse(activeConversation?.typing_user_ids || '[]'); } catch { return []; }
  })();
  const othersTyping = typingUserIds.filter(id => id !== currentUser?.id);

  // Derive unread count per conversation for sidebar
  const conversationsWithUnread = myConversations.map(conv => {
    try {
      const counts = JSON.parse(conv.unread_counts || '{}');
      return { ...conv, unread_count: counts[currentUser?.id] || 0 };
    } catch { return { ...conv, unread_count: 0 }; }
  });

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
          onRefresh={() => db.entities.Conversation.list('-last_message_time', 200).then(setConversations)}
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
            onTyping={handleTyping}
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
            if (!activeConversation || !currentUser) return;
            await db.entities.Message.create({
              conversation_id: activeConversation.id,
              sender_id: currentUser.id,
              sender_name: currentUser.full_name || currentUser.email,
              content: '',
              type: 'video',
              video_url: videoUrl,
            });
            await db.entities.Conversation.update(activeConversation.id, {
              last_message_preview: '🎥 Video',
              last_message_time: new Date().toISOString(),
            });
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
          const otherId = user?.id || user?.user_id;
          if (!otherId || !currentUser?.id) return;
          // Reuse an existing 1:1 conversation with this registered user
          const existing = myConversations.find(c =>
            !c.is_group && !c.archived &&
            (c.participant_ids || []).length === 2 &&
            (c.participant_ids || []).includes(currentUser.id) &&
            (c.participant_ids || []).includes(otherId)
          );
          if (existing) { navigate(`/chat/${existing.id}`); setContactDiscoveryOpen(false); return; }
          // Otherwise create a new conversation, mapping each participant's language
          const myLang = currentUser.default_language || 'en';
          const theirLang = user?.default_language || 'en';
          const otherName = user?.full_name || user?.user_name || 'New Contact';
          const conv = await db.entities.Conversation.create({
            participant_name: otherName,
            participant_avatar: user?.avatar_url || '🧑',
            preferred_language: theirLang,
            participant_ids: [currentUser.id, otherId],
            participant_names: [currentUser.full_name || currentUser.email || '', otherName],
            participant_languages: JSON.stringify({ [currentUser.id]: myLang, [otherId]: theirLang }),
            unread_counts: '{}',
            pinned: false,
            archived: false,
            is_group: false,
          });
          navigate(`/chat/${conv.id}`);
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
          await db.entities.Conversation.update(conv.id, { archived: true });
          if (chatId === conv.id) navigate('/');
        }}
        onReport={async (conv, reason, details) => {
          // Log report (could also send email to admin)
          console.info('Report submitted', { conv: conv?.id, reason, details });
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
        onComplete={(lang) => {
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