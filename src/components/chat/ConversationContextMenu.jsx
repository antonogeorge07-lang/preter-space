import { motion, AnimatePresence } from 'framer-motion';
import { Pin, PinOff, Archive, ArchiveRestore, Trash2, BellOff, Bell, ShieldAlert } from 'lucide-react';
import { useEffect, useRef } from 'react';

export default function ConversationContextMenu({ isOpen, position, conversation, onPin, onArchive, onDelete, onMute, onBlockReport, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
  }, [isOpen, onClose]);

  const items = [
    {
      icon: conversation?.pinned ? PinOff : Pin,
      label: conversation?.pinned ? 'Unpin' : 'Pin',
      onClick: () => { onPin(conversation); onClose(); },
      color: 'text-primary',
    },
    {
      icon: conversation?.archived ? ArchiveRestore : Archive,
      label: conversation?.archived ? 'Unarchive' : 'Archive',
      onClick: () => { onArchive(conversation); onClose(); },
      color: 'text-muted-foreground',
    },
    {
      icon: conversation?.muted ? Bell : BellOff,
      label: conversation?.muted ? 'Unmute' : 'Mute',
      onClick: () => { onMute && onMute(conversation); onClose(); },
      color: 'text-muted-foreground',
    },
    {
      icon: ShieldAlert,
      label: 'Block / Report',
      onClick: () => { onBlockReport && onBlockReport(conversation); onClose(); },
      color: 'text-orange-500',
    },
    {
      icon: Trash2,
      label: 'Delete',
      onClick: () => { onDelete(conversation); onClose(); },
      color: 'text-destructive',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.12 }}
          style={{ top: position.y, left: position.x }}
          className="fixed z-[100] glass-strong rounded-2xl shadow-2xl py-1.5 min-w-[160px] border border-[var(--glass-border-strong)]"
        >
          {items.map(({ icon: Icon, label, onClick, color }) => (
            <button
              key={label}
              onClick={onClick}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--glass-hover)] transition-colors ${color}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}