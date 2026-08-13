/**
 * Reactive chat data layer, backed entirely by Convex.
 * Everything here is a live subscription (`useQuery`) or a `useMutation`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useConvexQuery, useConvexMutation } from '@/lib/convex';
import { convexApi } from '@/lib/convexApi';
import {
  toUiConversation,
  toUiMessage,
  groupReactions,
  deriveReadBy,
  presenceLabel,
  toConvexConversationPatch,
  userKey,
} from '@/lib/chatMap';

const SKIP = 'skip';

/** Convex identifies people by email - keep the mirror row fresh. */
export function useChatIdentity(currentUser) {
  const key = userKey(currentUser);
  const upsertUser = useConvexMutation(convexApi.users.createOrUpdateUser);
  const convexUser = useConvexQuery(convexApi.users.getByEmail, key ? { email: key } : SKIP);

  useEffect(() => {
    if (!key) return;
    // Only send `language` when the profile actually carries an explicit choice,
    // otherwise a default of "en" would overwrite the language the user picked.
    const explicitLang = currentUser?.language_set ? currentUser?.default_language : null;
    upsertUser({
      name: currentUser?.full_name || key,
      email: key,
      ...(explicitLang ? { language: explicitLang } : {}),
      ...(currentUser?.avatar_url ? { avatarUrl: currentUser.avatar_url } : {}),
    }).catch(() => {});
  }, [key, currentUser?.full_name, currentUser?.default_language, currentUser?.language_set, currentUser?.avatar_url]);

  return {
    key,
    convexUser: convexUser ?? null,
    myLanguage: convexUser?.language || null,
    blockedUserIds: convexUser?.blockedUsers || [],
  };
}

/** Live language preferences for a set of participants, keyed by email. */
export function useParticipantLanguages(emails) {
  const list = useMemo(() => [...new Set((emails || []).filter(Boolean))].sort(), [emails?.join('|')]);
  const langs = useConvexQuery(
    convexApi.users.languagesByEmail,
    list.length ? { emails: list } : SKIP,
  );
  return langs || {};
}

/** Live list of the current user's conversations, in UI shape. */
export function useChatConversations(key) {
  const docs = useConvexQuery(convexApi.conversations.getForUser, key ? { userId: key } : SKIP);
  const conversations = useMemo(
    () => (docs || []).map((d) => toUiConversation(d, key)),
    [docs, key],
  );
  return { conversations, loaded: docs !== undefined };
}

/** Page size for chat history - first paint loads only this many messages. */
export const MESSAGE_PAGE_SIZE = 40;

/**
 * Live messages + reactions + read receipts for one conversation.
 * Only the newest `MESSAGE_PAGE_SIZE` messages are subscribed initially;
 * `loadOlder()` grows the live window one page at a time (infinite scroll).
 */
export function useChatMessages(conversationId, { blockedUserIds = [] } = {}) {
  const [limit, setLimit] = useState(MESSAGE_PAGE_SIZE);

  // Reset the window whenever the user switches conversations.
  useEffect(() => {
    setLimit(MESSAGE_PAGE_SIZE);
  }, [conversationId]);

  const page = useConvexQuery(
    convexApi.messages.listPage,
    conversationId ? { conversationId, limit } : SKIP,
  );
  const reactionArgs = conversationId ? { conversationId, limit } : SKIP;
  const reactionDocs = useConvexQuery(convexApi.reactions.listForConversation, reactionArgs);
  const receiptDocs = useConvexQuery(
    convexApi.readReceipts.listForConversation,
    conversationId ? { conversationId } : SKIP,
  );

  // Convex returns `undefined` while a wider window loads - keep showing the
  // previous page so growing the window never blanks the thread.
  const lastPageRef = useRef(null);
  const lastConversationRef = useRef(conversationId);
  if (lastConversationRef.current !== conversationId) {
    lastConversationRef.current = conversationId;
    lastPageRef.current = null;
  }
  if (page !== undefined) lastPageRef.current = page;
  const view = page ?? lastPageRef.current;

  const messageDocs = view?.messages || [];
  const hasMore = !!view?.hasMore;
  const loadingOlder = page === undefined && !!lastPageRef.current;

  const messages = useMemo(() => {
    const docs = view?.messages || [];
    const reactions = groupReactions(reactionDocs || []);
    const readBy = deriveReadBy(docs, receiptDocs || []);
    return docs
      .filter((d) => !blockedUserIds.includes(d.senderId))
      .map((d) => toUiMessage(d, reactions, readBy));
  }, [view, reactionDocs, receiptDocs, blockedUserIds.join(',')]);

  const loadOlder = useCallback(() => {
    if (!hasMore || page === undefined) return;
    setLimit((prev) => prev + MESSAGE_PAGE_SIZE);
  }, [hasMore, page === undefined]);

  return {
    messages,
    messageDocs,
    loaded: view !== null && view !== undefined,
    hasMore,
    loadingOlder,
    loadOlder,
  };
}

/** Presence for a conversation: my heartbeat out, typing + last-seen in. */
export function useChatPresence({ conversationId, key, otherKey }) {
  const heartbeat = useConvexMutation(convexApi.presence.heartbeat);
  const presenceDocs = useConvexQuery(
    convexApi.presence.listForConversation,
    conversationId ? { conversationId } : SKIP,
  );
  const otherPresence = useConvexQuery(
    convexApi.presence.getForUser,
    otherKey ? { userId: otherKey } : SKIP,
  );
  const typingTimerRef = useRef(null);

  // Heartbeat while the chat is open
  useEffect(() => {
    if (!key) return;
    const ping = (isTyping = false) =>
      heartbeat({
        userId: key,
        ...(conversationId ? { conversationId } : {}),
        isOnline: true,
        isTyping,
      }).catch(() => {});
    ping();
    const interval = setInterval(() => ping(false), 25000);
    return () => {
      clearInterval(interval);
      clearTimeout(typingTimerRef.current);
    };
  }, [key, conversationId]);

  // Clear typing flag when leaving the conversation
  useEffect(() => {
    if (!key || !conversationId) return;
    return () => {
      heartbeat({ userId: key, conversationId, isOnline: true, isTyping: false }).catch(() => {});
    };
  }, [key, conversationId]);

  const setTyping = (isTyping) => {
    if (!key || !conversationId) return;
    heartbeat({ userId: key, conversationId, isOnline: true, isTyping }).catch(() => {});
  };

  const notifyTyping = () => {
    setTyping(true);
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setTyping(false), 3000);
  };

  const othersTyping = (presenceDocs || [])
    .filter((p) => p.isTyping && p.userId !== key && Date.now() - p.updatedAt < 10000)
    .map((p) => p.userId);

  return {
    othersTyping,
    contactPresence: presenceLabel(otherPresence),
    setTyping,
    notifyTyping,
  };
}

/** Read receipts: mark the conversation read whenever new messages land. */
export function useReadReceipts({ conversationId, key, messageDocs }) {
  const markRead = useConvexMutation(convexApi.readReceipts.markRead);
  const lastId = messageDocs?.length ? messageDocs[messageDocs.length - 1]._id : null;

  useEffect(() => {
    if (!conversationId || !key) return;
    markRead({
      conversationId,
      userId: key,
      ...(lastId ? { lastReadMessageId: lastId } : {}),
    }).catch(() => {});
  }, [conversationId, key, lastId]);

  return { markRead };
}

/** All chat write paths, as Convex mutations. */
export function useChatMutations() {
  const sendMessage = useConvexMutation(convexApi.messages.send);
  const updateMessage = useConvexMutation(convexApi.messages.update);
  const removeMessage = useConvexMutation(convexApi.messages.remove);
  const toggleReaction = useConvexMutation(convexApi.reactions.toggle);
  const createConversation = useConvexMutation(convexApi.conversations.create);
  const updateConversationRaw = useConvexMutation(convexApi.conversations.update);
  const removeConversation = useConvexMutation(convexApi.conversations.remove);
  const toggleBlock = useConvexMutation(convexApi.users.toggleBlockByEmail);
  const reportConversation = useConvexMutation(convexApi.conversations.reportConversation);
  const startCall = useConvexMutation(convexApi.calls.start);
  const updateCallStatus = useConvexMutation(convexApi.calls.updateStatus);

  const updateConversation = (conversationId, patch) =>
    updateConversationRaw({ conversationId, ...toConvexConversationPatch(patch) });

  return {
    sendMessage,
    updateMessage,
    removeMessage,
    toggleReaction,
    createConversation,
    updateConversation,
    removeConversation,
    toggleBlock,
    reportConversation,
    startCall,
    updateCallStatus,
  };
}

/** Live incoming (ringing) calls for the current user. */
export function useIncomingCalls(key) {
  return useConvexQuery(convexApi.calls.getIncoming, key ? { userId: key } : SKIP) || [];
}
