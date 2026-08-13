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
};

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
  createdAt: number;
}
