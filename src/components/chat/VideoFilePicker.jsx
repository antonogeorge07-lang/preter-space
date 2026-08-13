import { db } from '@/lib/db';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Video, Loader2 } from 'lucide-react';

export default function VideoFilePicker({ onClose, onVideoReady }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      onVideoReady(file_url);
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong rounded-3xl p-8 flex flex-col items-center gap-5 w-72 shadow-2xl"
      >
        <button onClick={onClose} className="self-end p-1.5 rounded-xl hover:bg-white/20 transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-pink)' }}>
          <Video className="w-8 h-8" style={{ color: 'var(--primary)' }} />
        </div>

        <p className="text-sm text-foreground/70 text-center">Choose a video from your device to send</p>

        <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full py-3 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: 'var(--primary)', color: 'var(--paper)' }}
        >
          {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : 'Select Video'}
        </button>
      </motion.div>
    </motion.div>
  );
}