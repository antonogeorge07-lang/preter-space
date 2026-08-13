import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Images, Video, Mic, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { format } from 'date-fns';

const TABS = ['All', 'Images', 'Videos', 'Voice'];

function Lightbox({ items, index, onClose }) {
  const [current, setCurrent] = useState(index);
  const [playing, setPlaying] = useState(false);
  const item = items[current];

  const prev = () => setCurrent(i => (i - 1 + items.length) % items.length);
  const next = () => setCurrent(i => (i + 1) % items.length);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white text-xs">
        {current + 1} / {items.length}
      </div>

      {/* Media */}
      <motion.div
        key={current}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-[90vw] max-h-[75vh] flex items-center justify-center"
        onClick={e => e.stopPropagation()}
      >
        {item.type === 'image' && (
          <img src={item.url} alt="" className="max-w-full max-h-[75vh] rounded-2xl object-contain shadow-2xl" />
        )}
        {item.type === 'video' && (
          <video
            src={item.url}
            controls
            className="max-w-full max-h-[75vh] rounded-2xl shadow-2xl"
          />
        )}
        {item.type === 'voice' && (
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 flex flex-col items-center gap-4 min-w-[280px]">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-3xl">🎤</div>
            <p className="text-white text-sm text-center max-w-xs">{item.transcript || 'Voice note'}</p>
            {item.translated_transcript && item.translated_transcript !== item.transcript && (
              <p className="text-white/60 text-xs text-center max-w-xs">{item.translated_transcript}</p>
            )}
            <audio src={item.url} controls className="w-full mt-2" />
          </div>
        )}
      </motion.div>

      {/* Timestamp */}
      {item.date && (
        <p className="absolute bottom-4 text-white/40 text-xs">
          {format(new Date(item.date), 'MMM d, yyyy · h:mm a')}
        </p>
      )}

      {/* Prev / Next */}
      {items.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); prev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); next(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
    </motion.div>
  );
}

export default function MediaGallery({ isOpen, onClose, messages, conversationName }) {
  const [activeTab, setActiveTab] = useState('All');
  const [lightbox, setLightbox] = useState(null); // { items, index }

  // Build typed item lists
  const imageItems = messages
    .filter(m => m.type === 'image' && m.image_url)
    .map(m => ({ type: 'image', url: m.image_url, date: m.created_date, id: m.id }));

  const videoItems = messages
    .filter(m => m.type === 'video' && m.video_url)
    .map(m => ({ type: 'video', url: m.video_url, date: m.created_date, id: m.id }));

  const voiceItems = messages
    .filter(m => m.type === 'voice' && m.audio_url)
    .map(m => ({ type: 'voice', url: m.audio_url, transcript: m.transcript, translated_transcript: m.translated_transcript, date: m.created_date, id: m.id }));

  const allItems = [...imageItems, ...videoItems, ...voiceItems].sort((a, b) => new Date(b.date) - new Date(a.date));

  const tabItems = {
    All: allItems,
    Images: imageItems,
    Videos: videoItems,
    Voice: voiceItems,
  };

  const counts = { All: allItems.length, Images: imageItems.length, Videos: videoItems.length, Voice: voiceItems.length };
  const displayed = tabItems[activeTab];

  const openLightbox = (item) => {
    const idx = displayed.indexOf(item);
    setLightbox({ items: displayed, index: idx });
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={onClose}
            />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[560px] sm:bottom-6 z-50 glass-strong rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col"
              style={{ maxHeight: '80vh' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Images className="w-4 h-4 text-primary" />
                    Media Gallery
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{conversationName}</p>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--glass-hover)] transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1.5 px-4 pb-3 border-b border-[var(--glass-border)]">
                {TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1 ${
                      activeTab === tab
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-[var(--glass-hover)]'
                    }`}
                  >
                    {tab}
                    {counts[tab] > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {counts[tab]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {displayed.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[var(--glass-bg-subtle)] flex items-center justify-center">
                      <Images className="w-6 h-6 text-muted-foreground/30" />
                    </div>
                    <p className="text-sm text-muted-foreground/60">No {activeTab.toLowerCase()} yet</p>
                    <p className="text-xs text-muted-foreground/40 mt-1">Share media in this conversation to see it here</p>
                  </div>
                ) : (
                  <div className={activeTab === 'Voice' ? 'space-y-2' : 'grid grid-cols-3 gap-2'}>
                    {displayed.map((item, i) => {
                      if (item.type === 'voice') {
                        return (
                          <motion.div
                            key={item.id}
                            whileHover={{ scale: 1.01 }}
                            onClick={() => openLightbox(item)}
                            className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--glass-bg-subtle)] border border-[var(--glass-border)] cursor-pointer hover:bg-[var(--glass-hover)] transition-all"
                          >
                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Mic className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground/80 truncate">{item.transcript || 'Voice note'}</p>
                              {item.translated_transcript && item.translated_transcript !== item.transcript && (
                                <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">{item.translated_transcript}</p>
                              )}
                              {item.date && <p className="text-[10px] text-muted-foreground/40 mt-0.5">{format(new Date(item.date), 'MMM d, h:mm a')}</p>}
                            </div>
                            <audio src={item.url} controls className="h-7 w-20 opacity-60 flex-shrink-0" onClick={e => e.stopPropagation()} />
                          </motion.div>
                        );
                      }

                      if (item.type === 'image') {
                        return (
                          <motion.div
                            key={item.id}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => openLightbox(item)}
                            className="aspect-square rounded-2xl overflow-hidden cursor-pointer bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] relative group"
                          >
                            <img src={item.url} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                          </motion.div>
                        );
                      }

                      // video
                      return (
                        <motion.div
                          key={item.id}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => openLightbox(item)}
                          className="aspect-square rounded-2xl overflow-hidden cursor-pointer bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] relative group"
                        >
                          <video src={item.url} className="w-full h-full object-cover" muted />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                            <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                              <Play className="w-4 h-4 text-white ml-0.5" />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <Lightbox items={lightbox.items} index={lightbox.index} onClose={() => setLightbox(null)} />
        )}
      </AnimatePresence>
    </>
  );
}