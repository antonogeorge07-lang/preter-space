import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    language: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    isOnline: v.optional(v.boolean()),
    lastSeen: v.optional(v.number()),
    blockedUsers: v.optional(v.array(v.string())),
  }).index("by_email", ["email"]),

  conversations: defineTable({
    title: v.optional(v.string()),
    isGroup: v.boolean(),
    creatorId: v.string(),
    participantIds: v.array(v.string()),
    lastMessageTime: v.optional(v.number()),
  }),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.string(),
    text: v.string(),
    translations: v.optional(v.any()),
    audioStorageId: v.optional(v.id("_storage")),
    fileStorageId: v.optional(v.id("_storage")),
    replyToId: v.optional(v.id("messages")),
    createdAt: v.number(),
  }).index("by_conversation", ["conversationId"]),

  conversation_reports: defineTable({
    reporterId: v.string(),
    targetId: v.string(),
    conversationId: v.optional(v.id("conversations")),
    reason: v.string(),
    createdAt: v.number(),
  }),

  // --- New: reactions ---
  reactions: defineTable({
    messageId: v.id("messages"),
    userId: v.string(),
    emoji: v.string(),
    createdAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_message_user", ["messageId", "userId"]),

  // --- New: read receipts ---
  read_receipts: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(),
    lastReadMessageId: v.optional(v.id("messages")),
    lastReadAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_user", ["conversationId", "userId"]),

  // --- New: presence / typing ---
  presence: defineTable({
    userId: v.string(),
    conversationId: v.optional(v.id("conversations")),
    isOnline: v.boolean(),
    isTyping: v.optional(v.boolean()),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_conversation", ["conversationId"]),

  // --- New: calls ---
  calls: defineTable({
    conversationId: v.optional(v.id("conversations")),
    callerId: v.string(),
    calleeId: v.string(),
    status: v.string(), // ringing | accepted | declined | ended | missed
    isVideo: v.optional(v.boolean()),
    offer: v.optional(v.any()),
    answer: v.optional(v.any()),
    callerCandidates: v.optional(v.array(v.any())),
    calleeCandidates: v.optional(v.array(v.any())),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_callee", ["calleeId"])
    .index("by_caller", ["callerId"]),
});
