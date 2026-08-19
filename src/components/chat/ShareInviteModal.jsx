import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Copy, Check, Loader2 } from 'lucide-react';
import { ensurePersonalInviteUrl } from '@/lib/inviteLink';

export default function ShareInviteModal({ isOpen, onClose, currentUser }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) { setCopied(false); setError(''); return; }
    let cancelled = false;
    setLoading(true);
    ensurePersonalInviteUrl(currentUser)
      .then((link) => { if (!cancelled) setUrl(link); })
      .catch(() => { if (!cancelled) setError('Could not create an invite link. Please try again.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, currentUser?.id]);

  const handleCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('Copy failed. Long-press the link to copy it manually.');
    }
  };

  const handleNativeShare = async () => {
    if (!url || !navigator.share) return;
    try {
      await navigator.share({
        title: 'Join me on Preter',
        text: 'Chat with me in any language, no barriers.',
        url,
      });
    } catch {
      /* user dismissed the share sheet */
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-full sm:max-w-sm box-border rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: 'var(--surface-bg)', border: '1px solid var(--surface-border)' }}
          >
            <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b" style={{ borderColor: 'var(--surface-border)' }}>
              <div className="flex min-w-0 items-center gap-2">
                <Share2 className="w-4 h-4 shrink-0" style={{ color: 'var(--primary)' }} />
                <h2 className="truncate font-semibold text-sm font-heading" style={{ color: 'var(--foreground)' }}>
                  Invite a contact to Preter
                </h2>
              </div>
              <button onClick={onClose} aria-label="Close invite" className="p-1.5 rounded-xl hover:bg-black/5 transition-colors shrink-0" style={{ color: 'var(--muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-4 space-y-3">
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Share this link. Whoever opens it can start chatting with you, each side reading in their own language.
              </p>

              <div className="flex w-full items-center gap-2 rounded-xl px-3 py-2 box-border"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                {loading ? (
                  <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing your link...
                  </span>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-xs" style={{ color: 'var(--foreground)' }}>{url}</span>
                )}
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <div className="flex flex-wrap gap-2">
                <button onClick={handleCopy} disabled={!url || loading}
                  className="flex flex-1 min-w-[8rem] items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
                  style={{ background: 'var(--primary)', color: 'var(--paper)' }}>
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Link copied' : 'Copy link'}
                </button>
                {typeof navigator !== 'undefined' && navigator.share && (
                  <button onClick={handleNativeShare} disabled={!url || loading}
                    className="flex flex-1 min-w-[8rem] items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
                    style={{ background: 'var(--card-bg)', color: 'var(--foreground)', border: '1px solid var(--card-border)' }}>
                    <Share2 className="w-3.5 h-3.5" /> Share
                  </button>
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
