import { saveUserLanguage } from '@/lib/saveUserLanguage';
import { db } from '@/lib/db';
import { convexChat } from '@/lib/convexChat';
import { convexApi } from '@/lib/convexApi';


import { useEffect, useState } from 'react';
import { useParams, useNavigate } from '@/lib/router-compat';
import { motion, AnimatePresence } from 'framer-motion';

import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Globe, Lock, MessageCircle, ChevronRight, Shield, Eye, EyeOff } from 'lucide-react';

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
  const code = (navigator.language || 'en').split('-')[0];
  return LANGUAGES.find(l => l.code === code) || LANGUAGES[0];
}

const PREVIEW_MESSAGES = [
  { id: 1, from: 'them', content: '████████ ███ ██████ ████', time: '08:14' },
  { id: 2, from: 'me',   content: '███ ████████! ████ ███ ██', time: '08:15' },
  { id: 3, from: 'them', content: '██████ ██ ████ ██████ ██████ ██████.', time: '08:16' },
  { id: 4, from: 'me',   content: '████ ███ ████████ ███ ██ ████.', time: '08:17' },
];

export default function JoinConversation() {
  const { code } = useParams();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();

  // steps: preview | auth | otp | language | joining | joined | error | already
  const [step, setStep] = useState('preview');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState('signin'); // signin | register
  const [otp, setOtp] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [lang, setLang] = useState(() => detectLang());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [senderName, setSenderName] = useState('Your contact');

  // Pre-fetch sender name
  useEffect(() => {
    if (!code) return;
    convexChat.getConversationByInvite(code)
      .then(conv => { if (conv?.title) setSenderName(conv.title); })
      .catch(() => {});
  }, [code]);


  // If already logged in, skip auth and go straight to language selection
  useEffect(() => {
    if (currentUser && step === 'preview') {
      setStep('language');
    }
  }, [currentUser]);

  const joinConversation = async (userLangCode) => {
    setStep('joining');
    const chosenLang = userLangCode || lang.code;
    try {
      // Save chosen language first so the server join picks it up
      await saveUserLanguage(chosenLang, currentUser);

      const conv = await convexChat.getConversationByInvite(code);
      const myKey = currentUser?.email;
      if (!conv || !conv.inviteOpen || !myKey) { setStep('error'); return; }

      if ((conv.participantIds || []).includes(myKey)) {
        setStep('already');
        setTimeout(() => navigate(`/chat/${conv._id}`), 800);
        return;
      }

      await convexChat.mutation(convexApi.conversations.update, {
          conversationId: conv._id,
          participantIds: [...(conv.participantIds || []), myKey],
          participantNames: [...(conv.participantNames || []), currentUser?.full_name || myKey],
        participantLanguages: { ...(conv.participantLanguages || {}), [myKey]: chosenLang },
      });

      try { localStorage.setItem('vl_onboarded', '1'); } catch {}
      setStep('joined');
      setTimeout(() => navigate(`/chat/${conv._id}`), 900);

    } catch {
      setStep('error');
    }
  };

  // Sign in existing user
  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await db.auth.loginViaEmailPassword(email.trim(), password);
      // After login, go to language step
      setStep('language');
    } catch {
      setError('Incorrect email or password.');
    } finally {
      setLoading(false);
    }
  };

  // Register new user - send OTP
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    const pwd = Array.from(arr, b => b.toString(36)).join('').slice(0, 16) + 'A1!';
    setGeneratedPassword(pwd);
    try {
      await db.auth.register({ email: email.trim(), password: pwd });
      setStep('otp');
    } catch (err) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('already') || msg.includes('exist')) {
        setError('Account already exists. Sign in instead.');
        setAuthMode('signin');
      } else {
        setError('Could not send code. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const result = await db.auth.verifyOtp({ email: email.trim(), otpCode: otp.trim() });
      await db.auth.setToken(result.access_token);
      setStep('language');
    } catch {
      setError('Invalid code. Check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
  };

  // Transition states
  if (step === 'joining' || step === 'joined' || step === 'already' || step === 'error') {
    return (
      <div className="h-[100dvh] w-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-4 p-10 rounded-3xl text-center max-w-xs mx-4"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <motion.div
            animate={{ rotate: step === 'joining' ? 360 : 0 }}
            transition={{ duration: 1.2, repeat: step === 'joining' ? Infinity : 0, ease: 'linear' }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--primary)' }}>
            <MessageCircle className="w-7 h-7 text-white" />
          </motion.div>
          <p className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
            {step === 'joining' ? 'Opening your conversation...' :
             step === 'joined'  ? 'Welcome to the conversation!' :
             step === 'already' ? 'Taking you back in...' :
             'This invite link has expired or is invalid.'}
          </p>
          {step === 'error' && (
            <button onClick={() => navigate('/')}
              className="mt-1 px-6 py-2.5 rounded-2xl text-sm font-semibold"
              style={{ background: 'var(--primary)', color: 'var(--background)' }}>
              Go to Forge
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-screen flex flex-col items-center justify-center overflow-hidden relative px-4"
      style={{ background: 'var(--background)' }}>
      <div className="absolute inset-0 dot-grid opacity-50 pointer-events-none" />

      {/* Logo */}
      <div className="absolute top-6 left-6 z-20">
        <span className="text-base font-semibold tracking-tight" style={{ fontFamily: 'var(--font-heading-family)', color: 'var(--foreground)' }}>Forge</span>
      </div>

      <AnimatePresence mode="wait">

        {/* ── PREVIEW ─────────────────────────────────────────────────────── */}
        {step === 'preview' && (
          <motion.div key="preview"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="relative z-10 w-full max-w-sm flex flex-col gap-5">
            <div className="text-center">
              <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-heading-family)', color: 'var(--foreground)' }}>
                {senderName} invited you
              </h1>
              <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
                Chat in any language. Forge translates in real-time.
              </p>
            </div>

            {/* Blurred preview */}
            <div className="w-full rounded-2xl overflow-hidden relative border" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
              <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: 'var(--primary)' }}>
                  {senderName?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{senderName}</div>
                  <div className="text-[10px] text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Translating in real-time
                  </div>
                </div>
              </div>
              <div className="px-4 py-4 space-y-3" style={{ filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none' }}>
                {PREVIEW_MESSAGES.map(msg => (
                  <div key={msg.id} className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                    <div className="px-4 py-2 rounded-2xl text-xs max-w-[75%]"
                      style={msg.from === 'me'
                        ? { background: 'var(--primary)', color: 'var(--background)' }
                        : { background: 'var(--card-bg)', color: 'var(--foreground)', border: '1px solid var(--card-border)' }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'var(--glass-bg-subtle)' }}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-2" style={{ background: 'var(--card-bg)' }}>
                  <Lock className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                </div>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Sign in to unlock this conversation</p>
              </div>
            </div>

            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep('auth')}
              className="w-full py-4 rounded-2xl text-sm font-semibold"
              style={{ background: 'var(--primary)', color: 'var(--background)' }}>
              Join conversation →
            </motion.button>
            <div className="flex items-center justify-center gap-1.5 text-[11px]" style={{ color: 'var(--muted)' }}>
              <Shield className="w-3 h-3" /> Zero-knowledge. We never read your messages.
            </div>
          </motion.div>
        )}

        {/* ── AUTH ────────────────────────────────────────────────────────── */}
        {step === 'auth' && (
          <motion.div key="auth"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="relative z-10 w-full max-w-sm flex flex-col gap-5">
            <div className="text-center">
              <h2 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-heading-family)', color: 'var(--foreground)' }}>
                {authMode === 'signin' ? 'Welcome back.' : 'Create your account.'}
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                {authMode === 'signin' ? 'Sign in to join the conversation.' : 'A quick setup and you\'re in.'}
              </p>
            </div>

            <form onSubmit={authMode === 'signin' ? handleSignIn : handleRegister} className="flex flex-col gap-3">
              <div className="rounded-2xl overflow-hidden border" style={inputStyle}>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="Email address" autoFocus autoComplete="email"
                  className="w-full px-5 py-4 bg-transparent text-base focus:outline-none" style={{ color: 'var(--foreground)' }} />
              </div>

              {authMode === 'signin' && (
                <div className="rounded-2xl overflow-hidden border relative" style={inputStyle}>
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Password" autoComplete="current-password"
                    className="w-full px-5 py-4 pr-12 bg-transparent text-base focus:outline-none" style={{ color: 'var(--foreground)' }} />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}

              {error && <p className="text-xs text-red-500 text-center">{error}</p>}

              <motion.button type="submit" disabled={loading || !email.trim() || (authMode === 'signin' && !password)}
                whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-2xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{ background: 'var(--primary)', color: 'var(--background)' }}>
                {loading ? (authMode === 'signin' ? 'Signing in...' : 'Sending code...') : (authMode === 'signin' ? 'Sign in →' : 'Create account →')}
              </motion.button>
            </form>

            <p className="text-center text-[13px]" style={{ color: 'var(--muted)' }}>
              {authMode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => { setAuthMode(authMode === 'signin' ? 'register' : 'signin'); setError(''); }}
                className="font-semibold underline underline-offset-2" style={{ color: 'var(--primary)' }}>
                {authMode === 'signin' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </motion.div>
        )}

        {/* ── OTP ─────────────────────────────────────────────────────────── */}
        {step === 'otp' && (
          <motion.div key="otp"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="relative z-10 w-full max-w-sm flex flex-col gap-5">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3" style={{ background: 'color-mix(in oklab, var(--primary) 12%, transparent)' }}>
                <span className="text-2xl">✉️</span>
              </div>
              <h2 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-heading-family)', color: 'var(--foreground)' }}>Check your inbox</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                We sent a code to <span className="font-medium" style={{ color: 'var(--primary)' }}>{email}</span>
              </p>
            </div>
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
              <div className="rounded-2xl overflow-hidden border" style={{ ...inputStyle }}>
                <input type="text" inputMode="numeric" value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter code" autoFocus autoComplete="one-time-code" maxLength={6}
                  className="w-full px-5 py-4 bg-transparent text-xl font-mono tracking-widest text-center focus:outline-none"
                  style={{ color: 'var(--foreground)' }} />
              </div>
              {error && <p className="text-xs text-red-500 text-center">{error}</p>}
              <motion.button type="submit" disabled={loading || otp.length < 4} whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-2xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{ background: 'var(--primary)', color: 'var(--background)' }}>
                {loading ? 'Verifying...' : 'Verify →'}
              </motion.button>
            </form>
            <button onClick={() => { setStep('auth'); setOtp(''); setError(''); }}
              className="text-xs text-center" style={{ color: 'var(--muted)' }}>
              Use a different email
            </button>
          </motion.div>
        )}

        {/* ── LANGUAGE ────────────────────────────────────────────────────── */}
        {step === 'language' && (
          <motion.div key="language"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="relative z-10 w-full max-w-sm flex flex-col gap-5">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3" style={{ background: 'color-mix(in oklab, var(--primary) 12%, transparent)' }}>
                <Globe className="w-7 h-7" style={{ color: 'var(--primary)' }} />
              </div>
              <h2 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-heading-family)', color: 'var(--foreground)' }}>
                What language do you think in?
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                Forge will translate {senderName}'s messages into this language for you.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGES.map(l => (
                <motion.button key={l.code} whileTap={{ scale: 0.95 }} onClick={() => setLang(l)}
                  className="py-3 px-2 rounded-2xl text-center transition-all border"
                  style={lang.code === l.code
                    ? { background: 'color-mix(in oklab, var(--primary) 12%, transparent)', border: '1.5px solid color-mix(in oklab, var(--primary) 35%, transparent)', color: 'var(--foreground)' }
                    : { background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--muted)' }}>
                  <div className="text-xs font-semibold truncate">{l.native}</div>
                  <div className="text-[10px] opacity-60 truncate">{l.label}</div>
                </motion.button>
              ))}
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => joinConversation(lang.code)}
              disabled={loading}
              className="w-full py-4 rounded-2xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: 'var(--primary)', color: 'var(--background)' }}>
              {loading ? 'Joining...' : `Join in ${lang.native} →`}
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}