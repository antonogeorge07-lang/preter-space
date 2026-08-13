import { db } from '@/lib/db';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Globe, Mail, Link, Copy, Check, Users } from 'lucide-react';
import { LANG_MAP } from '@/lib/translation';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateInviteCode, getInviteUrl } from '@/lib/inviteCode';

const LANG_OPTIONS = Object.entries(LANG_MAP).map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name));
const AVATARS = ['🧑', '👩', '🧔', '👨', '🧑💻', '👩💻', '🧑🎨', '👩🎨', '🧑🚀', '👩🚀'];

export default function NewConversationModal({ isOpen, onClose, onCreate, currentUser }) {
  const [tab, setTab] = useState('create');
  const [name, setName] = useState('');
  const [lang, setLang] = useState(() => (currentUser?.default_language && LANG_MAP[currentUser.default_language]) ? currentUser.default_language : 'en');
  const [avatar, setAvatar] = useState('🧑');
  const [isGroup, setIsGroup] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdConv, setCreatedConv] = useState(null);
  const [copied, setCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [createError, setCreateError] = useState('');

  const reset = () => {
    setName('');
    setLang(currentUser?.default_language && LANG_MAP[currentUser.default_language] ? currentUser.default_language : 'en');
    setAvatar('🧑'); setIsGroup(false);
    setInviteEmail(''); setCreatedConv(null);
    setCopied(false); setEmailSent(false); setTab('create'); setCreateError('');
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreateError('');
    setLoading(true);
    const inviteCode = generateInviteCode();
    try {
      const conv = await onCreate({
        name: name.trim(), lang, avatar, isGroup,
        inviteCode,
        invite_open: true,
        participantIds: [currentUser?.id].filter(Boolean),
        participantNames: [currentUser?.full_name || currentUser?.email || ''].filter(Boolean),
      });
      setCreatedConv(conv);
      setTab('invite');
    } catch (err) {
      setCreateError('Could not create conversation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!createdConv?.invite_code) return;
    await navigator.clipboard.writeText(getInviteUrl(createdConv.invite_code));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleSendEmail = async () => {
    if (!inviteEmail.trim() || !isValidEmail(inviteEmail.trim()) || !createdConv) return;
    setLoading(true);
    const link = getInviteUrl(createdConv.invite_code);
    await db.integrations.Core.SendEmail({
      to: inviteEmail.trim(),
      subject: `${currentUser?.full_name || 'Someone'} invited you to chat on Preter`,
      body: `You've been invited to a multilingual conversation on Preter.\n\nClick to join: ${link}\n\nThis link is unique to you.`,
    });
    setEmailSent(true);
    setLoading(false);
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl shadow-2xl p-6 flex flex-col gap-5"
            style={{ background: 'var(--surface-bg)', border: '1px solid var(--surface-border)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-pink)' }}>
                  <MessageSquare className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                </div>
                <h2 className="font-bold text-foreground text-lg font-heading">
                  {tab === 'create' ? 'New Conversation' : 'Invite Contact'}
                </h2>
              </div>
              <button onClick={handleClose}
                className="p-1.5 rounded-xl transition-colors"
                style={{ background: 'var(--glass-bg-subtle)' }}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* CREATE TAB */}
            {tab === 'create' && (
              <>
                {/* Avatar */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Pick an avatar</p>
                  <div className="flex flex-wrap gap-2">
                    {AVATARS.map((a) => (
                      <button key={a} onClick={() => setAvatar(a)}
                        className={`w-9 h-9 rounded-xl text-lg transition-all ${avatar === a ? 'scale-110' : 'hover:scale-105'}`}
                        style={avatar === a
                          ? { background: 'var(--accent-pink)', boxShadow: '0 0 0 2px var(--primary)', userSelect: 'none' }
                          : { background: 'var(--card-bg)', userSelect: 'none' }}>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Group toggle */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer"
                  style={{ border: '1px solid var(--surface-border)', background: isGroup ? 'var(--glass-bg-subtle)' : 'transparent' }}
                  onClick={() => setIsGroup(v => !v)}>
                  <Users className="w-4 h-4 flex-shrink-0" style={{ color: isGroup ? 'var(--primary)' : 'var(--muted)' }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Group chat</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>Multiple people can join via link</p>
                  </div>
                  <div className="w-9 h-5 rounded-full transition-all flex-shrink-0 relative" style={{ background: isGroup ? 'var(--primary)' : 'var(--surface-border)' }}>
                    <div className="absolute top-0.5 w-4 h-4 rounded-full shadow transition-all" style={{ left: isGroup ? '18px' : '2px', background: 'var(--paper)' }} />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1.5">
                    {isGroup ? 'Group name' : 'Contact name'}
                  </label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="e.g. Maria, Ahmed, Yuki..."
                    className="w-full rounded-2xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 transition-all"
                    style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--foreground)' }}
                    autoFocus />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Their language (translate my messages to)
                  </label>
                  <Select value={lang} onValueChange={setLang}>
                    <SelectTrigger className="w-full rounded-2xl h-11" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {LANG_OPTIONS.map(({ code, name }) => (
                        <SelectItem key={code} value={code}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {createError && (
                  <p className="text-xs text-red-500 text-center -mt-2">{createError}</p>
                )}
                <div className="flex gap-3">
                  <button onClick={handleClose}
                    className="flex-1 py-2.5 rounded-2xl text-muted-foreground text-sm font-medium transition-all"
                    style={{ background: 'var(--card-bg)', border: '1px solid var(--surface-border)', userSelect: 'none' }}>
                    Cancel
                  </button>
                  <button onClick={handleCreate} disabled={!name.trim() || loading}
                    className="flex-1 py-2.5 rounded-2xl text-white text-sm font-semibold shadow-lg disabled:opacity-40 transition-all"
                    style={{ background: 'var(--primary)', userSelect: 'none' }}>
                    {loading ? 'Creating...' : 'Create & Invite'}
                  </button>
                </div>
              </>
            )}

            {/* INVITE TAB */}
            {tab === 'invite' && createdConv && (
              <>
                <div className="text-center py-2">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center text-3xl bg-green-100">✅</div>
                  <p className="font-semibold text-foreground">Conversation created!</p>
                  <p className="text-xs text-muted-foreground mt-1">Now invite {name} to join</p>
                </div>

                {/* Copy link */}
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1"><Link className="w-3 h-3" /> Share invite link</p>
                  <div className="flex gap-2">
                    <div className="flex-1 px-3 py-2 rounded-xl text-xs text-foreground/70 truncate font-mono"
                      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                      {getInviteUrl(createdConv.invite_code)}
                    </div>
                    <button onClick={handleCopyLink}
                      className="px-3 py-2 rounded-xl text-white flex items-center gap-1 text-xs font-medium flex-shrink-0"
                      style={{ background: 'var(--primary)', userSelect: 'none' }}>
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Email invite */}
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1"><Mail className="w-3 h-3" /> Or send via email</p>
                  <div className="flex gap-2">
                    <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                      placeholder="their@email.com"
                      className="flex-1 rounded-xl py-2 px-3 text-sm focus:outline-none"
                      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--foreground)' }} />
                    <button onClick={handleSendEmail} disabled={!isValidEmail(inviteEmail.trim()) || loading || emailSent}
                      className="px-3 py-2 rounded-xl text-white text-xs font-medium disabled:opacity-40 flex-shrink-0"
                      style={{ background: 'var(--primary)', userSelect: 'none' }}>
                      {emailSent ? 'Sent!' : loading ? '...' : 'Send'}
                    </button>
                  </div>
                </div>

                <button onClick={handleClose}
                  className="w-full py-2.5 rounded-2xl text-white text-sm font-semibold transition-all"
                  style={{ background: 'var(--primary)', userSelect: 'none' }}>
                  Open Chat
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}