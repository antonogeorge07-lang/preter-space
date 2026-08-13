import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Globe } from 'lucide-react';

export default function VideoMessageBubble({ message, preferredLang }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const isMe = message.sender === 'me';

  const hasTranslation = message.translated_content && message.content !== message.translated_content;
  const displayCaptions = hasTranslation ? message.translated_content : message.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isMe ? 'justify-end' : 'justify-start'} px-4`}
    >
      <div className="max-w-[85%]">
        <div className="rounded-3xl shadow-2xl overflow-hidden"
          style={{ background: 'var(--bubble-incoming)', border: '1px solid var(--card-border)' }}>
          {/* Video Player */}
          <div
            className="relative aspect-video bg-gradient-to-br from-indigo-400 to-indigo-300 flex items-center justify-center cursor-pointer"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="w-16 h-16 bg-white/90 backdrop-blur-2xl rounded-2xl flex items-center justify-center shadow-xl"
            >
              <Play className="w-8 h-8 text-indigo-700 ml-0.5" />
            </motion.div>

            {/* Auto Captions Overlay */}
            {displayCaptions && (
              <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur-md text-white text-xs px-4 py-2 rounded-2xl line-clamp-2">
                Auto captions: "{displayCaptions}"
              </div>
            )}

            {hasTranslation && (
              <div className="absolute top-4 right-4 px-3 py-1 bg-white/80 backdrop-blur-md text-indigo-700 text-xs rounded-2xl flex items-center gap-1">
                <Globe className="w-3 h-3" /> Translated
              </div>
            )}
          </div>

          <div className="p-4 text-sm" style={{ color: 'var(--muted)' }}>
            Video message · {message.duration || '0:00'}
          </div>
        </div>
      </div>
    </motion.div>
  );
}