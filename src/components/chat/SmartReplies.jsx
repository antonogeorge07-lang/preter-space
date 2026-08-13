import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import { getSmartReplies } from '@/lib/intelligence';

export default function SmartReplies({ messages, targetLangCode, onSelect, visible }) {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || messages.length === 0) { setReplies([]); return; }
    let cancelled = false;
    setLoading(true);
    getSmartReplies(messages, targetLangCode)
      .then(r => { if (!cancelled) setReplies(r); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [visible, messages.length, targetLangCode]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="px-3 pb-2 flex items-center gap-2 flex-wrap"
        >
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
            <Sparkles className="w-3 h-3" />
            <span>Smart replies</span>
          </div>
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary/50" />
          ) : (
            replies.map((r, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onSelect(r)}
                className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all"
              >
                {r}
              </motion.button>
            ))
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}