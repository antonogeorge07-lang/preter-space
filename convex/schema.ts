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
    translations: v.optional(v.any()), // Map of language code to translated string
    audioStorageId: v.optional(v.id("_storage")),
    fileStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
  }).index("by_conversation", ["conversationId"]),

  conversation_reports: defineTable({
    reporterId: v.string(),
    targetId: v.string(),
    conversationId: v.optional(v.id("conversations")),
    reason: v.string(),
    createdAt: v.number(),
  }),
});
