import { db } from '@/lib/db';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, Ban } from 'lucide-react';

const REPORT_REASONS = [
  'Spam or unwanted messages',
  'Harassment or bullying',
  'Hate speech',
  'Inappropriate content',
  'Impersonation',
  'Other',
];

export default function BlockReportModal({ isOpen, conversation, onClose, onBlock, onReport, currentUser }) {
  const [mode, setMode] = useState('choose'); // choose | report
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [done, setDone] = useState(false);

  const reset = () => { setMode('choose'); setReason(''); setDetails(''); setDone(false); };
  const handleClose = () => { reset(); onClose(); };

  const handleBlock = async () => {
    if (currentUser) {
      const blockedIds = Array.isArray(currentUser.blocked_user_ids) ? currentUser.blocked_user_ids : [];
      const targetIds = (conversation?.participant_ids || []).filter(id => id !== currentUser.id);
      const merged = [...new Set([...blockedIds, ...targetIds])];
      await db.auth.updateMe({ blocked_user_ids: merged });
    }
    if (onBlock) await onBlock(conversation);
    setDone(true);
  };

  const handleReport = async () => {
    if (!reason) return;
    if (onReport) await onReport(conversation, reason, details);
    setDone(true);
  };

  const name = conversation?.participant_name || 'this contact';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: 'var(--surface-bg)', border: '1px solid var(--surface-border)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--surface-border)' }}>
              <h2 className="font-semibold text-base font-heading" style={{ color: 'var(--foreground)' }}>
                {done ? 'Done' : mode === 'report' ? 'Report conversation' : `Block or report`}
              </h2>
              <button onClick={handleClose} className="p-1.5 rounded-xl hover:bg-black/5 transition-colors" style={{ color: 'var(--muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              {done ? (
                <div className="text-center py-4">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center text-3xl" style={{ background: 'var(--accent-pink)' }}>✅</div>
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Action submitted</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Our team reviews all reports within 24 hours.</p>
                  <button onClick={handleClose} className="mt-5 w-full py-3 rounded-2xl text-sm font-semibold" style={{ background: 'var(--primary)', color: 'var(--paper)' }}>
                    Close
                  </button>
                </div>
              ) : mode === 'choose' ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    What would you like to do with <span className="font-medium" style={{ color: 'var(--foreground)' }}>{name}</span>?
                  </p>
                  <button onClick={() => setMode('report')}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all hover:bg-black/5"
                    style={{ borderColor: 'var(--card-border)' }}>
                    <ShieldAlert className="w-5 h-5 flex-shrink-0" style={{ color: '#e88c30' }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Report</p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>Flag harmful or abusive content</p>
                    </div>
                  </button>
                  <button onClick={handleBlock}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all hover:bg-red-50"
                    style={{ borderColor: 'rgba(220,100,80,0.30)' }}>
                    <Ban className="w-5 h-5 flex-shrink-0 text-red-500" />
                    <div>
                      <p className="text-sm font-medium text-red-600">Block {name}</p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>They won't be able to message you</p>
                    </div>
                  </button>
                  <button onClick={handleClose} className="text-xs text-center mt-1" style={{ color: 'var(--muted)' }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Select a reason</p>
                  <div className="flex flex-col gap-1.5">
                    {REPORT_REASONS.map(r => (
                      <button key={r} onClick={() => setReason(r)}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left text-sm transition-all"
                        style={reason === r
                          ? { background: 'var(--accent-pink)', borderColor: 'var(--primary)', color: 'var(--foreground)' }
                          : { borderColor: 'var(--surface-border)', color: 'var(--foreground)' }}>
                        <span className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                          style={{ borderColor: reason === r ? 'var(--primary)' : 'var(--muted)' }}>
                          {reason === r && <span className="w-1.5 h-1.5 rounded-full block" style={{ background: 'var(--primary)' }} />}
                        </span>
                        {r}
                      </button>
                    ))}
                  </div>
                  <textarea value={details} onChange={e => setDetails(e.target.value)}
                    placeholder="Additional details (optional)"
                    rows={2}
                    className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none resize-none border"
                    style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
                  />
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => setMode('choose')} className="flex-1 py-2.5 rounded-2xl text-sm border" style={{ borderColor: 'var(--surface-border)', color: 'var(--muted)' }}>
                      Back
                    </button>
                    <button onClick={handleReport} disabled={!reason}
                      className="flex-1 py-2.5 rounded-2xl text-sm font-semibold disabled:opacity-40 transition-all"
                      style={{ background: 'var(--primary)', color: 'var(--paper)' }}>
                      Submit Report
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}