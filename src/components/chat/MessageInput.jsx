import { db } from '@/lib/db';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Video, Image as ImageIcon, Loader2, X, Reply, SendHorizonal, Paperclip, Timer } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const DISAPPEAR_OPTIONS = [
  { label: 'Off', value: null },
  { label: '10s', value: 10 },
  { label: '1m', value: 60 },
  { label: '1h', value: 3600 },
];

export default function MessageInput({ onSend, onTyping, onStartRecording, onStartVideo, onImageSend, onFileSend, isProcessing, replyTo, onCancelReply }) {
  const [text, setText] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [disappearSecs, setDisappearSecs] = useState(null);
  const [showDisappearPicker, setShowDisappearPicker] = useState(false);
  const fileInputRef = useRef(null);
  const genericFileInputRef = useRef(null);

  const handleSend = () => {
    if (!text.trim() || isProcessing) return;
    const expiresAt = disappearSecs
      ? new Date(Date.now() + disappearSecs * 1000).toISOString()
      : undefined;
    onSend(text.trim(), expiresAt);
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    if (onTyping) onTyping();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Please choose an image under 10 MB.', variant: 'destructive' });
      e.target.value = '';
      return;
    }
    setUploadingImage(true);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      if (onImageSend) onImageSend(file_url);
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleGenericFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { toast({ title: 'File too large', description: 'Please choose a file under 25 MB.', variant: 'destructive' }); e.target.value = ''; return; }
    setUploadingFile(true);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      if (onFileSend) onFileSend({ file_url, file_name: file.name, file_size: file.size });
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const busy = isProcessing || uploadingImage || uploadingFile;

  return (
    <div className="composer-bar w-full max-w-full box-border px-3 sm:px-4 pt-2 flex-shrink-0 overflow-x-hidden" style={{ borderTop: '1px solid var(--surface-border)', background: 'var(--surface-bg)' }}>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <input ref={genericFileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.csv" className="hidden" onChange={handleGenericFileChange} />

      {/* Disappearing message picker */}
      <AnimatePresence>
        {showDisappearPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 mb-2 flex-wrap"
          >
            <span className="text-[10px] text-muted-foreground">Auto-delete:</span>
            {DISAPPEAR_OPTIONS.map(opt => (
              <button key={String(opt.value)} onClick={() => { setDisappearSecs(opt.value); setShowDisappearPicker(false); }}
                className="px-2.5 py-1 rounded-full text-xs font-medium transition-all border"
                style={disappearSecs === opt.value
                  ? { background: 'var(--primary)', color: 'var(--paper)', borderColor: 'var(--primary)' }
                  : { background: 'var(--card-bg)', color: 'var(--muted)', borderColor: 'var(--surface-border)' }
                }>
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl border-l-2"
            style={{ background: 'var(--glass-bg-subtle)', borderColor: 'var(--primary)' }}
          >
            <Reply className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-semibold text-foreground/60 block">{replyTo.sender_name}</span>
              <span className="text-xs text-muted-foreground truncate block">{replyTo.content}</span>
            </div>
            <button onClick={onCancelReply} className="p-1 rounded-full hover:bg-black/5 text-muted-foreground flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2">
        {/* Attachment buttons */}
        <button onClick={() => fileInputRef.current?.click()} disabled={busy}
          className="p-2 rounded-full transition-colors hover:bg-black/6 disabled:opacity-30 flex-shrink-0"
          style={{ color: 'var(--muted)' }} title="Send image">
          {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
        </button>
        <button onClick={() => genericFileInputRef.current?.click()} disabled={busy}
          className="p-2 rounded-full transition-colors hover:bg-black/6 disabled:opacity-30 flex-shrink-0"
          style={{ color: 'var(--muted)' }} title="Send file">
          {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
        </button>
        <button onClick={() => setShowDisappearPicker(v => !v)} disabled={busy}
          className="p-2 rounded-full transition-colors hover:bg-black/6 disabled:opacity-30 flex-shrink-0"
          style={{ color: disappearSecs ? 'var(--primary)' : 'var(--muted)' }} title="Disappearing message">
          <Timer className="w-4 h-4" />
        </button>
        <button onClick={onStartRecording} disabled={busy}
          className="p-2 rounded-full transition-colors hover:bg-black/6 disabled:opacity-30 flex-shrink-0"
          style={{ color: 'var(--muted)' }} title="Voice note">
          <Mic className="w-4 h-4" />
        </button>

        {/* Text input pill */}
        <div className="flex-1 flex items-center rounded-full px-4 py-2.5 border"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
          <input
            type="text"
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={replyTo ? `Replying to ${replyTo.sender_name}...` : 'Type a message...'}
            disabled={busy}
            className="flex-1 bg-transparent text-sm focus:outline-none disabled:opacity-40"
            style={{ color: 'var(--foreground)', fontFamily: 'var(--font-body)' }}
          />
        </div>

        {/* Send / video button */}
        {text.trim() ? (
          <motion.button whileTap={{ scale: 0.92 }} onClick={handleSend} disabled={busy}
            className="p-2.5 rounded-full flex-shrink-0 transition-colors disabled:opacity-30"
            style={{ background: 'var(--primary)', color: 'var(--paper)' }}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizonal className="w-4 h-4" />}
          </motion.button>
        ) : (
          <button onClick={onStartVideo} disabled={busy}
            className="p-2 rounded-full transition-colors hover:bg-black/6 disabled:opacity-30 flex-shrink-0"
            style={{ color: 'var(--muted)' }} title="Video">
            <Video className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}