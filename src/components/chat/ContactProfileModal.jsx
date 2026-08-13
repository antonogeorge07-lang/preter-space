import { db } from '@/lib/db';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';

export default function ContactProfileModal({ userId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    db.entities.User.filter({ id: userId }, '-created_date', 1)
      .then(results => setProfile(results[0] || null))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [userId]);

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <AnimatePresence>
      {userId && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: 'var(--surface-bg)', border: '1px solid var(--surface-border)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--surface-border)' }}>
              <h2 className="font-semibold text-base font-heading" style={{ color: 'var(--foreground)' }}>
                Contact Profile
              </h2>
              <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-black/5 transition-colors" style={{ color: 'var(--muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading profile…</p>
                </div>
              ) : profile ? (
                <div className="flex flex-col items-center gap-4">
                  {/* Avatar */}
                  <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md flex-shrink-0 flex items-center justify-center text-2xl font-bold"
                    style={{ background: 'linear-gradient(135deg, #4F46E5, #6366F1)', color: '#FFFFFF' }}>
                    {profile.avatar_url
                      ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      : initials}
                  </div>

                  {/* Name & email */}
                  <div className="text-center">
                    <h3 className="text-lg font-semibold font-heading" style={{ color: 'var(--foreground)' }}>
                      {profile.full_name || 'Anonymous'}
                    </h3>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{profile.email}</p>
                  </div>

                  {/* Bio / status */}
                  {profile.bio && (
                    <div className="w-full px-4 py-3 rounded-2xl text-sm text-center"
                      style={{ background: 'var(--glass-bg-subtle)', color: 'var(--foreground)', border: '1px solid var(--glass-border)' }}>
                      {profile.bio}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-sm py-6" style={{ color: 'var(--muted)' }}>Could not load this profile.</p>
              )}

              <button onClick={onClose}
                className="mt-6 w-full py-3 rounded-2xl text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: 'var(--primary)', color: 'var(--paper)' }}>
                Back to Chat
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}