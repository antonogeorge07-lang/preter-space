import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LiveCaptionOverlay({ captions }) {
  // captions: [{ id, senderName, original, translated }]
  return (
    <div className="absolute bottom-24 inset-x-4 flex flex-col items-center gap-2 pointer-events-none z-20">
      <AnimatePresence initial={false}>
        {captions.slice(-2).map(c => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="max-w-xs w-full rounded-2xl px-4 py-2.5 text-center"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
          >
            <p className="text-[10px] font-semibold mb-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {c.senderName}
            </p>
            <p className="text-sm font-medium leading-snug" style={{ color: '#ffffff' }}>
              {c.translated}
            </p>
            {c.translated !== c.original && (
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>
                {c.original}
              </p>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}