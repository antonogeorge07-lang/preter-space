import { db } from '@/lib/db';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Users, Share2, ChevronRight, Check } from 'lucide-react';

import { LANG_MAP } from '@/lib/translation';
import { generateInviteCode, getInviteUrl } from '@/lib/inviteCode';

const LANG_OPTIONS = Object.entries(LANG_MAP)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

const STEPS = [
  {
    id: 'welcome',
    icon: '🌍',
    title: 'Talk to anyone,\nin any language.',
    subtitle: 'Preter translates every message in real-time so you and your contacts always read in your own language.',
  },
  {
    id: 'language',
    icon: '🗣️',
    title: 'What language\ndo you speak?',
    subtitle: 'Every message you receive will be translated into this language automatically.',
  },
  {
    id: 'invite',
    icon: '👋',
    title: 'Bring a friend.',
    subtitle: 'The magic happens when someone else joins. Share your link and start a real multilingual conversation.',
  },
];

function detectInitialLang(currentUser) {
  if (currentUser?.default_language && LANG_MAP[currentUser.default_language]) return currentUser.default_language;
  const browser = (navigator.language || 'en').split('-')[0];
  return LANG_MAP[browser] ? browser : 'en';
}

export default function OnboardingModal({ isOpen, onComplete, currentUser }) {
  const [step, setStep] = useState(0);
  const [selectedLang, setSelectedLang] = useState(() => detectInitialLang(currentUser));
  const [langSearch, setLangSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [sharing, setSharing] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    if (!currentUser || sharing) return;
    setSharing(true);
    try {
      const code = generateInviteCode();
      await convexChat.createConversation({
        isGroup: false,
        creatorId: currentUser.id,
        participantIds: [currentUser.id],
        title: currentUser.full_name || currentUser.email,
        participantNames: [currentUser.full_name || currentUser.email],
        participantLanguages: { [currentUser.id]: selectedLang },
        preferredLanguage: selectedLang,
        inviteCode: code,
        inviteOpen: true,
        unreadCounts: {},
      });
      const url = getInviteUrl(code);
      const text = `I'm on Preter. It translates every message in real-time so we can chat in our own languages. Join me here: ${url}`;
      if (navigator.share) {
        await navigator.share({ title: 'Join me on Preter', text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
      setInviteUrl(url);
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setSharing(false);
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      setSaving(true);
      try { await db.auth.updateMe({ default_language: selectedLang }); }
      catch {}
      finally { setSaving(false); }
    }
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      onComplete(selectedLang);
    }
  };

  const filteredLangs = LANG_OPTIONS.filter(l =>
    l.name.toLowerCase().includes(langSearch.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="w-full sm:max-w-sm mx-4 mb-4 sm:mb-0 rounded-3xl p-8 flex flex-col gap-6"
        style={{ background: 'var(--surface-bg)', border: '1px solid var(--surface-border)' }}
      >
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <div key={i} className="rounded-full transition-all duration-300"
              style={{
                width: i === step ? 20 : 6,
                height: 6,
                background: i === step ? 'var(--primary)' : 'var(--surface-border)',
              }} />
          ))}
        </div>

        {/* Icon + Text */}
        <div className="text-center">
          <div className="text-5xl mb-4">{STEPS[step].icon}</div>
          <h2 className="text-2xl font-bold leading-tight mb-2 whitespace-pre-line"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--foreground)' }}>
            {STEPS[step].title}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
            {STEPS[step].subtitle}
          </p>
        </div>

        {/* Step-specific content */}
        {step === 1 && (
          <div className="flex flex-col gap-2">
            <input
              autoFocus
              placeholder="Search language..."
              value={langSearch}
              onChange={e => setLangSearch(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--foreground)' }}
            />
            <div className="h-44 overflow-y-auto flex flex-col gap-0.5 pr-1">
              {filteredLangs.map(({ code, name }) => (
                <button key={code} onClick={() => setSelectedLang(code)}
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm text-left transition-colors"
                  style={{
                    background: selectedLang === code ? 'var(--accent-pink)' : 'transparent',
                    color: 'var(--foreground)',
                  }}>
                  {name}
                  {selectedLang === code && <Check className="w-4 h-4" style={{ color: 'var(--primary)' }} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3">
            {inviteUrl && (
              <div className="px-4 py-3 rounded-2xl text-xs break-all select-all"
                style={{ background: 'var(--glass-bg-subtle)', border: '1px solid var(--card-border)', color: 'var(--primary)', fontFamily: 'monospace' }}>
                {inviteUrl}
              </div>
            )}
            <div className="flex gap-2">
              {inviteUrl && (
                <button onClick={handleCopy}
                  className="flex-1 py-3 rounded-2xl text-sm font-medium transition-all"
                  style={{ background: 'var(--accent-pink)', color: 'var(--primary)', border: '1px solid var(--card-border)' }}>
                  {copied ? '✓ Copied!' : 'Copy link'}
                </button>
              )}
              <button onClick={handleShare} disabled={sharing}
                className="flex-1 py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                style={{ background: 'var(--primary)', color: 'var(--paper)' }}>
                <Share2 className="w-4 h-4" /> {sharing ? 'Sharing...' : 'Share'}
              </button>
            </div>
          </div>
        )}

        {/* CTA */}
        <button onClick={handleNext} disabled={saving}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
          style={{ background: 'var(--primary)', color: 'var(--paper)', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving...' : step === STEPS.length - 1 ? "Let's go →" : (
            <>{step === 0 ? 'Get started' : 'Continue'} <ChevronRight className="w-4 h-4" /></>
          )}
        </button>

        {step === STEPS.length - 1 && (
          <button onClick={() => onComplete(selectedLang)}
            className="text-center text-xs transition-colors"
            style={{ color: 'var(--muted)' }}>
            Skip for now
          </button>
        )}
      </motion.div>
    </div>
  );
}