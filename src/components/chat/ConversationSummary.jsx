import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, X, Loader2, ChevronDown } from 'lucide-react';
import { summarizeConversation } from '@/lib/intelligence';

export default function ConversationSummary({ messages, targetLangCode }) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    setOpen(true);
    if (summary) return;
    setLoading(true);
    const s = await summarizeConversation(messages, targetLangCode);
    setSummary(s);
    setLoading(false);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-hover)] border border-[var(--glass-border)] text-muted-foreground hover:text-primary text-xs transition-all"
        title="Summarize conversation"
      >
        <BrainCircuit className="w-4 h-4" />
        <span className="hidden lg:inline">Summary</span>
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="w-full max-w-md glass-strong rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-foreground">Conversation Summary</h3>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-[var(--glass-hover)] text-muted-foreground transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {loading ? (
                <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground/60">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Analyzing conversation...</span>
                </div>
              ) : (
                <p className="text-sm text-foreground/80 leading-relaxed">{summary || 'Nothing to summarize yet.'}</p>
              )}

              <button
                onClick={() => { setSummary(''); handleOpen(); }}
                className="mt-4 text-[11px] text-primary/70 hover:text-primary flex items-center gap-1 transition-colors"
              >
                <ChevronDown className="w-3 h-3" /> Regenerate
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}