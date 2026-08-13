import { db } from '@/lib/db';

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
    getInvitePreview({ data: { code } })
      .then(res => { if (res?.sender_name) setSenderName(res.sender_name); })
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
      try { await db.auth.updateMe({ default_language: chosenLang }); } catch {}

      const res = await joinByInviteCode({ data: { code, language: chosenLang } });
      if (res?.error || !res?.conversation_id) { setStep('error'); return; }

      if (res.already_member) {
        setStep('already');
        setTimeout(() => navigate(`/chat/${res.conversation_id}`), 800);
        return;
      }

      try { localStorage.setItem('vl_onboarded', '1'); } catch {}
      setStep('joined');
      setTimeout(() => navigate(`/chat/${res.conversation_id}`), 900);

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

  // Register new user — send OTP
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
    background: 'rgba(255,255,255,0.88)',
    border: '1px solid rgba(180,165,140,0.40)',
  };

  // Transition states
  if (step === 'joining' || step === 'joined' || step === 'already' || step === 'error') {
    return (
      <div className="h-[100dvh] w-screen flex items-center justify-center" style={{ background: '#F5F2EB' }}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-4 p-10 rounded-3xl text-center max-w-xs mx-4"
          style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(180,165,140,0.30)' }}>
          <motion.div
            animate={{ rotate: step === 'joining' ? 360 : 0 }}
            transition={{ duration: 1.2, repeat: step === 'joining' ? Infinity : 0, ease: 'linear' }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: '#5a4f40' }}>
            <MessageCircle className="w-7 h-7 text-white" />
          </motion.div>
          <p className="text-base font-semibold" style={{ color: '#3a3028' }}>
            {step === 'joining' ? 'Opening your conversation...' :
             step === 'joined'  ? 'Welcome to the conversation!' :
             step === 'already' ? 'Taking you back in...' :
             'This invite link has expired or is invalid.'}
          </p>
          {step === 'error' && (
            <button onClick={() => navigate('/')}
              className="mt-1 px-6 py-2.5 rounded-2xl text-sm font-semibold"
              style={{ background: '#5a4f40', color: '#F5F2EB' }}>
              Go to Forge
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-screen flex flex-col items-center justify-center overflow-hidden relative px-4"
      style={{ background: '#F5F2EB' }}>
      <div className="absolute inset-0 dot-grid opacity-50 pointer-events-none" />

      {/* Logo */}
      <div className="absolute top-6 left-6 z-20">
        <span className="text-base font-semibold tracking-tight" style={{ fontFamily: "'Lora', Georgia, serif", color: '#3a3028' }}>Forge</span>
      </div>

      <AnimatePresence mode="wait">

        {/* ── PREVIEW ─────────────────────────────────────────────────────── */}
        {step === 'preview' && (
          <motion.div key="preview"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="relative z-10 w-full max-w-sm flex flex-col gap-5">
            <div className="text-center">
              <h1 className="text-3xl font-semibold" style={{ fontFamily: "'Lora', Georgia, serif", color: '#3a3028' }}>
                {senderName} invited you
              </h1>
              <p className="text-sm mt-2" style={{ color: '#8a7968' }}>
                Chat in any language. Forge translates in real-time.
              </p>
            </div>

            {/* Blurred preview */}
            <div className="w-full rounded-2xl overflow-hidden relative border" style={{ background: 'rgba(255,255,255,0.65)', borderColor: 'rgba(180,165,140,0.35)' }}>
              <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: '1px solid rgba(180,165,140,0.25)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: '#5a4f40' }}>
                  {senderName?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-semibold" style={{ color: '#3a3028' }}>{senderName}</div>
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
                        ? { background: '#5a4f40', color: '#F5F2EB' }
                        : { background: 'rgba(255,255,255,0.9)', color: '#3a3028', border: '1px solid rgba(180,165,140,0.25)' }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(245,242,235,0.30)' }}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-2" style={{ background: 'rgba(255,255,255,0.9)' }}>
                  <Lock className="w-5 h-5" style={{ color: '#5a4f40' }} />
                </div>
                <p className="text-xs" style={{ color: '#8a7968' }}>Sign in to unlock this conversation</p>
              </div>
            </div>

            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep('auth')}
              className="w-full py-4 rounded-2xl text-sm font-semibold"
              style={{ background: '#5a4f40', color: '#F5F2EB' }}>
              Join conversation →
            </motion.button>
            <div className="flex items-center justify-center gap-1.5 text-[11px]" style={{ color: '#b0a090' }}>
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
              <h2 className="text-2xl font-semibold" style={{ fontFamily: "'Lora', Georgia, serif", color: '#3a3028' }}>
                {authMode === 'signin' ? 'Welcome back.' : 'Create your account.'}
              </h2>
              <p className="text-sm mt-1" style={{ color: '#8a7968' }}>
                {authMode === 'signin' ? 'Sign in to join the conversation.' : 'A quick setup and you\'re in.'}
              </p>
            </div>

            <form onSubmit={authMode === 'signin' ? handleSignIn : handleRegister} className="flex flex-col gap-3">
              <div className="rounded-2xl overflow-hidden border" style={inputStyle}>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="Email address" autoFocus autoComplete="email"
                  className="w-full px-5 py-4 bg-transparent text-base focus:outline-none" style={{ color: '#3a3028' }} />
              </div>

              {authMode === 'signin' && (
                <div className="rounded-2xl overflow-hidden border relative" style={inputStyle}>
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Password" autoComplete="current-password"
                    className="w-full px-5 py-4 pr-12 bg-transparent text-base focus:outline-none" style={{ color: '#3a3028' }} />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: '#a09078' }}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}

              {error && <p className="text-xs text-red-500 text-center">{error}</p>}

              <motion.button type="submit" disabled={loading || !email.trim() || (authMode === 'signin' && !password)}
                whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-2xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{ background: '#5a4f40', color: '#F5F2EB' }}>
                {loading ? (authMode === 'signin' ? 'Signing in...' : 'Sending code...') : (authMode === 'signin' ? 'Sign in →' : 'Create account →')}
              </motion.button>
            </form>

            <p className="text-center text-[13px]" style={{ color: '#a09078' }}>
              {authMode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => { setAuthMode(authMode === 'signin' ? 'register' : 'signin'); setError(''); }}
                className="font-semibold underline underline-offset-2" style={{ color: '#5a4f40' }}>
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
              <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(90,79,64,0.10)' }}>
                <span className="text-2xl">✉️</span>
              </div>
              <h2 className="text-2xl font-semibold" style={{ fontFamily: "'Lora', Georgia, serif", color: '#3a3028' }}>Check your inbox</h2>
              <p className="text-sm mt-1" style={{ color: '#8a7968' }}>
                We sent a code to <span className="font-medium" style={{ color: '#5a4f40' }}>{email}</span>
              </p>
            </div>
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
              <div className="rounded-2xl overflow-hidden border" style={{ ...inputStyle }}>
                <input type="text" inputMode="numeric" value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter code" autoFocus autoComplete="one-time-code" maxLength={6}
                  className="w-full px-5 py-4 bg-transparent text-xl font-mono tracking-widest text-center focus:outline-none"
                  style={{ color: '#3a3028' }} />
              </div>
              {error && <p className="text-xs text-red-500 text-center">{error}</p>}
              <motion.button type="submit" disabled={loading || otp.length < 4} whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-2xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{ background: '#5a4f40', color: '#F5F2EB' }}>
                {loading ? 'Verifying...' : 'Verify →'}
              </motion.button>
            </form>
            <button onClick={() => { setStep('auth'); setOtp(''); setError(''); }}
              className="text-xs text-center" style={{ color: '#a09078' }}>
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
              <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(90,79,64,0.10)' }}>
                <Globe className="w-7 h-7" style={{ color: '#5a4f40' }} />
              </div>
              <h2 className="text-2xl font-semibold" style={{ fontFamily: "'Lora', Georgia, serif", color: '#3a3028' }}>
                What language do you think in?
              </h2>
              <p className="text-sm mt-1" style={{ color: '#8a7968' }}>
                Forge will translate {senderName}'s messages into this language for you.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGES.map(l => (
                <motion.button key={l.code} whileTap={{ scale: 0.95 }} onClick={() => setLang(l)}
                  className="py-3 px-2 rounded-2xl text-center transition-all border"
                  style={lang.code === l.code
                    ? { background: 'rgba(90,79,64,0.12)', border: '1.5px solid rgba(90,79,64,0.35)', color: '#3a3028' }
                    : { background: 'rgba(255,255,255,0.60)', border: '1px solid rgba(180,165,140,0.35)', color: '#6a5f50' }}>
                  <div className="text-xs font-semibold truncate">{l.native}</div>
                  <div className="text-[10px] opacity-60 truncate">{l.label}</div>
                </motion.button>
              ))}
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => joinConversation(lang.code)}
              disabled={loading}
              className="w-full py-4 rounded-2xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: '#5a4f40', color: '#F5F2EB' }}>
              {loading ? 'Joining...' : `Join in ${lang.native} →`}
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}