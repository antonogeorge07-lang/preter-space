import { db } from '@/lib/db';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Crown, UserMinus, UserPlus } from 'lucide-react';

export default function GroupManageModal({ isOpen, onClose, conversation, currentUser }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const participantIds = conversation?.participant_ids || [];
  const participantNames = conversation?.participant_names || [];
  const adminId = conversation?.created_by_id;
  const isAdmin = currentUser?.id === adminId;

  useEffect(() => {
    if (!isOpen || !participantIds.length) return;
    setLoading(true);
    const list = participantIds.map((id, i) => ({
      id,
      name: participantNames[i] || id,
    }));
    setMembers(list);
    setLoading(false);
  }, [isOpen, conversation?.id]);

  const handleRemove = async (memberId) => {
    if (!isAdmin || memberId === currentUser?.id) return;
    const newIds = participantIds.filter(id => id !== memberId);
    const newNames = participantNames.filter((_, i) => participantIds[i] !== memberId);
    await db.entities.Conversation.update(conversation.id, {
      participant_ids: newIds,
      participant_names: newNames,
    });
    setMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await db.users.inviteUser(inviteEmail.trim(), 'user');
      setInviteEmail('');
    } finally {
      setInviting(false);
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
            className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: 'var(--surface-bg)', border: '1px solid var(--surface-border)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--surface-border)' }}>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                <div>
                  <h2 className="font-semibold text-sm font-heading" style={{ color: 'var(--foreground)' }}>
                    {conversation?.group_name || conversation?.participant_name}
                  </h2>
                  <p className="text-[10px]" style={{ color: 'var(--muted)' }}>{members.length} members</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-black/5 transition-colors" style={{ color: 'var(--muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Member list */}
            <div className="overflow-y-auto" style={{ maxHeight: '45vh' }}>
              {loading && <p className="text-center py-6 text-sm" style={{ color: 'var(--muted)' }}>Loading...</p>}
              {members.map(member => (
                <div key={member.id} className="flex items-center gap-3 px-4 py-3 hover:bg-black/5 transition-colors">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
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
                      className="p-1.5 rounded-xl hover:bg-red-50 transition-colors"
                      title="Remove member">
                      <UserMinus className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Invite section (admin only) */}
            {isAdmin && (
              <form onSubmit={handleInvite} className="px-4 py-3 border-t" style={{ borderColor: 'var(--surface-border)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--muted)' }}>
                  Invite by email
                </p>
                <div className="flex gap-2">
                  <input
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    type="email"
                    placeholder="email@example.com"
                    className="flex-1 px-3 py-2 rounded-xl text-sm focus:outline-none"
                    style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--foreground)' }}
                  />
                  <button type="submit" disabled={inviting || !inviteEmail.trim()}
                    className="px-3 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 flex items-center gap-1"
                    style={{ background: 'var(--primary)', color: 'var(--paper)' }}>
                    <UserPlus className="w-3.5 h-3.5" />
                    {inviting ? '...' : 'Invite'}
                  </button>
                </div>
              </form>
            )}
            <div className="h-[env(safe-area-inset-bottom)]" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}