import { db } from '@/lib/db';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Globe, Camera, LogOut, Phone, Trash2, AlertTriangle, Loader2, Monitor, ShieldOff } from 'lucide-react';
import { Link } from '@/lib/router-compat';

import { LANG_MAP } from '@/lib/translation';
import { getOrCreateDeviceSessionId, forceKillRemoteSession } from '@/lib/deviceSession';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useServerFn } from '@tanstack/react-start';
import { deleteAccount } from '@/lib/account.functions';
import { toast } from '@/components/ui/use-toast';

const LANG_OPTIONS = Object.entries(LANG_MAP)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

export default function UserProfile({ isOpen, onClose }) {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [defaultLang, setDefaultLang] = useState('en');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [killingSession, setKillingSession] = useState(null);
  const fileInputRef = useRef(null);
  const mySessionId = getOrCreateDeviceSessionId();
  const [deleting, setDeleting] = useState(false);
  const callDeleteAccount = useServerFn(deleteAccount);

  useEffect(() => {
    if (!isOpen) return;
    db.auth.me().then(u => {
      setUser(u);
      setName(u.full_name || '');
      setDefaultLang(u.default_language || 'en');
      setPhone(u.phone || '');
      setAvatarUrl(u.avatar_url || '');
    });
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    await db.auth.updateMe({ default_language: defaultLang, phone, avatar_url: avatarUrl });
    // Propagate new language to all conversations the user is part of
    try {
      const myKey = user?.email;
      if (myKey) {
        await convexChat.upsertUser({
          name: user?.full_name || myKey,
          email: myKey,
          language: defaultLang,
          ...(avatarUrl ? { avatarUrl } : {}),
        });
        const convs = await convexChat.query(convexApi.conversations.getForUser, { userId: myKey });
        await Promise.all(
          (convs || []).map(c =>
            convexChat.mutation(convexApi.conversations.update, {
              conversationId: c._id,
              participantLanguages: { ...(c.participantLanguages || {}), [myKey]: defaultLang },
            }),
          ),
        );
      }
    } catch {}
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await callDeleteAccount({});
      toast({ title: 'Account deleted', description: 'Your account and messages have been removed.' });
      await db.auth.logout('/');
    } catch {
      setDeleting(false);
      toast({ title: 'Could not delete account', description: 'Please try again in a moment.', variant: 'destructive' });
    }
  };

  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';

  const handleKillSession = async (sessionId) => {
    setKillingSession(sessionId);
    const fresh = await db.auth.me();
    await forceKillRemoteSession(fresh, sessionId);
    setUser(await db.auth.me());
    setKillingSession(null);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return; // 5MB max
    setUploadingAvatar(true);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      setAvatarUrl(file_url);
      await db.auth.updateMe({ avatar_url: file_url });
    } catch {}
    setUploadingAvatar(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className="fixed inset-x-4 top-[5%] bottom-[5%] overflow-y-auto sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[420px] sm:top-[10%] sm:bottom-auto z-50 rounded-3xl shadow-2xl p-6"
            style={{ background: 'var(--surface-bg)', border: '1px solid var(--surface-border)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground">Profile & Settings</h2>
              <button
                onClick={onClose}
                style={{ userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
                className="p-2 rounded-xl hover:bg-[var(--glass-hover)] transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Avatar */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <button onClick={() => fileInputRef.current?.click()} className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg block">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #4F46E5, #6366F1)' }}>
                      {initials}
                    </div>
                  )}
                </button>
                <button onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] flex items-center justify-center">
                  {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" /> : <Camera className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              <p className="mt-3 text-sm font-medium text-foreground">{user?.email}</p>
            </div>

            {/* Name (read-only) */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Display Name</label>
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)]">
                <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground">{user?.full_name || 'Not set'}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 ml-1">Name is managed by your account</p>
            </div>

            {/* Phone */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Mobile Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 555 000 0000"
                  className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl py-3 pl-9 pr-4 text-sm text-foreground focus:outline-none focus:border-primary/40 placeholder-muted-foreground transition-all"
                />
              </div>
            </div>

            {/* Default language */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Default Translation Language</label>
              <Select value={defaultLang} onValueChange={setDefaultLang}>
                <SelectTrigger className="w-full rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] h-12">
                  <Globe className="w-4 h-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {LANG_OPTIONS.map(({ code, name }) => (
                    <SelectItem key={code} value={code}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              disabled={saving}
              style={{ userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-medium text-sm transition-all hover:opacity-90 disabled:opacity-60"
            >
              {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Settings'}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => db.auth.logout('/')}
              style={{ userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
              className="w-full mt-3 py-3 rounded-2xl bg-red-500/10 border border-red-400/20 text-red-500 font-medium text-sm flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </motion.button>

            {/* Delete account */}
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{ userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
                className="w-full mt-3 py-2 text-xs text-muted-foreground hover:text-red-400 transition-colors flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Delete Account
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-4 rounded-2xl bg-red-500/10 border border-red-400/20"
              >
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-500">This permanently deletes your account, profile and messages. This cannot be undone.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    style={{ userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
                    className="flex-1 py-2 rounded-xl text-xs bg-white/20 text-muted-foreground hover:bg-white/30 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    style={{ userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
                    className="flex-1 py-2 rounded-xl text-xs bg-red-500 text-white font-medium hover:bg-red-600 transition-all disabled:opacity-60"
                  >
                    {deleting ? 'Deleting...' : 'Delete permanently'}
                  </button>
                </div>
              </motion.div>
            )}
            {/* Active Sessions */}
            {Array.isArray(user?.active_sessions) && user.active_sessions.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5" /> Active Sessions
                </p>
                <div className="flex flex-col gap-1.5">
                  {user.active_sessions.map(s => {
                    const isMe = s.id === mySessionId;
                    const browser = s.userAgent?.match(/(Chrome|Firefox|Safari|Edge|Opera)/)?.[1] || 'Browser';
                    const lastActive = s.lastActive ? new Date(s.lastActive).toLocaleString() : '—';
                    return (
                      <div key={s.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                        <div className="min-w-0">
                          <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                            {browser} {isMe && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent-pink)', color: 'var(--primary)' }}>This device</span>}
                          </p>
                          <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Last active: {lastActive}</p>
                        </div>
                        {!isMe && (
                          <button onClick={() => handleKillSession(s.id)} disabled={killingSession === s.id}
                            className="ml-2 p-1.5 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0 disabled:opacity-40"
                            title="Terminate session">
                            {killingSession === s.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                              : <ShieldOff className="w-3.5 h-3.5 text-red-400" />}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-6 text-center">
              <Link to="/legal" onClick={onClose}
                className="text-[11px] underline underline-offset-2 transition-colors hover:opacity-80"
                style={{ color: 'var(--muted)' }}>
                Privacy Policy &amp; Terms of Service
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}