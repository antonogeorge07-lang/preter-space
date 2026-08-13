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
    listForConversation: fn.query<{ conversationId: string }, ConvexReaction[]>(
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
