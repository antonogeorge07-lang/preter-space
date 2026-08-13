import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Globe, Languages } from 'lucide-react';

export default function VoiceNoteBubble({ message, preferredLang }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const audioRef = useRef(null);
  const isMe = message.sender === 'me';

  const hasTranslation = message.translated_transcript && message.transcript !== message.translated_transcript;
  const displayTranscript = hasTranslation && !showOriginal
    ? message.translated_transcript
    : message.transcript;

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current || !message.audio_url) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      audioRef.current.onended = () => setIsPlaying(false);
    }
  }, [isPlaying, message.audio_url]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isMe ? 'justify-end' : 'justify-start'} px-4`}
    >
      <div className={`max-w-[78%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="p-4 rounded-3xl rounded-br-lg shadow-xl"
          style={{
            background: isMe ? 'var(--bubble-outgoing)' : 'var(--bubble-incoming)',
            border: '1px solid var(--card-border)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handlePlayPause}
              disabled={!message.audio_url}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300"
              style={{ background: 'var(--accent-pink)', color: 'var(--primary)' }}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </motion.button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-px h-6 mb-1.5">
                {[...Array(16)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: isPlaying
                        ? [4, 14, 8, 18, 6, 12, 10, 16, 4, 14, 8, 18, 6, 12, 10, 16][i]
                        : [3, 10, 6, 14, 4, 8, 7, 12, 3, 10, 6, 14, 4, 8, 7, 12][i]
                    }}
                    transition={{ duration: 0.35, repeat: isPlaying ? Infinity : 0, delay: i * 0.03 }}
                    className="w-[2px] rounded-full"
                    style={{ background: 'var(--primary)' }}
                  />
                ))}
              </div>

              {displayTranscript && (
                <p className="text-xs truncate" style={{ color: 'var(--foreground)' }}>
                  {displayTranscript}
                </p>
              )}

              <div className="flex items-center gap-1 mt-1 opacity-60">
                <Globe className="w-3 h-3" style={{ color: 'var(--muted)' }} />
                <span className="text-[10px] uppercase" style={{ color: 'var(--muted)' }}>
                  {showOriginal ? message.original_language : preferredLang || 'en'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {hasTranslation && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowOriginal(!showOriginal)}
            className="mt-1.5 px-3 py-1 rounded-full text-[10px] transition-all flex items-center gap-1"
            style={{ background: 'var(--glass-bg-subtle)', color: 'var(--primary)', border: '1px solid var(--card-border)' }}
          >
            <Languages className="w-3 h-3" />
            {showOriginal ? 'Show translation' : 'Show original'}
          </motion.button>
        )}
      </div>

      {message.audio_url && <audio ref={audioRef} src={message.audio_url} preload="metadata" />}
    </motion.div>
  );
}