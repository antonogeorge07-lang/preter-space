import { motion } from 'framer-motion';
import { MessageSquare, Shield, Zap, Sparkles } from 'lucide-react';

export default function EmptyChat({ onMenuClick }) {
  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 dot-grid overflow-y-auto">
      <div className="text-center w-full max-w-sm">
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="w-20 h-20 mx-auto mb-5 rounded-3xl flex items-center justify-center shadow-lg"
          style={{ background: 'var(--accent-pink)' }}
        >
          <MessageSquare className="w-11 h-11" style={{ color: 'var(--primary)' }} />
        </motion.div>

        <h2 className="text-2xl font-heading font-bold mb-2" style={{ color: 'var(--foreground)' }}>
          Welcome to Preter
        </h2>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--muted)' }}>
          Zero-Knowledge architecture. Built for high-stakes, direct communication.
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 rounded-2xl shadow-sm"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-pink)' }}>
              <Shield className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            </div>
            <span className="text-sm text-left" style={{ color: 'var(--foreground)' }}>Ephemeral local-isolated channels, no cloud logs</span>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-2xl shadow-sm"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-pink)' }}>
              <Zap className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            </div>
            <span className="text-sm text-left" style={{ color: 'var(--foreground)' }}>Proprietary Neural Translation Core, sub-millisecond</span>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-2xl shadow-sm"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-pink)' }}>
              <Sparkles className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            </div>
            <span className="text-sm text-left" style={{ color: 'var(--foreground)' }}>AI-powered context intelligence from your conversations</span>
          </div>
        </div>

        <button
          onClick={onMenuClick}
          className="mt-6 w-full sm:w-auto px-8 py-3.5 rounded-2xl text-white text-sm font-semibold shadow-lg active:scale-95 transition-all lg:hidden"
          style={{ background: 'var(--primary)' }}
        >
          Open conversations
        </button>
      </div>
    </div>
  );
}