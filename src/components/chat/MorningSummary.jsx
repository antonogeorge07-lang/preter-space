import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNowStrict } from 'date-fns';
import { Edit2 } from 'lucide-react';

const LANG_NATIVE = {
  en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch',
  ja: '日本語', zh: '中文', ar: 'العربية', pt: 'Português',
  hi: 'हिन्दी', ko: '한국어', it: 'Italiano', ru: 'Русский',
  tr: 'Türkçe', nl: 'Nederlands', pl: 'Polski', sv: 'Svenska',
};

function getGreeting(name) {
  const h = new Date().getHours();
  const first = name?.split(' ')[0] || '';
  const suffix = first ? `, ${first}.` : '.';
  if (h < 5)  return `Still up${suffix}`;
  if (h < 12) return `Good morning${suffix}`;
  if (h < 17) return `Good afternoon${suffix}`;
  return `Good evening${suffix}`;
}

function getMoodLine(unreadCount) {
  if (unreadCount === 0) return 'Your world is quiet.';
  if (unreadCount === 1) return 'One voice is waiting for you.';
  return `${unreadCount} voices are waiting for you.`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  try {
    return formatDistanceToNowStrict(new Date(dateStr), { addSuffix: true });
  } catch { return ''; }
}

const T = {
  masthead: {
    fontFamily: 'var(--font-heading)',
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--primary)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  greeting: {
    fontFamily: 'var(--font-heading)',
    fontSize: 32,
    fontWeight: 700,
    color: 'var(--foreground)',
    lineHeight: 1.2,
    margin: 0,
  },
  mood: {
    fontFamily: 'var(--font-body)',
    fontSize: 20,
    fontWeight: 400,
    color: 'var(--muted)',
    lineHeight: 1.35,
    margin: '6px 0 0',
  },
  sectionLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    color: 'var(--primary)',
    letterSpacing: '0.15em',
  },
  sectionLabelMuted: {
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    color: 'var(--muted)',
    letterSpacing: '0.15em',
  },
  divider: { height: 1, background: 'var(--surface-border)', marginTop: 8 },
  senderName: {
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--foreground)',
    letterSpacing: '0.01em',
  },
  senderLang: {
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    color: 'var(--muted)',
    letterSpacing: '0.02em',
  },
  dot: { color: 'var(--surface-border)', fontSize: 11, lineHeight: 1 },
  preview: {
    fontFamily: 'var(--font-body)',
    fontSize: 16,
    fontWeight: 400,
    color: 'var(--muted)',
    lineHeight: 1.6,
    margin: '6px 0 0',
  },
  timestamp: {
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    color: 'var(--muted)',
    letterSpacing: '0.02em',
    display: 'block',
    marginTop: 6,
    opacity: 0.8,
  },
  recentName: {
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--muted)',
  },
  recentPreview: {
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    color: 'var(--muted)',
    lineHeight: 1.45,
    margin: '3px 0 0',
    opacity: 0.85,
  },
  emptyText: {
    fontFamily: 'var(--font-body)',
    fontSize: 18,
    fontWeight: 400,
    color: 'var(--muted)',
    lineHeight: 1.65,
  },
};

const THREAD_ROW = {
  padding: '20px 0',
  borderBottom: '1px solid var(--surface-border)',
  background: 'none',
  border: 'none',
  borderBottomWidth: 1,
  borderBottomStyle: 'solid',
  borderBottomColor: 'var(--surface-border)',
  cursor: 'pointer',
  textAlign: 'left',
  width: '100%',
  display: 'block',
};

export default function MorningSummary({ conversations, currentUser, onSelectConversation, onNewConversation }) {
  const unreadThreads = useMemo(() => conversations
    .filter(c => {
      try { return (JSON.parse(c.unread_counts || '{}')[currentUser?.id] || 0) > 0; }
      catch { return false; }
    })
    .sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time))
    .slice(0, 6),
  [conversations, currentUser?.id]);

  const recentRead = useMemo(() => {
    const skip = new Set(unreadThreads.map(c => c.id));
    return conversations
      .filter(c => !skip.has(c.id) && c.last_message_preview && !c.archived)
      .sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time))
      .slice(0, 3);
  }, [conversations, unreadThreads]);

  const firstName = currentUser?.full_name?.split(' ')[0] || '';
  const greetingLine = getGreeting(firstName);
  const moodLine = getMoodLine(unreadThreads.length);

  const getContactLang = (conv) => {
    try {
      const langs = JSON.parse(conv.participant_languages || '{}');
      const otherId = (conv.participant_ids || []).find(id => id !== currentUser?.id);
      const code = otherId ? langs[otherId] : conv.preferred_language;
      return LANG_NATIVE[code] || code || null;
    } catch { return null; }
  };

  return (
    <div style={{ height: '100%', width: '100%', overflowY: 'auto', background: 'var(--background)', position: 'relative' }}>

      {/* Scrollable content */}
      <div style={{ padding: '40px 32px 120px', maxWidth: 640 }}>

        {/* Masthead */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          <span style={T.masthead}>Preter</span>
        </motion.div>

        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut', delay: 0.05 }}
          style={{ marginTop: 40 }}
        >
          <h1 style={T.greeting}>{greetingLine}</h1>
          <p style={T.mood}>{moodLine}</p>
        </motion.div>

        {/* Unread threads */}
        {unreadThreads.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            style={{ marginTop: 48 }}
          >
            <span style={T.sectionLabel}>Whispers from overnight</span>
            <div style={T.divider} />

            {unreadThreads.map((conv, i) => {
              const lang = getContactLang(conv);
              const preview = conv.last_message_preview || '';
              return (
                <motion.button
                  key={conv.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.07, duration: 0.4 }}
                  onClick={() => onSelectConversation(conv)}
                  style={THREAD_ROW}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={T.senderName}>{conv.participant_name}</span>
                    {lang && (
                      <>
                        <span style={T.dot}>•</span>
                        <span style={T.senderLang}>{lang}</span>
                      </>
                    )}
                  </div>
                  <p style={T.preview}>
                    "{preview.length > 100 ? preview.slice(0, 100) + '\u2026' : preview}"
                  </p>
                  <span style={T.timestamp}>{timeAgo(conv.last_message_time)}</span>
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* Recent (read) threads */}
        {recentRead.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            style={{ marginTop: 40 }}
          >
            <span style={T.sectionLabelMuted}>Recent</span>
            <div style={T.divider} />

            {recentRead.map((conv, i) => (
              <motion.button
                key={conv.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 + i * 0.06 }}
                onClick={() => onSelectConversation(conv)}
                style={{ ...THREAD_ROW, padding: '16px 0' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={T.recentName}>{conv.participant_name}</span>
                  <span style={{ ...T.dot, fontSize: 10 }}>•</span>
                  <span style={{ ...T.timestamp, display: 'inline', marginTop: 0 }}>
                    {timeAgo(conv.last_message_time)}
                  </span>
                </div>
                <p style={T.recentPreview}>
                  {conv.last_message_preview?.slice(0, 80) || ''}
                </p>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Empty state */}
        {unreadThreads.length === 0 && recentRead.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{ marginTop: 48 }}
          >
            <p style={T.emptyText}>
              No messages yet. Invite someone and start a conversation in any language.
            </p>
          </motion.div>
        )}
      </div>

      {/* Action bar — fixed inside this panel */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--background)',
        borderTop: '1px solid var(--surface-border)',
        padding: '12px 24px max(16px, env(safe-area-inset-bottom))',
      }}>
        <button
          onClick={onNewConversation}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--surface-border)'; e.currentTarget.style.color = 'var(--muted)'; }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            width: '100%',
            padding: '14px 20px',
            background: 'transparent',
            border: '1px solid var(--surface-border)',
            borderRadius: 10,
            cursor: 'pointer',
            color: 'var(--muted)',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            textAlign: 'left',
            letterSpacing: '0.01em',
            transition: 'border-color 0.2s, color 0.2s',
          }}
        >
          <Edit2 size={14} style={{ flexShrink: 0 }} />
          Start a new conversation...
        </button>
      </div>
    </div>
  );
}