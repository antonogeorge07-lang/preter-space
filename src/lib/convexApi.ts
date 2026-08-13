import { fn } from "@/lib/convex";

/**
 * Typed references to the deployed Convex functions in `convex/`.
 * Uses string references (no `_generated/api`) because codegen needs a
 * Convex deploy key, which isn't available in this environment.
 */
export const convexApi = {
  users: {
    getByEmail: fn.query<{ email: string }, ConvexUser | null>("users:getByEmail"),
    createOrUpdateUser: fn.mutation<
      { name: string; email: string; language?: string; avatarUrl?: string },
      string
    >("users:createOrUpdateUser"),
    toggleBlockUser: fn.mutation<{ userId: string; targetUserId: string }, boolean>(
      "users:toggleBlockUser",
    ),
    deleteAccount: fn.mutation<{ userId: string }, null>("users:deleteAccount"),
  },
  conversations: {
    getForUser: fn.query<{ userId: string }, ConvexConversation[]>("conversations:getForUser"),
    create: fn.mutation<
      { title?: string; isGroup: boolean; creatorId: string; participantIds: string[] },
      string
    >("conversations:create"),
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
      },
      string
    >("messages:send"),
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
  createdAt: number;
}
