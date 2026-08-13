import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { detectTone } from '@/lib/intelligence';

// Cache tones in memory to avoid re-calling per render
const toneCache = new Map();

export default function ToneIndicator({ message }) {
  const [tone, setTone] = useState(null);
  const text = message.translated_content || message.content;

  useEffect(() => {
    if (!text || text.length < 4) return;
    if (toneCache.has(message.id)) { setTone(toneCache.get(message.id)); return; }

    detectTone(text).then(result => {
      if (result) {
        toneCache.set(message.id, result);
        setTone(result);
      }
    });
  }, [message.id, text]);

  return (
    <AnimatePresence>
      {tone && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          title={tone.tone}
          className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/60 ml-1"
        >
          <span>{tone.emoji}</span>
        </motion.span>
      )}
    </AnimatePresence>
  );
}