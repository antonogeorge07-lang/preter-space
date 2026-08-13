import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download } from 'lucide-react';

const DISMISS_KEY = 'pwa_dismiss_until';
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000; // re-show after 3 days

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if snoozed
    const until = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
    if (Date.now() < until) return;
    // Don't show if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Slight delay so it doesn't pop immediately on load
      setTimeout(() => setVisible(true), 8000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setVisible(false);
    setDeferredPrompt(null);
    if (outcome === 'accepted') localStorage.setItem(DISMISS_KEY, Date.now() + 365 * 24 * 60 * 60 * 1000);
  };

  const handleDismiss = () => {
    setVisible(false);
    // Snooze for 3 days instead of permanent dismissal
    localStorage.setItem(DISMISS_KEY, Date.now() + SNOOZE_MS);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 260 }}
          className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto"
        >
          <div className="rounded-2xl shadow-xl flex items-center gap-3 px-4 py-3"
            style={{ background: 'var(--surface-bg)', border: '1px solid var(--surface-border)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--accent-pink)' }}>
              <Download className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold font-heading" style={{ color: 'var(--foreground)' }}>
                Add Preter to Home Screen
              </p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Chat faster, even offline
              </p>
            </div>
            <button onClick={handleInstall}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 transition-all hover:opacity-80"
              style={{ background: 'var(--primary)', color: 'var(--paper)' }}>
              Install
            </button>
            <button onClick={handleDismiss} className="p-1 flex-shrink-0" style={{ color: 'var(--muted)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}