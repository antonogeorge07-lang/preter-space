import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Search, MapPin } from 'lucide-react';
import { LANG_MAP } from '@/lib/translation';
import { useGeoLanguage } from '@/hooks/useGeoLanguage';

const LANGUAGES = Object.entries(LANG_MAP)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

export default function LanguageSettings({ isOpen, onClose, preferredLang, onSelectLang }) {
  const [search, setSearch] = useState('');
  const selected = preferredLang || 'English';
  const { suggestedLang } = useGeoLanguage();
  const showSuggestion = suggestedLang && suggestedLang.name !== selected;

  const filtered = search.trim()
    ? LANGUAGES.filter(l => l.name.toLowerCase().includes(search.toLowerCase()))
    : LANGUAGES;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]"
            style={{ background: 'var(--surface-bg)', border: '1px solid var(--surface-border)' }}
          >
            <div className="flex justify-between items-center p-6" style={{ borderBottom: '1px solid var(--surface-border)' }}>
              <h2 className="text-xl font-bold font-heading" style={{ color: 'var(--foreground)' }}>Language Preferences</h2>
              <button onClick={onClose} className="transition-colors hover:opacity-70" style={{ color: 'var(--muted)' }}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="px-6 pt-4 space-y-3">
              {showSuggestion && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between rounded-2xl px-4 py-3"
                  style={{ background: 'var(--accent-pink)', border: '1px solid var(--card-border)' }}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--primary)' }} />
                    <div>
                      <p className="text-xs" style={{ color: 'var(--primary)' }}>Suggested for {suggestedLang.country}</p>
                      <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{suggestedLang.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { onSelectLang(suggestedLang.name); onClose(); }}
                    className="text-xs text-white px-3 py-1.5 rounded-xl transition-colors hover:opacity-90"
                    style={{ background: 'var(--primary)' }}
                  >
                    Use this
                  </button>
                </motion.div>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted)' }} />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search languages..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--foreground)' }}
                />
              </div>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{filtered.length} languages available</p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-1.5">
              {filtered.map(({ code, name }) => (
                <div
                  key={code}
                  onClick={() => { onSelectLang(name); onClose(); }}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl transition-all cursor-pointer hover:bg-black/5"
                  style={{ background: 'var(--card-bg)' }}
                >
                  <div>
                    <span className="font-medium" style={{ color: 'var(--foreground)' }}>{name}</span>
                    <span className="text-xs ml-2 uppercase" style={{ color: 'var(--muted)' }}>{code}</span>
                  </div>
                  {name === selected && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--primary)' }}>
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}