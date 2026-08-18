import { fn } from "@/lib/convex";

/**
 * Typed references to the deployed Convex functions in `convex/`.
 * Uses string references (no `_generated/api` import) so the client bundle
 * never depends on codegen output.
 */
export const convexApi = {
  users: {
    getByEmail: fn.query<{ email: string }, ConvexUser | null>("users:getByEmail"),
    search: fn.query<{ term: string; excludeEmail?: string }, ConvexUser[]>("users:search"),
    languagesByEmail: fn.query<{ emails: string[] }, Record<string, string>>(
      "users:languagesByEmail",
    ),
    createOrUpdateUser: fn.mutation<
      { name: string; email: string; language?: string; avatarUrl?: string },
      string
    >("users:createOrUpdateUser"),
    toggleBlockUser: fn.mutation<{ userId: string; targetUserId: string }, boolean>(
      "users:toggleBlockUser",
    ),
    toggleBlockByEmail: fn.mutation<{ email: string; targetEmail: string }, boolean>(
      "users:toggleBlockByEmail",
    ),
    deleteAccount: fn.mutation<{ userId: string }, null>("users:deleteAccount"),
  },
  conversations: {
    getForUser: fn.query<{ userId: string }, ConvexConversation[]>("conversations:getForUser"),
    get: fn.query<{ conversationId: string }, ConvexConversation | null>("conversations:get"),
    getByInviteCode: fn.query<{ inviteCode: string }, ConvexConversation | null>(
      "conversations:getByInviteCode",
    ),
    create: fn.mutation<ConvexConversationInput, string>("conversations:create"),
    update: fn.mutation<{ conversationId: string } & ConvexConversationPatch, string>(
      "conversations:update",
    ),
    remove: fn.mutation<{ conversationId: string }, null>("conversations:remove"),
    reportConversation: fn.mutation<
      { reporterId: string; targetId: string; conversationId?: string; reason: string },
      string
    >("conversations:reportConversation"),
  },
  messages: {
    list: fn.query<{ conversationId: string }, ConvexMessage[]>("messages:list"),
    listPage: fn.query<
      { conversationId: string; limit?: number },
      { messages: ConvexMessage[]; hasMore: boolean }
    >("messages:listPage"),
    send: fn.mutation<
      {
        conversationId: string;
        senderId: string;
        text: string;
        translations?: Record<string, string>;
        audioStorageId?: string;
        fileStorageId?: string;
        replyToId?: string;
        meta?: Record<string, unknown>;
      },
      string
    >("messages:send"),
    sendWithTranslation: fn.action<
      {
        conversationId: string;
        senderId: string;
        text: string;
        targetLanguages: string[];
        replyToId?: string;
        meta?: Record<string, unknown>;
      },
      { messageId: string; translations: Record<string, string>; detectedLanguage: string }
    >("messages:sendWithTranslation"),
    update: fn.mutation<
      {
        messageId: string;
        text?: string;
        translations?: Record<string, string>;
        meta?: Record<string, unknown>;
        deleted?: boolean;
        edited?: boolean;
      },
      string
    >("messages:update"),
    remove: fn.mutation<{ messageId: string }, null>("messages:remove"),
  },
  pushData: {
    publicKey: fn.query<Record<string, never>, string | null>("pushData:publicKey"),
    subscribe: fn.mutation<
      { userId: string; endpoint: string; p256dh: string; auth: string },
      string
    >("pushData:subscribe"),
    unsubscribe: fn.mutation<{ endpoint: string }, null>("pushData:unsubscribe"),
  },
  files: {
    generateUploadUrl: fn.mutation<Record<string, never>, string>("files:generateUploadUrl"),
    getUrl: fn.query<{ storageId: string }, string | null>("files:getUrl"),
  },
  authEmail: {
    verifySession: fn.mutation<{ email: string }, { isValid: boolean; user: ConvexUser | null }>(
      "authEmail:verifySession",
    ),
  },
  reactions: {
    listForMessage: fn.query<{ messageId: string }, ConvexReaction[]>("reactions:listForMessage"),
    listForConversation: fn.query<{ conversationId: string; limit?: number }, ConvexReaction[]>(
      "reactions:listForConversation",
    ),
    toggle: fn.mutation<{ messageId: string; userId: string; emoji: string }, boolean>(
      "reactions:toggle",
    ),
  },
  readReceipts: {
    listForConversation: fn.query<{ conversationId: string }, ConvexReadReceipt[]>(
      "readReceipts:listForConversation",
    ),
    markRead: fn.mutation<
      { conversationId: string; userId: string; lastReadMessageId?: string },
      string
    >("readReceipts:markRead"),
  },
  presence: {
    listForConversation: fn.query<{ conversationId: string }, ConvexPresence[]>(
      "presence:listForConversation",
    ),
    getForUser: fn.query<{ userId: string }, ConvexPresence | null>("presence:getForUser"),
    heartbeat: fn.mutation<
      { userId: string; conversationId?: string; isOnline: boolean; isTyping?: boolean },
      string
    >("presence:heartbeat"),
  },
  calls: {
    getIncoming: fn.query<{ userId: string }, ConvexCall[]>("calls:getIncoming"),
    get: fn.query<{ callId: string }, ConvexCall | null>("calls:get"),
    start: fn.mutation<
      {
        conversationId?: string;
        callerId: string;
        calleeId: string;
        callerName?: string;
        calleeName?: string;
        isVideo?: boolean;
        offer?: unknown;
      },
      string
    >("calls:start"),
    answer: fn.mutation<{ callId: string; answer?: unknown }, null>("calls:answer"),
    addCandidate: fn.mutation<{ callId: string; from: string; candidate: unknown }, null>(
      "calls:addCandidate",
    ),
    updateStatus: fn.mutation<{ callId: string; status: string }, null>("calls:updateStatus"),
  },
};

export interface ConvexConversationPatch {
  [key: string]: unknown;
  title?: string;
  avatarUrl?: string;
  participantIds?: string[];
  participantNames?: string[];
  participantLanguages?: Record<string, string>;
  preferredLanguage?: string;
  lastMessagePreview?: string;
  lastMessageTime?: number;
  unreadCounts?: Record<string, number>;
  typingUserIds?: string[];
  pinned?: boolean;
  archived?: boolean;
  muted?: boolean;
  inviteCode?: string;
  inviteOpen?: boolean;
}

export type ConvexConversationInput = ConvexConversationPatch & {
  isGroup: boolean;
  creatorId: string;
  participantIds: string[];
};

export interface ConvexReaction {
  _id: string;
  _creationTime: number;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: number;
}

export interface ConvexReadReceipt {
  _id: string;
  _creationTime: number;
  conversationId: string;
  userId: string;
  lastReadMessageId?: string;
  lastReadAt: number;
}

export interface ConvexPresence {
  _id: string;
  _creationTime: number;
  userId: string;
  conversationId?: string;
  isOnline: boolean;
  isTyping?: boolean;
  updatedAt: number;
}

export interface ConvexCall {
  _id: string;
  _creationTime: number;
  conversationId?: string;
  callerId: string;
  calleeId: string;
  callerName?: string;
  calleeName?: string;
  status: string;
  isVideo?: boolean;
  offer?: unknown;
  answer?: unknown;
  callerCandidates?: unknown[];
  calleeCandidates?: unknown[];
  startedAt: number;
  endedAt?: number;
}

export interface ConvexUser {
  _id: string;
  _creationTime: number;
  name: string;
  email: string;
  language?: string;
  avatarUrl?: string;
  isOnline?: boolean;
  lastSeen?: number;
  blockedUsers?: string[];
}

export interface ConvexConversation {
  _id: string;
  _creationTime: number;
  title?: string;
  isGroup: boolean;
  creatorId: string;
  participantIds: string[];
  lastMessageTime?: number;
  avatarUrl?: string;
  participantNames?: string[];
  participantLanguages?: Record<string, string>;
  preferredLanguage?: string;
  lastMessagePreview?: string;
  unreadCounts?: Record<string, number>;
  typingUserIds?: string[];
  pinned?: boolean;
  archived?: boolean;
  muted?: boolean;
  inviteCode?: string;
  inviteOpen?: boolean;
}

export interface ConvexMessage {
  _id: string;
  _creationTime: number;
  conversationId: string;
  senderId: string;
  text: string;
  translations?: Record<string, string>;
  audioStorageId?: string;
  fileStorageId?: string;
  replyToId?: string;
  meta?: Record<string, unknown>;
  deleted?: boolean;
  edited?: boolean;
  createdAt: number;
}
