/**
 * Mapping between Convex documents and the shapes the chat UI components use.
 * Convex identifies people by email, which is what `participantIds` / `senderId` hold.
 */

export const userKey = (user) => user?.email || null;

/** Convex conversation doc -> UI conversation */
export function toUiConversation(doc, myKey) {
  if (!doc) return null;
  const names = doc.participantNames || [];
  const ids = doc.participantIds || [];
  const otherIdx = ids.findIndex((id) => id !== myKey);
  const otherName = otherIdx >= 0 ? names[otherIdx] : undefined;
  return {
    id: doc._id,
    is_group: !!doc.isGroup,
    created_by_id: doc.creatorId,
    participant_ids: ids,
    participant_names: names,
    participant_name: doc.isGroup ? doc.title || 'Group' : otherName || doc.title || 'Contact',
    participant_avatar: doc.avatarUrl || null,
    participant_languages: JSON.stringify(doc.participantLanguages || {}),
    preferred_language: doc.preferredLanguage || 'en',
    last_message_preview: doc.lastMessagePreview || '',
    last_message_time: doc.lastMessageTime ? new Date(doc.lastMessageTime).toISOString() : null,
    unread_counts: JSON.stringify(doc.unreadCounts || {}),
    typing_user_ids: JSON.stringify(doc.typingUserIds || []),
    pinned: !!doc.pinned,
    archived: !!doc.archived,
    muted: !!doc.muted,
    invite_code: doc.inviteCode || null,
    invite_open: !!doc.inviteOpen,
    created_date: new Date(doc._creationTime).toISOString(),
  };
}

const JSON_FIELDS = {
  participant_languages: 'participantLanguages',
  unread_counts: 'unreadCounts',
};

const PLAIN_FIELDS = {
  participant_ids: 'participantIds',
  participant_names: 'participantNames',
  participant_avatar: 'avatarUrl',
  preferred_language: 'preferredLanguage',
  last_message_preview: 'lastMessagePreview',
  pinned: 'pinned',
  archived: 'archived',
  muted: 'muted',
  invite_code: 'inviteCode',
  invite_open: 'inviteOpen',
  typing_user_ids: 'typingUserIds',
  title: 'title',
};

/** UI conversation patch (snake_case, JSON strings) -> Convex mutation args */
export function toConvexConversationPatch(patch = {}) {
  const out = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (JSON_FIELDS[key]) {
      out[JSON_FIELDS[key]] = typeof value === 'string' ? safeJson(value, {}) : value;
    } else if (key === 'typing_user_ids') {
      out.typingUserIds = typeof value === 'string' ? safeJson(value, []) : value;
    } else if (key === 'participant_name') {
      out.title = value;
    } else if (key === 'last_message_time') {
      out.lastMessageTime = typeof value === 'string' ? Date.parse(value) : value;
    } else if (PLAIN_FIELDS[key]) {
      out[PLAIN_FIELDS[key]] = value;
    }
  }
  return out;
}

export function safeJson(raw, fallback) {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : (raw ?? fallback);
  } catch {
    return fallback;
  }
}

/**
 * Convex message doc -> UI message.
 * `reactionsByMessage` is a Map<messageId, { [emoji]: userKey[] }>.
 * `readBy` is a Map<messageId, userKey[]> derived from read receipts.
 */
export function toUiMessage(doc, reactionsByMessage, readBy) {
  const meta = doc.meta || {};
  return {
    id: doc._id,
    conversation_id: doc.conversationId,
    sender_id: doc.senderId,
    sender_name: meta.senderName || doc.senderId,
    content: doc.text || '',
    translated_content: meta.translatedContent || '',
    original_language: meta.originalLanguage || '',
    target_language: meta.targetLanguage || '',
    type: meta.type || 'text',
    image_url: meta.imageUrl || null,
    video_url: meta.videoUrl || null,
    audio_url: meta.audioUrl || null,
    file_url: meta.fileUrl || null,
    file_name: meta.fileName || null,
    file_size: meta.fileSize || null,
    transcript: meta.transcript || null,
    translated_transcript: meta.translatedTranscript || null,
    reply_to_id: doc.replyToId || null,
    reply_to_content: meta.replyToContent || null,
    reply_to_sender: meta.replyToSender || null,
    expires_at: meta.expiresAt || null,
    is_guide: !!meta.isGuide,
    deleted: !!doc.deleted,
    edited: !!doc.edited,
    reactions: JSON.stringify(reactionsByMessage?.get(doc._id) || {}),
    read_by: JSON.stringify(readBy?.get(doc._id) || []),
    created_date: new Date(doc.createdAt || doc._creationTime).toISOString(),
  };
}

/** Group reaction docs by message into `{ emoji: [userKey] }` maps. */
export function groupReactions(reactionDocs = []) {
  const map = new Map();
  for (const r of reactionDocs) {
    const byEmoji = map.get(r.messageId) || {};
    byEmoji[r.emoji] = [...(byEmoji[r.emoji] || []), r.userId];
    map.set(r.messageId, byEmoji);
  }
  return map;
}

/** Derive per-message read lists from conversation read receipts. */
export function deriveReadBy(messageDocs = [], receipts = []) {
  const map = new Map();
  for (const msg of messageDocs) {
    const readers = receipts
      .filter((r) => r.userId !== msg.senderId && r.lastReadAt >= (msg.createdAt || msg._creationTime))
      .map((r) => r.userId);
    map.set(msg._id, readers);
  }
  return map;
}

/** Human "last seen" label from a presence doc. */
export function presenceLabel(doc) {
  if (!doc) return null;
  const diff = (Date.now() - (doc.updatedAt || 0)) / 1000;
  if (doc.isOnline && diff < 90) return 'online';
  const mins = Math.round(diff / 60);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}
