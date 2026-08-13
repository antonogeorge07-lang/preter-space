import { motion } from 'framer-motion';

export default function TypingIndicator({ name }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex justify-start px-4"
    >
      <div className="flex items-center gap-2 px-4 py-3 rounded-3xl rounded-bl-lg shadow-xl"
        style={{ background: 'var(--bubble-incoming)', border: '1px solid var(--card-border)' }}>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            className="w-2 h-2 rounded-full"
            style={{ background: 'var(--primary)' }}
          />
        ))}
        {name && <span className="text-xs ml-1" style={{ color: 'var(--muted)' }}>{name} is typing</span>}
      </div>
    </motion.div>
  );
}