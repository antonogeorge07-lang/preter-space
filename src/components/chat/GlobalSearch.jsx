import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MessageSquare } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';

export default function GlobalSearch({ conversations, onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const results = query.trim().length < 1 ? [] : conversations.filter(c =>
    c.participant_name?.toLowerCase().includes(query.toLowerCase()) ||
    c.last_message_preview?.toLowerCase().includes(query.toLowerCase())
  );

  const recent = query.trim().length < 1
    ? [...conversations].sort((a, b) => new Date(b.last_message_time || 0) - new Date(a.last_message_time || 0)).slice(0, 6)
    : [];

  const list = query.trim().length >= 1 ? results : recent;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-start justify-center pt-16 px-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--surface-bg)', border: '1px solid var(--surface-border)' }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid var(--surface-border)' }}>
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--muted)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search conversations..."
            className="flex-1 bg-transparent text-sm focus:outline-none"
            style={{ color: 'var(--foreground)' }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ color: 'var(--muted)' }}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {list.length === 0 && query.trim().length >= 1 && (
            <p className="text-center py-8 text-sm" style={{ color: 'var(--muted)' }}>No conversations found</p>
          )}
          {list.length === 0 && query.trim().length < 1 && (
            <p className="text-center py-8 text-sm" style={{ color: 'var(--muted)' }}>No conversations yet</p>
          )}
          {query.trim().length < 1 && list.length > 0 && (
            <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Recent</p>
          )}
          {list.map(conv => (
            <button
              key={conv.id}
              onClick={() => { onSelect(conv); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/5 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                style={{ background: 'var(--glass-border)', color: 'var(--primary)' }}>
                {conv.is_group ? '👥' : conv.participant_name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{conv.participant_name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{conv.last_message_preview || 'No messages yet'}</p>
              </div>
              {conv.last_message_time && (
                <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--muted)' }}>
                  {formatDistanceToNowStrict(new Date(conv.last_message_time), { addSuffix: false })}
                </span>
              )}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}