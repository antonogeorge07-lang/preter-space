import { db } from '@/lib/db';

import { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';

import { generateInviteCode, getInviteUrl } from '@/lib/inviteCode';

export default function InviteButton({ currentUser }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [createdCode, setCreatedCode] = useState(null);

  const handleShare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      let code = currentUser?.invite_code || createdCode;
      if (!code) {
        code = generateInviteCode();
        setCreatedCode(code);
        await db.entities.Conversation.create({
          participant_name: currentUser?.full_name || currentUser?.email || 'You',
          participant_ids: [currentUser?.id].filter(Boolean),
          participant_names: [currentUser?.full_name || currentUser?.email || ''].filter(Boolean),
          preferred_language: currentUser?.default_language || 'en',
          participant_languages: JSON.stringify({ [currentUser?.id]: currentUser?.default_language || 'en' }),
          invite_code: code,
          invite_open: true,
          unread_counts: '{}',
          is_group: false,
        });
        try { await db.auth.updateMe({ invite_code: code }); } catch {}
      }
      const url = getInviteUrl(code);
      if (navigator.share) {
        await navigator.share({ title: 'Join me on Preter', text: 'Chat with me in any language, no barriers.', url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      title="Invite a friend"
      className="flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-medium transition-all hover:opacity-80"
      style={{ background: 'var(--accent-pink)', color: 'var(--primary)', border: '1px solid var(--card-border)' }}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Invite'}
    </button>
  );
}