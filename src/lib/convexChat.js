/**
 * Imperative Convex helpers for code that runs outside React hooks
 * (WebRTC signaling loops, offline-queue flush, modals).
 * Reactive reads in the chat UI use the hooks in `@/hooks/useConvexChat`.
 */
import { getConvexClient } from '@/lib/convex';
import { convexApi } from '@/lib/convexApi';
import { toConvexConversationPatch } from '@/lib/chatMap';

function client() {
  const c = getConvexClient();
  if (!c) throw new Error('Convex is not configured (missing VITE_CONVEX_URL)');
  return c;
}

export const convexChat = {
  query: (ref, args) => client().query(ref, args),
  mutation: (ref, args) => client().mutation(ref, args),

  /** Subscribe to a Convex query; returns an unsubscribe function. */
  watch(ref, args, onResult) {
    const watcher = client().watchQuery(ref, args);
    const unsubscribe = watcher.onUpdate(() => {
      try {
        onResult(watcher.localQueryResult());
      } catch {
        /* query errored - ignore this tick */
      }
    });
    return unsubscribe;
  },

  // ── conversations ───────────────────────────────────────────────────────
  getConversation: (conversationId) => client().query(convexApi.conversations.get, { conversationId }),
  getConversationByInvite: (inviteCode) =>
    client().query(convexApi.conversations.getByInviteCode, { inviteCode }),
  createConversation: (input) => client().mutation(convexApi.conversations.create, input),
  updateConversation: (conversationId, patch) =>
    client().mutation(convexApi.conversations.update, {
      conversationId,
      ...toConvexConversationPatch(patch),
    }),
  addParticipant: (args) => client().mutation(convexApi.conversations.addParticipant, args),
  deleteConversation: (conversationId) =>
    client().mutation(convexApi.conversations.remove, { conversationId }),


  // ── messages ────────────────────────────────────────────────────────────
  sendMessage: (args) => client().mutation(convexApi.messages.send, args),
  updateMessage: (args) => client().mutation(convexApi.messages.update, args),
  deleteMessage: (messageId) => client().mutation(convexApi.messages.update, { messageId, deleted: true }),

  // ── presence / receipts / reactions ─────────────────────────────────────
  heartbeat: (args) => client().mutation(convexApi.presence.heartbeat, args),
  markRead: (args) => client().mutation(convexApi.readReceipts.markRead, args),
  toggleReaction: (args) => client().mutation(convexApi.reactions.toggle, args),

  // ── calls (WebRTC signaling) ────────────────────────────────────────────
  startCall: (args) => client().mutation(convexApi.calls.start, args),
  answerCall: (args) => client().mutation(convexApi.calls.answer, args),
  addCandidate: (args) => client().mutation(convexApi.calls.addCandidate, args),
  updateCallStatus: (args) => client().mutation(convexApi.calls.updateStatus, args),
  watchCall: (callId, onResult) => convexChat.watch(convexApi.calls.get, { callId }, onResult),

  // ── users ───────────────────────────────────────────────────────────────
  getUserByEmail: (email) => client().query(convexApi.users.getByEmail, { email }),
  upsertUser: (args) => client().mutation(convexApi.users.createOrUpdateUser, args),
  toggleBlock: (email, targetEmail) =>
    client().mutation(convexApi.users.toggleBlockByEmail, { email, targetEmail }),
  reportConversation: (args) => client().mutation(convexApi.conversations.reportConversation, args),

  // ── background push ─────────────────────────────────────────────────────
  getPushPublicKey: () => client().query(convexApi.pushData.publicKey, {}),
  savePushSubscription: (args) => client().mutation(convexApi.pushData.subscribe, args),
  removePushSubscription: (endpoint) =>
    client().mutation(convexApi.pushData.unsubscribe, { endpoint }),
};

export default convexChat;
