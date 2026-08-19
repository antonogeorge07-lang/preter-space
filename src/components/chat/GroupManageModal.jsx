import { convexChat } from '@/lib/convexChat';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Crown, UserMinus, UserPlus, Search, Loader2 } from 'lucide-react';
import { useConvexQuery } from '@/lib/convex';
import { convexApi } from '@/lib/convexApi';
import { toast } from '@/components/ui/use-toast';

export default function GroupManageModal({ isOpen, onClose, conversation, currentUser }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(null);

  const participantIds = conversation?.participant_ids || [];
  const participantNames = conversation?.participant_names || [];
  const adminId = conversation?.created_by_id;
  const isAdmin = currentUser?.id === adminId;
  const term = query.trim();
  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(term);

  useEffect(() => {
    if (!isOpen || !participantIds.length) return;
    setLoading(true);
    const list = participantIds.map((id, i) => ({
      id,
      name: participantNames[i] || id,
    }));
    setMembers(list);
    setLoading(false);
  }, [isOpen, conversation?.id, participantIds.join(','), participantNames.join(',')]);

  useEffect(() => {
    if (!isOpen) setQuery('');
  }, [isOpen]);

  // Live contact search (same directory used by "People on Preter").
  const results = useConvexQuery(
    convexApi.users.search,
    isOpen && term.length >= 2
      ? { term, ...(currentUser?.id ? { excludeEmail: currentUser.id } : {}) }
      : 'skip',
  );
  const searching = isOpen && term.length >= 2 && results === undefined;

  const candidates = useMemo(
    () => (results || []).filter((u) => !participantIds.includes(u.email)),
    [results, participantIds.join(',')],
  );

  const handleRemove = async (memberId) => {
    if (!isAdmin || memberId === currentUser?.id) return;
    const newIds = participantIds.filter(id => id !== memberId);
    const newNames = participantNames.filter((_, i) => participantIds[i] !== memberId);
    await convexChat.updateConversation(conversation.id, {
      participant_ids: newIds,
      participant_names: newNames,
    });
    setMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const handleAdd = async ({ userId, userName, language }) => {
    if (!conversation?.id || !userId) return;
    if (participantIds.includes(userId)) {
      toast({ title: 'Already in the group', description: `${userName || userId} is already a participant.` });
      return;
    }
    setAdding(userId);
    try {
      await convexChat.addParticipant({
        conversationId: conversation.id,
        userId,
        ...(userName ? { userName } : {}),
        ...(language ? { language } : {}),
      });
      setMembers(prev => [...prev, { id: userId, name: userName || userId }]);
      setQuery('');
      toast({ title: 'Participant added', description: `${userName || userId} can now see this conversation.` });
    } catch {
      toast({ title: 'Could not add participant', description: 'Please try again in a moment.', variant: 'destructive' });
    } finally {
      setAdding(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
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
            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b" style={{ borderColor: 'var(--surface-border)' }}>
              <div className="flex min-w-0 items-center gap-2">
                <Users className="w-4 h-4 shrink-0" style={{ color: 'var(--primary)' }} />
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-sm font-heading" style={{ color: 'var(--foreground)' }}>
                    {conversation?.group_name || conversation?.participant_name}
                  </h2>
                  <p className="text-[10px]" style={{ color: 'var(--muted)' }}>{members.length} members</p>
                </div>
              </div>
              <button onClick={onClose} aria-label="Close group info" className="p-1.5 rounded-xl hover:bg-black/5 transition-colors shrink-0" style={{ color: 'var(--muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Member list */}
            <div className="overflow-y-auto overflow-x-hidden" style={{ maxHeight: '30dvh' }}>
              {loading && <p className="text-center py-6 text-sm" style={{ color: 'var(--muted)' }}>Loading...</p>}
              {members.map(member => (
                <div key={member.id} className="flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-black/5 transition-colors">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                    style={{ background: 'var(--accent-pink)', color: 'var(--primary)' }}>
                    {member.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{member.name}</p>
                    {member.id === adminId && (
                      <p className="text-[10px] flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                        <Crown className="w-2.5 h-2.5" /> Admin
                      </p>
                    )}
                  </div>
                  {isAdmin && member.id !== currentUser?.id && member.id !== adminId && (
                    <button
                      onClick={() => handleRemove(member.id)}
                      className="p-1.5 rounded-xl hover:bg-red-50 transition-colors shrink-0"
                      aria-label={`Remove ${member.name}`}
                      title="Remove member">
                      <UserMinus className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add participant */}
            <div className="px-3 sm:px-4 py-3 border-t space-y-2 overflow-y-auto" style={{ borderColor: 'var(--surface-border)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                Add participant
              </p>
              <div className="flex w-full items-center gap-2 px-3 py-2 rounded-xl box-border"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--muted)' }} />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search name or type an email"
                  className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
                  style={{ color: 'var(--foreground)' }}
                />
              </div>

              <div className="max-h-40 overflow-y-auto overflow-x-hidden">
                {searching && (
                  <p className="flex items-center gap-2 py-2 text-xs" style={{ color: 'var(--muted)' }}>
                    <Loader2 className="w-3 h-3 animate-spin" /> Searching...
                  </p>
                )}
                {candidates.map(u => (
                  <div key={u.email} className="flex items-center gap-3 py-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                      style={{ background: 'var(--glass-border)', color: 'var(--primary)' }}>
                      {(u.name || u.email)?.[0]?.toUpperCase() || '?'}
                    </div>
                    <p className="min-w-0 flex-1 truncate text-sm" style={{ color: 'var(--foreground)' }}>{u.name || u.email}</p>
                    <button
                      onClick={() => handleAdd({ userId: u.email, userName: u.name || u.email, language: u.language })}
                      disabled={adding === u.email}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 shrink-0"
                      style={{ background: 'var(--primary)', color: 'var(--paper)' }}>
                      <UserPlus className="w-3 h-3" /> {adding === u.email ? '...' : 'Add'}
                    </button>
                  </div>
                ))}
                {!searching && looksLikeEmail && !participantIds.includes(term) && candidates.length === 0 && (
                  <button
                    onClick={() => handleAdd({ userId: term, userName: term })}
                    disabled={adding === term}
                    className="mt-1 flex w-full items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
                    style={{ background: 'var(--primary)', color: 'var(--paper)' }}>
                    <UserPlus className="w-3.5 h-3.5" /> {adding === term ? 'Adding...' : `Add ${term}`}
                  </button>
                )}
                {!searching && !looksLikeEmail && term.length >= 2 && candidates.length === 0 && (
                  <p className="py-2 text-xs" style={{ color: 'var(--muted)' }}>No matches. Enter a full email to add directly.</p>
                )}
              </div>
            </div>
            <div className="pb-safe" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
