import { saveUserLanguage } from '@/lib/saveUserLanguage';
import { db } from '@/lib/db';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Shield, Sparkles, Eye, EyeOff, Share2, MessageSquare,
  Languages, Mic, Phone, Video, FileText, Bell, Users, Zap,
  Clock, Lock, CheckCircle, ArrowRight, ChevronDown, Search
} from 'lucide-react';
import GoogleIcon from '@/components/GoogleIcon';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'fr', label: 'French', native: 'Français' },
  { code: 'de', label: 'German', native: 'Deutsch' },
  { code: 'ja', label: 'Japanese', native: '日本語' },
  { code: 'zh', label: 'Chinese', native: '中文' },
  { code: 'ar', label: 'Arabic', native: 'العربية' },
  { code: 'pt', label: 'Portuguese', native: 'Português' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'ko', label: 'Korean', native: '한국어' },
  { code: 'it', label: 'Italian', native: 'Italiano' },
  { code: 'ru', label: 'Russian', native: 'Русский' },
];

function detectLang() {
  const nav = navigator.language || 'en';
  const code = nav.split('-')[0];
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning.';
  if (h < 17) return 'Good afternoon.';
  return 'Good evening.';
}

// ── Feature data ────────────────────────────────────────────────────────────

const LIVE_NOW = [
  { icon: <Languages className="w-4 h-4" />, label: 'Real-time message translation', detail: '50+ languages, every text auto-translated on send' },
  { icon: <Video className="w-4 h-4" />, label: 'Video & audio calls', detail: 'WebRTC peer-to-peer with live caption overlay' },
  { icon: <FileText className="w-4 h-4" />, label: 'File & image sharing', detail: 'Photos, PDFs, documents with captions' },
  { icon: <Users className="w-4 h-4" />, label: 'Group chats', detail: 'Multi-person threads, each member reads in their language' },
  { icon: <Bell className="w-4 h-4" />, label: 'Local notifications', detail: 'In-browser alerts while a Preter tab is open' },
  { icon: <Mic className="w-4 h-4" />, label: 'Voice notes', detail: 'Record and send audio messages with a live waveform' },
  { icon: <Sparkles className="w-4 h-4" />, label: 'AI smart summaries', detail: 'Catch up on long conversations with a one-paragraph digest' },
  { icon: <Zap className="w-4 h-4" />, label: 'Reactions & read receipts', detail: 'Emoji reactions and live presence indicators' },
  { icon: <Search className="w-4 h-4" />, label: 'Contact discovery', detail: 'Find existing Preter users by name' },
  { icon: <Clock className="w-4 h-4" />, label: 'Disappearing message timers', detail: 'Per-message countdown before it fades from the chat' },
  { icon: <Globe className="w-4 h-4" />, label: 'PWA, no install needed', detail: 'Works on any browser. Add to home screen for an app-like experience.' },
];

const COMING_SOON = [
  { label: 'Voice note translation', when: 'Q3 2026', detail: 'Transcribed and translated before the other person hears it.' },
  { label: 'Translated audio calls', when: 'Q3 2026', detail: 'Speak your language and they hear theirs, in real-time.' },
  { label: 'End-to-end encryption (E2EE)', when: 'Q3 2026', detail: 'Signal-grade encryption. Keys never leave your device.' },
  { label: 'Background push notifications', when: 'Q4 2026', detail: 'Alerts even when the tab is closed.' },
  { label: 'Message threads', when: 'Q4 2026', detail: 'Reply chains inside any message.' },
  { label: 'Native iOS & Android apps', when: 'Q4 2026', detail: 'Wrapped PWA for App Store & Play Store distribution.' },
  { label: 'Phone number contact discovery', when: 'Q4 2026', detail: 'Find existing Preter users by phone number.' },
  { label: 'Server-side disappearing messages', when: 'Early 2027', detail: 'Auto-clear conversation mode with server-enforced TTL.' },
  { label: 'Workspace / team plans', when: 'Early 2027', detail: 'Shared inboxes, admin dashboards, SSO.' },
];

// ── Chat mockup ──────────────────────────────────────────────────────────────

const PREVIEW_MESSAGES = [
  { id: 1, me: false, name: 'Maria', text: 'Hola! ¿Cómo estás?', translated: 'Hey! How are you?', lang: '🇪🇸 ES' },
  { id: 2, me: true, name: 'You', text: "I'm great! Ready for the meeting?", translated: '¡Estoy bien! ¿Lista para la reunión?', lang: '🇬🇧 EN' },
  { id: 3, me: false, name: 'Yuki', text: 'よろしくお願いします', translated: 'Looking forward to it!', lang: '🇯🇵 JA' },
];

function ChatMockup() {
  return (
    <div className="w-full max-w-sm mx-auto rounded-2xl overflow-hidden shadow-2xl"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-bg)' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm" style={{ background: 'var(--accent-pink)' }}>🌍</div>
        <div>
          <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Global Team</p>
          <p className="text-[10px]" style={{ color: 'var(--muted)' }}>3 languages · live translation on</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px]" style={{ color: 'var(--muted)' }}>live</span>
        </div>
      </div>
      <div className="px-3 py-4 flex flex-col gap-4">
        {PREVIEW_MESSAGES.map((msg, i) => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.15 }}
          className={`flex flex-col gap-1 ${msg.me ? 'items-end' : 'items-start'}`}>
            <span className="text-[9px] font-medium px-1" style={{ color: 'var(--muted)' }}>{msg.name} · {msg.lang}</span>
            <div className="max-w-[80%] rounded-xl px-3 py-2"
              style={{ background: msg.me ? 'var(--bubble-outgoing)' : 'var(--bubble-incoming)', border: '1px solid var(--card-border)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-body)' }}>
                {msg.me ? msg.text : msg.translated}
              </p>
              <p className="text-[9px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                <Languages className="w-2.5 h-2.5" />
                {msg.me ? msg.translated : msg.text}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <Mic className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--muted)' }} />
          <span className="text-xs flex-1" style={{ color: 'var(--muted)' }}>Message in any language...</span>
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
            <span className="text-[10px]" style={{ color: 'var(--paper)' }}>→</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Roadmap section ──────────────────────────────────────────────────────────

function RoadmapSection() {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-16">
      {/* What we do now */}
      <div className="mb-12">
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>Live today</p>
        <h2 className="text-2xl font-semibold mb-6 font-heading" style={{ color: 'var(--foreground)' }}>
          Everything that works right now.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LIVE_NOW.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 px-4 py-3 rounded-2xl"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <div className="mt-0.5 p-1.5 rounded-lg flex-shrink-0" style={{ background: 'var(--accent-pink)', color: 'var(--primary)' }}>
                {f.icon}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{f.label}</p>
                <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--muted)' }}>{f.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Coming soon */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>On the roadmap</p>
        <h2 className="text-2xl font-semibold mb-2 font-heading" style={{ color: 'var(--foreground)' }}>
          What's coming, and when.
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
          We ship fast. These are our committed quarters, not wishes.
        </p>
        <div className="flex flex-col gap-3">
          {COMING_SOON.slice(0, open ? COMING_SOON.length : 4).map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}
              className="flex items-center gap-4 px-4 py-3 rounded-2xl"
              style={{ background: 'var(--surface-bg)', border: '1px solid var(--surface-border)' }}>
              <div className="flex-shrink-0 px-2.5 py-1 rounded-xl text-[10px] font-semibold"
                style={{ background: 'var(--accent-pink)', color: 'var(--primary)' }}>
                {f.when}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{f.label}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{f.detail}</p>
              </div>
              <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--muted)' }} />
            </motion.div>
          ))}
        </div>
        {!open && (
          <button onClick={() => setOpen(true)}
            className="mt-4 w-full py-2.5 rounded-2xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all hover:opacity-80"
            style={{ background: 'var(--card-bg)', color: 'var(--muted)' }}>
            <ChevronDown className="w-3.5 h-3.5" /> Show all {COMING_SOON.length} upcoming features
          </button>
        )}
      </div>
    </div>
  );
}

// ── Language Alignment Engine section ───────────────────────────────────────

function LanguageAlignmentSection() {
  const highlights = [
    {
      icon: <Languages className="w-4 h-4" />,
      title: 'Dynamic Language Handshake',
      detail: 'Automatically detects and matches your contact\'s preferred language for every conversation thread.',
    },
    {
      icon: <Eye className="w-4 h-4" />,
      title: 'Original Text Peek',
      detail: 'Flip between the translated message and the original source text with a single tap.',
    },
    {
      icon: <Sparkles className="w-4 h-4" />,
      title: 'AI-Powered Translation',
      detail: 'Server-side translation fills in missing languages so messages arrive ready to read.',
    },
  ];

  return (
    <section className="relative z-10 w-full px-6 py-16 sm:py-20 lg:py-24" style={{ borderTop: '1px solid var(--surface-border)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Section label */}
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-4 text-center" style={{ color: 'var(--muted)' }}>
          Language Alignment Engine
        </p>

        {/* Headline */}
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-center mb-4 font-heading" style={{ color: 'var(--foreground)' }}>
          Talk in Your Language. They Read in Theirs.
        </h2>

        {/* Subheadline */}
        <p className="text-sm sm:text-base leading-relaxed text-center max-w-2xl mx-auto mb-12" style={{ color: 'var(--muted)' }}>
          Zero copy-pasting, zero app switching. Type in your native language, and Preter AI interprets&nbsp;and delivers it in your recipient's chosen language in real time.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Feature highlights */}
          <div className="flex flex-col gap-4 order-2 lg:order-1">
            {highlights.map((h, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-4 p-4 sm:p-5 rounded-2xl"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
              >
                <div className="mt-0.5 p-2 rounded-xl flex-shrink-0" style={{ background: 'var(--accent-pink)', color: 'var(--primary)' }}>
                  {h.icon}
                </div>
                <div>
                  <p className="text-sm sm:text-base font-semibold mb-1" style={{ color: 'var(--foreground)' }}>{h.title}</p>
                  <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{h.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Visual card preview */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="order-1 lg:order-2 w-full max-w-md mx-auto lg:max-w-none"
          >
            <div className="rounded-3xl p-5 sm:p-6 shadow-xl"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-pink)' }}>
                    <Globe className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Product Launch</p>
                    <p className="text-[10px]" style={{ color: 'var(--muted)' }}>English · Spanish</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium"
                  style={{ background: 'var(--surface-bg)', color: 'var(--muted)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Live
                </div>
              </div>

              {/* Chat bubbles */}
              <div className="flex flex-col gap-4 mb-5">
                {/* Sender bubble - left */}
                <div className="flex flex-col items-start gap-1">
                  <span className="text-[10px] font-medium" style={{ color: 'var(--muted)' }}>You · 🇬🇧 EN</span>
                  <div className="max-w-[85%] sm:max-w-[80%] rounded-2xl rounded-tl-md px-4 py-3"
                    style={{ background: 'var(--bubble-outgoing)', border: '1px solid var(--card-border)' }}>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
                      Hey! Let&apos;s sync on the release today.
                    </p>
                  </div>
                </div>

                {/* Recipient bubble - right */}
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-medium" style={{ color: 'var(--muted)' }}>María · 🇪🇸 ES</span>
                  <div className="max-w-[85%] sm:max-w-[80%] rounded-2xl rounded-tr-md px-4 py-3"
                    style={{ background: 'var(--bubble-incoming)', border: '1px solid var(--card-border)' }}>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
                      ¡Hola! Sincronicemos sobre el lanzamiento hoy.
                    </p>
                    <p className="text-[10px] mt-1.5 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                      <Languages className="w-3 h-3" />
                      Hey! Let&apos;s sync on the release today.
                    </p>
                  </div>
                </div>
              </div>

              {/* Latency badge */}
              <div className="flex items-center justify-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-medium"
                  style={{ background: 'var(--accent-pink)', color: 'var(--primary)' }}>
                  <Zap className="w-3 h-3" />
                  Live Alignment Active · 100ms Latency
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ── Auth card ────────────────────────────────────────────────────────────────


function AuthCard({ children }) {
  return (
    <div className="w-full rounded-3xl p-8 shadow-xl"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      {children}
    </div>
  );
}

const inputStyle = {
  background: 'var(--card-bg)',
  borderColor: 'var(--card-border)',
};

// ── Main page ────────────────────────────────────────────────────────────────

export default function Landing() {
  const [mode, setMode] = useState('signin');
  const [step, setStep] = useState('entry');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [lang, setLang] = useState(() => detectLang());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sharedInvite, setSharedInvite] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);

  const switchMode = (m) => { setMode(m); setStep('entry'); setError(''); setOtp(''); setPassword(''); };

  const handleGoogleSignIn = async () => {
    setLoading(true); setError('');
    try {
      await db.auth.loginWithProvider('google', '/');
    } catch {
      setError('Google sign-in could not start. Please try again or use your email and password.');
      setLoading(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!contact.trim() || !password) return;
    setLoading(true); setError('');
    try {
      await db.auth.loginViaEmailPassword(contact.trim(), password);
      window.location.replace('/');
    } catch (err) {
      const msg = (err?.message || '').toLowerCase();
      setError(msg.includes('password') || msg.includes('invalid') || msg.includes('credential')
        ? 'Incorrect email or password.' : 'Sign in failed. Please try again.');
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!contact.trim()) return;
    setLoading(true); setError('');
    const generatedPassword = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(36)).join('').slice(0, 16) + 'A1!';
    setPassword(generatedPassword);
    try {
      await db.auth.register({ email: contact.trim(), password: generatedPassword });
      setStep('otp');
    } catch (err) {
      const msg = (err?.message || '').toLowerCase();
      setError(msg.includes('already') || msg.includes('exist') || msg.includes('registered')
        ? 'An account with this email already exists. Please sign in instead.'
        : 'Could not send access code. Please try again.');
    } finally { setLoading(false); }
  };

  // The confirmation email contains a verification link (not a numeric code).
  // Once the user taps it, a session appears - pick it up and continue onboarding.
  useEffect(() => {
    if (!(mode === 'register' && step === 'otp')) return;
    let cancelled = false;
    const tick = async () => {
      try {
        if (await db.auth.isAuthenticated()) {
          if (!cancelled) setStep('language');
        }
      } catch {}
    };
    const id = setInterval(tick, 2500);
    tick();
    return () => { cancelled = true; clearInterval(id); };
  }, [mode, step]);

  const handleResendLink = async () => {
    setError('');
    setLoading(true);
    try {
      await db.auth.resendOtp(contact.trim());
      setError('');
    } catch {
      setError('Could not resend the email. Please try again.');
    } finally { setLoading(false); }
  };


  const handleLanguageDone = async () => {
    setLoading(true);
    await saveUserLanguage(lang.code);
    setStep('done'); setLoading(false);
  };

  const handleShare = () => {
    const url = window.location.origin;
    const text = `I'm on Preter. It translates every message in real-time so we can chat in our own languages. Join me here:`;
    if (navigator.share) {
      navigator.share({ title: 'Join me on Preter', text, url }).then(() => setSharedInvite(true)).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${text} ${url}`);
      setSharedInvite(true);
    }
  };

  const enterApp = () => { try { localStorage.setItem('vl_onboarded', '1'); } catch {} window.location.href = '/'; };
  const showHero = mode === 'signin' || (mode === 'register' && step === 'entry');

  return (
    <div className="min-h-[100dvh] w-screen flex flex-col overflow-x-hidden" style={{ background: 'var(--background)' }}>
      <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />

      {/* ── Hero + Auth (split layout) ─────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:min-h-screen">

        {/* LEFT: Hero */}
        <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:py-0 lg:pl-16 lg:pr-8 lg:max-w-[52%]">
          {/* Logo */}
          <div className="mb-8 lg:mb-12">
            <span className="text-lg font-semibold tracking-tight font-heading" style={{ color: 'var(--primary)' }}>
              Preter
            </span>
          </div>

          <AnimatePresence mode="wait">
            {showHero ? (
              <motion.div key="hero" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }}>
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
                  Multilingual Messenger · Live Now
                </p>
                <h1 className="text-4xl sm:text-5xl xl:text-6xl font-semibold leading-[1.1] mb-5 font-heading"
                  style={{ color: 'var(--foreground)' }}>
                  Preter<br />
                  Communicate in Your<br />
                  language.<br />
                  <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>AI interprets it for you.</span>
                </h1>
                <p className="text-sm leading-relaxed mb-6 max-w-sm whitespace-pre-line" style={{ color: 'var(--muted)' }}>
                  You write in Spanish. They read in Japanese.&nbsp;{"\n"}
                  No more copy-paste, no more switching apps.&nbsp;{"\n"}
                  Voice notes, images, and calls, all interpreted in one thread.
                </p>

                <div className="flex flex-wrap gap-3 mb-6 text-xs" style={{ color: 'var(--muted)' }}>
                  <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> 50+ languages</span>
                  <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Zero-knowledge</span>
                  <span className="flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> No app install</span>
                  <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Free to start for first 100</span>
                </div>

                {/* See what's included CTA */}
                <button onClick={() => setShowRoadmap(v => !v)}
                  className="flex items-center gap-1.5 text-xs mb-8 underline underline-offset-4 transition-opacity hover:opacity-70"
                  style={{ color: 'var(--muted)' }}>
                  {showRoadmap ? 'Hide' : 'See all features & roadmap'}
                  <ArrowRight className="w-3 h-3" />
                </button>

                <div className="hidden sm:block">
                  <ChatMockup />
                </div>
              </motion.div>
            ) : (
              <motion.div key="auth-context" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="hidden lg:block"><ChatMockup /></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT: Auth */}
        <div className="relative z-10 flex items-center justify-center px-6 py-8 lg:py-0 lg:w-[420px] lg:flex-shrink-0 lg:pr-12">
          <div className="w-full max-w-sm">
            <AnimatePresence mode="wait">

              {/* SIGN IN */}
              {mode === 'signin' && (
                <motion.div key="signin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                  <AuthCard>
                    <div className="mb-6">
                      <h2 className="text-2xl font-semibold mb-1 font-heading" style={{ color: 'var(--foreground)' }}>Welcome back.</h2>
                      <p className="text-sm" style={{ color: 'var(--muted)' }}>Sign in to continue your conversations.</p>
                    </div>
                    <form onSubmit={handleSignIn} className="flex flex-col gap-3">
                      <div className="rounded-2xl overflow-hidden border" style={inputStyle}>
                        <input type="email" value={contact} onChange={(e) => setContact(e.target.value)}
                          placeholder="Email address" autoFocus autoComplete="email"
                          className="w-full px-4 py-3.5 bg-transparent text-sm focus:outline-none" style={{ color: 'var(--foreground)' }} />
                      </div>
                      <div className="rounded-2xl overflow-hidden border relative" style={inputStyle}>
                        <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                          placeholder="Password" autoComplete="current-password"
                          className="w-full px-4 py-3.5 pr-12 bg-transparent text-sm focus:outline-none" style={{ color: 'var(--foreground)' }} />
                        <button type="button" onClick={() => setShowPassword(v => !v)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}>
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
                      <motion.button type="submit" disabled={loading || !contact.trim() || !password} whileTap={{ scale: 0.97 }}
                        className="w-full py-3.5 rounded-2xl text-sm font-semibold mt-1 transition-all disabled:opacity-50"
                        style={{ background: 'var(--primary)', color: 'var(--paper)' }}>
                        {loading ? 'Signing in...' : 'Sign in →'}
                      </motion.button>
                    </form>
                    <p className="text-center text-xs mt-3" style={{ color: 'var(--muted)' }}>
                      <a href="/forgot-password" className="underline underline-offset-2 hover:opacity-80" style={{ color: 'var(--muted)' }}>
                        Forgot password?
                      </a>
                    </p>
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px" style={{ background: 'var(--surface-border)' }} />
                      <span className="text-[11px]" style={{ color: 'var(--muted)' }}>or</span>
                      <div className="flex-1 h-px" style={{ background: 'var(--surface-border)' }} />
                    </div>
                    <motion.button type="button" onClick={handleGoogleSignIn} whileTap={{ scale: 0.97 }}
                      className="w-full py-3.5 rounded-2xl text-sm font-medium flex items-center justify-center gap-2.5 border transition-all"
                      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}>
                      <GoogleIcon className="w-4 h-4" /> Continue with Google
                    </motion.button>
                    <p className="text-center text-xs mt-4" style={{ color: 'var(--muted)' }}>
                      No account yet?{' '}
                      <button onClick={() => switchMode('register')} className="font-semibold underline underline-offset-2" style={{ color: 'var(--primary)' }}>
                        Create one
                      </button>
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-4 text-[11px]" style={{ color: 'var(--muted)' }}>
                      <Shield className="w-3 h-3" /> Zero-knowledge. We never read your messages.
                    </div>
                  </AuthCard>
                </motion.div>
              )}

              {/* REGISTER: ENTRY */}
              {mode === 'register' && step === 'entry' && (
                <motion.div key="register-entry" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                  <AuthCard>
                    <div className="mb-6">
                      <h2 className="text-2xl font-semibold mb-1 font-heading" style={{ color: 'var(--foreground)' }}>Get started free.</h2>
                      <p className="text-sm" style={{ color: 'var(--muted)' }}>Create an account to chat in any language.</p>
                    </div>
                    <form onSubmit={handleSendOtp} className="flex flex-col gap-3">
                      <div className="rounded-2xl overflow-hidden border" style={inputStyle}>
                        <input type="email" value={contact} onChange={(e) => setContact(e.target.value)}
                          placeholder="Enter your email" autoFocus autoComplete="email"
                          className="w-full px-4 py-3.5 bg-transparent text-sm focus:outline-none" style={{ color: 'var(--foreground)' }} />
                      </div>
                      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
                      <motion.button type="submit" disabled={loading || !contact.trim()} whileTap={{ scale: 0.97 }}
                        className="w-full py-3.5 rounded-2xl text-sm font-semibold mt-1 transition-all disabled:opacity-50"
                        style={{ background: 'var(--primary)', color: 'var(--paper)' }}>
                        {loading ? 'Sending code...' : 'Create account →'}
                      </motion.button>
                    </form>
                    <div className="flex items-center gap-3 my-1">
                      <div className="flex-1 h-px" style={{ background: 'var(--surface-border)' }} />
                      <span className="text-[11px]" style={{ color: 'var(--muted)' }}>or</span>
                      <div className="flex-1 h-px" style={{ background: 'var(--surface-border)' }} />
                    </div>
                    <motion.button type="button" onClick={handleGoogleSignIn} whileTap={{ scale: 0.97 }}
                      className="w-full py-3.5 rounded-2xl text-sm font-medium flex items-center justify-center gap-2.5 border transition-all"
                      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}>
                      <GoogleIcon className="w-4 h-4" /> Continue with Google
                    </motion.button>
                    <p className="text-center text-xs mt-4" style={{ color: 'var(--muted)' }}>
                      Already have an account?{' '}
                      <button onClick={() => switchMode('signin')} className="font-semibold underline underline-offset-2" style={{ color: 'var(--primary)' }}>
                        Sign in
                      </button>
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-4 text-[11px]" style={{ color: 'var(--muted)' }}>
                      <Shield className="w-3 h-3" /> Zero-knowledge. We never read your messages.
                    </div>
                  </AuthCard>
                </motion.div>
              )}

              {/* EMAIL CONFIRMATION */}
              {mode === 'register' && step === 'otp' && (
                <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                  <AuthCard>
                    <div className="flex flex-col items-center text-center mb-6">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 text-2xl" style={{ background: 'var(--accent-pink)' }}>✉️</div>
                      <h2 className="text-xl font-semibold mb-1 font-heading" style={{ color: 'var(--foreground)' }}>Confirm your email</h2>
                      <p className="text-sm" style={{ color: 'var(--muted)' }}>
                        We sent a confirmation link to <span className="font-medium" style={{ color: 'var(--primary)' }}>{contact}</span>.
                        Open the email and tap <span className="font-medium" style={{ color: 'var(--foreground)' }}>Verify Email</span> to continue.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs mb-4" style={{ color: 'var(--muted)' }}>
                      <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--primary)' }} />
                      Waiting for confirmation…
                    </div>
                    {error && <p className="text-xs text-red-500 text-center mb-3">{error}</p>}
                    <motion.button type="button" onClick={handleResendLink} disabled={loading} whileTap={{ scale: 0.97 }}
                      className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all disabled:opacity-50"
                      style={{ background: 'var(--primary)', color: 'var(--paper)' }}>
                      {loading ? 'Sending…' : 'Resend email'}
                    </motion.button>
                    <button onClick={() => { setStep('entry'); setOtp(''); setError(''); }}
                      className="w-full text-xs text-center mt-4" style={{ color: 'var(--muted)' }}>
                      Use a different address
                    </button>
                  </AuthCard>
                </motion.div>
              )}


              {/* LANGUAGE */}
              {mode === 'register' && step === 'language' && (
                <motion.div key="language" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                  <AuthCard>
                    <div className="flex flex-col items-center text-center mb-5">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'var(--accent-pink)' }}>
                        <Globe className="w-7 h-7" style={{ color: 'var(--primary)' }} />
                      </div>
                      <h2 className="text-xl font-semibold mb-1 font-heading" style={{ color: 'var(--foreground)' }}>What language do you think in?</h2>
                      <p className="text-sm" style={{ color: 'var(--muted)' }}>Preter will translate everything into this language for you.</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-5">
                      {LANGUAGES.map((l) => (
                        <motion.button key={l.code} whileTap={{ scale: 0.95 }} onClick={() => setLang(l)}
                          className="py-2.5 px-2 rounded-2xl text-center transition-all border"
                          style={lang.code === l.code
                            ? { background: 'var(--accent-pink)', border: '1.5px solid var(--primary)', color: 'var(--foreground)' }
                            : { background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--muted)' }}>
                          <div className="text-xs font-semibold truncate">{l.native}</div>
                          <div className="text-[10px] opacity-60 truncate">{l.label}</div>
                        </motion.button>
                      ))}
                    </div>
                    <motion.button onClick={handleLanguageDone} disabled={loading} whileTap={{ scale: 0.97 }}
                      className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all disabled:opacity-50"
                      style={{ background: 'var(--primary)', color: 'var(--paper)' }}>
                      {loading ? 'Saving...' : `Continue in ${lang.native} →`}
                    </motion.button>
                  </AuthCard>
                </motion.div>
              )}

              {/* DONE */}
              {mode === 'register' && step === 'done' && (
                <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
                  <AuthCard>
                    <div className="flex flex-col items-center text-center gap-3 mb-6">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                        className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--primary)' }}>
                        <Sparkles className="w-8 h-8" style={{ color: 'var(--paper)' }} />
                      </motion.div>
                      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="text-2xl font-semibold font-heading" style={{ color: 'var(--foreground)' }}>
                        {getGreeting()}
                      </motion.h2>
                      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                        You're in. Start by inviting someone. Your first conversation is waiting.
                      </motion.p>
                    </div>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                      className="rounded-2xl p-4 flex flex-col gap-3 border mb-4" style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)' }}>
                      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Invite your first contact</p>
                      <motion.button onClick={handleShare} whileTap={{ scale: 0.97 }}
                        className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                        style={{ background: 'var(--primary)', color: 'var(--paper)' }}>
                        <Share2 className="w-4 h-4" />
                        {sharedInvite ? 'Invite link copied!' : 'Text a friend to join'}
                      </motion.button>
                    </motion.div>
                    <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                      onClick={enterApp} className="w-full text-sm text-center" style={{ color: 'var(--muted)' }}>
                      Enter Preter on my own →
                    </motion.button>
                  </AuthCard>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Language Alignment Engine feature section ────────────────────── */}
      <LanguageAlignmentSection />

      {/* ── Roadmap - expandable below the hero ────────────────────────────── */}

      <AnimatePresence>
        {showRoadmap && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="relative z-10 overflow-hidden"
            style={{ borderTop: '1px solid var(--surface-border)' }}
          >
            <RoadmapSection />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="relative z-10 border-t py-6 px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs"
        style={{ borderColor: 'var(--surface-border)', color: 'var(--muted)' }}>
        <span className="font-heading" style={{ color: 'var(--primary)' }}>Preter&nbsp; |&nbsp;An Invictus Faith Studio Creation&nbsp;</span>
        <div className="flex items-center gap-4">
          <a href="/legal" className="hover:opacity-70 transition-opacity underline underline-offset-2">Privacy & Terms</a>
          <span>© {new Date().getFullYear()} Preter. GDPR compliant.</span>
        </div>
      </div>
    </div>
  );
}