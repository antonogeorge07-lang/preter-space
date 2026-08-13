import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Languages, Trash2, Reply, Check, CheckCheck, Loader2, Copy, Pencil, X } from 'lucide-react';
import DisappearingTimer from '@/components/chat/DisappearingTimer';
import { format } from 'date-fns';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

function formatTime(dateStr) {
  if (!dateStr) return '';
  try { return format(new Date(dateStr), 'h:mm a'); } catch { return ''; }
}

export default function TextMessage({ message, preferredLang, isTranslating, onDelete, onReply, onReaction, onEdit, currentUserId }) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const editInputRef = useRef(null);
  const longPressTimer = useRef(null);

  const isMe = message.sender === 'me';
  const hasTranslation = message.translated_content && message.content !== message.translated_content;
  const displayText = hasTranslation && !showOriginal ? message.translated_content : message.content;

  const reactions = (() => {
    try { return JSON.parse(message.reactions || '{}'); } catch { return {}; }
  })();
  const reactionEntries = Object.entries(reactions).filter(([, users]) => users.length > 0);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = () => setShowEmojiPicker(false);
    setTimeout(() => document.addEventListener('click', handler), 0);
    return () => document.removeEventListener('click', handler);
  }, [showEmojiPicker]);

  const isRead = (() => {
    if (!isMe) return false;
    try {
      const rb = JSON.parse(message.read_by || '[]');
      return rb.some(id => id !== currentUserId);
    } catch { return false; }
  })();

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => setShowActions(true), 500);
  };
  const handleTouchEnd = () => clearTimeout(longPressTimer.current);

  const startEdit = () => {
    setEditText(message.content || '');
    setEditing(true);
    setShowActions(false);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const submitEdit = () => {
    if (editText.trim() && onEdit) onEdit(message.id, editText.trim());
    setEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      onHoverStart={() => setShowActions(true)}
      onHoverEnd={() => setShowActions(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`flex ${isMe ? 'justify-end' : 'justify-start'} px-4 sm:px-6 w-full group`}
    >
      <div className={`max-w-[68%] sm:max-w-[60%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        {/* Reply preview */}
        {message.reply_to_id && (
          <div className={`mb-1.5 px-3 py-1.5 rounded-xl border-l-2 text-xs opacity-70 ${isMe ? 'border-indigo-400' : 'border-indigo-300'}`}
            style={{ background: 'var(--glass-bg-subtle)' }}>
            <span className="font-semibold block text-foreground/70">{message.reply_to_sender}</span>
            <span className="truncate block max-w-[200px] text-foreground/50">{message.reply_to_content}</span>
          </div>
        )}

        <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} relative`}>
          {/* Hover action buttons */}
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
                className={`flex gap-1 mb-1 flex-shrink-0 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {onReaction && (
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(v => !v); }}
                      className="p-1.5 rounded-full text-sm leading-none transition-colors hover:bg-black/5"
                      style={{ color: 'var(--muted)' }}
                    >😊</button>
                    <AnimatePresence>
                      {showEmojiPicker && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8, y: 4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          onClick={e => e.stopPropagation()}
                          className={`absolute bottom-full mb-1 ${isMe ? 'right-0' : 'left-0'} flex gap-1 p-2 rounded-2xl border shadow-lg z-20`}
                          style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)' }}
                        >
                          {EMOJIS.map(emoji => (
                            <button key={emoji} onClick={() => { onReaction(message.id, emoji); setShowEmojiPicker(false); }}
                              className="text-lg hover:scale-125 transition-transform p-0.5">
                              {emoji}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                {onReply && (
                  <button onClick={() => onReply(message)}
                    className="p-1.5 rounded-full hover:bg-black/5 transition-colors" style={{ color: 'var(--muted)' }}>
                    <Reply className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => navigator.clipboard?.writeText(displayText || '')}
                  className="p-1.5 rounded-full hover:bg-black/5 transition-colors" style={{ color: 'var(--muted)' }}
                  title="Copy">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                {isMe && onEdit && (
                  <button onClick={startEdit}
                    className="p-1.5 rounded-full hover:bg-black/5 transition-colors" style={{ color: 'var(--muted)' }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {isMe && onDelete && (
                  <button onClick={() => onDelete(message.id)}
                    className="p-1.5 rounded-full hover:bg-red-50 transition-colors text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bubble */}
          <div
            className={`rounded-2xl px-4 py-3 ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
            style={{
              background: isMe ? 'var(--bubble-outgoing)' : 'var(--bubble-incoming)',
              border: '1px solid var(--card-border)',
            }}
          >
            {!isMe && message.sender_name && (
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--primary)' }}>{message.sender_name}</p>
            )}

            {editing ? (
              <div className="flex flex-col gap-2">
                <textarea
                  ref={editInputRef}
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(); } if (e.key === 'Escape') setEditing(false); }}
                  rows={2}
                  className="w-full bg-[var(--card-bg)] rounded-xl px-3 py-2 text-[14px] text-foreground focus:outline-none resize-none border"
                  style={{ borderColor: 'var(--card-border)', fontFamily: 'var(--font-body)' }}
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditing(false)} className="p-1 rounded-lg hover:bg-black/5"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <button onClick={submitEdit} className="px-3 py-1 rounded-lg text-xs font-medium text-white" style={{ background: 'var(--primary)' }}>Save</button>
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.p key={displayText}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.14 }}
                  className="text-[15px] leading-relaxed break-words"
                  style={{ color: 'var(--foreground)', fontFamily: 'var(--font-body)' }}>
                  {displayText}
                  {message.edited && <span className="text-[10px] ml-1.5 opacity-40">(edited)</span>}
              {message.expires_at && (
                <DisappearingTimer
                  expiresAt={message.expires_at}
                  onExpired={() => onDelete && onDelete(message.id)}
                />
              )}
                </motion.p>
              </AnimatePresence>
            )}

            {isTranslating && (
              <p className="text-xs mt-1.5 flex items-center gap-1 text-muted-foreground/60">
                <Loader2 className="w-3 h-3 animate-spin" /> Translating...
              </p>
            )}

            <div className="flex items-center justify-end mt-1.5 gap-1.5">
              <span className="text-[10px] text-muted-foreground/50">{formatTime(message.created_date)}</span>
              {isMe && (
                isTranslating ? <Loader2 className="w-3 h-3 animate-spin opacity-40" /> :
                isRead ? <CheckCheck className="w-3 h-3" style={{ color: 'var(--primary)' }} /> :
                message.translated_content ? <CheckCheck className="w-3 h-3 opacity-30" /> :
                <Check className="w-3 h-3 opacity-30" />
              )}
            </div>
          </div>
        </div>

        {/* Reactions */}
        {reactionEntries.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
            {reactionEntries.map(([emoji, users]) => (
              <motion.button
                key={emoji}
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onReaction && onReaction(message.id, emoji)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all"
                style={{
                  background: users.includes(currentUserId) ? 'var(--accent-pink)' : 'var(--card-bg)',
                  borderColor: 'var(--card-border)',
                  color: 'var(--primary)',
                }}
              >
                <span>{emoji}</span>
                <span className="font-medium">{users.length}</span>
              </motion.button>
            ))}
          </div>
        )}

        {/* Show original / translation toggle */}
        {hasTranslation && (
          <button onClick={() => setShowOriginal(!showOriginal)}
            className="mt-1 flex items-center gap-1 text-[10px] transition-colors hover:opacity-80"
            style={{ color: 'var(--muted)' }}>
            <Languages className="w-3 h-3" />
            {showOriginal ? 'Show translation' : 'Show original'}
          </button>
        )}
      </div>
    </motion.div>
  );
}