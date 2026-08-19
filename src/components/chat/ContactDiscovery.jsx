import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Search, MessageSquare } from 'lucide-react';
import { useConvexQuery } from '@/lib/convex';
import { convexApi } from '@/lib/convexApi';

export default function ContactDiscovery({ isOpen, onClose, currentUser, onStartConversation }) {
  const [query, setQuery] = useState('');
  const term = query.trim();

  // Live directory search against Convex
  const results = useConvexQuery(
    convexApi.users.search,
    isOpen && term.length >= 2
      ? { term, ...(currentUser?.email ? { excludeEmail: currentUser.email } : {}) }
      : 'skip',
  );
  const loading = isOpen && term.length >= 2 && results === undefined;

  const users = useMemo(
    () =>
      (results || []).map((u) => ({
        id: u.email,
        email: u.email,
        full_name: u.name,
        avatar_url: u.avatarUrl || null,
        default_language: u.language || 'en',
        last_seen: u.lastSeen || null,
        is_online: !!u.isOnline,
      })),
    [results],
  );

  const filtered = users;

  const isOnline = (u) => {
    if (u.is_online && u.last_seen) return Date.now() - u.last_seen < 300000;
    return false;
  };


  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-full sm:max-w-sm box-border max-h-[88dvh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: 'var(--surface-bg)', border: '1px solid var(--surface-border)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--surface-border)' }}>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                <h2 className="font-semibold text-base font-heading" style={{ color: 'var(--foreground)' }}>
                  People on Preter
                </h2>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-xl transition-colors" style={{ color: 'var(--muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--surface-border)' }}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--muted)' }} />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by name..."
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                  style={{ color: 'var(--foreground)' }}
                />
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto" style={{ maxHeight: '55vh' }}>
              {loading && (
                <p className="text-center py-8 text-sm" style={{ color: 'var(--muted)' }}>Searching...</p>
              )}
              {!loading && query.trim().length < 2 && (
                <p className="text-center py-8 text-sm" style={{ color: 'var(--muted)' }}>Type at least 2 letters to find people</p>
              )}
              {!loading && query.trim().length >= 2 && filtered.length === 0 && (
                <p className="text-center py-8 text-sm" style={{ color: 'var(--muted)' }}>No Preter users match that name</p>
              )}

              {filtered.map(u => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-black/5">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                      style={{ background: 'var(--glass-border)', color: 'var(--primary)' }}>
                      {u.full_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    {isOnline(u) && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400" style={{ border: '2px solid var(--paper)' }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{u.full_name || 'Unknown'}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{isOnline(u) ? 'Active now' : 'Offline'}</p>
                  </div>
                  <button
                    onClick={() => { onStartConversation(u); onClose(); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80"
                    style={{ background: 'var(--primary)', color: 'var(--paper)' }}>
                    <MessageSquare className="w-3 h-3" /> Chat
                  </button>
                </div>
              ))}
            </div>
            <div className="h-[env(safe-area-inset-bottom)]" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}