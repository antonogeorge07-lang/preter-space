import { convexChat } from '@/lib/convexChat';

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
        await convexChat.createConversation({
          isGroup: false,
          creatorId: currentUser?.id,
          participantIds: [currentUser?.id].filter(Boolean),
          title: currentUser?.full_name || currentUser?.email || 'You',
          participantNames: [currentUser?.full_name || currentUser?.email || ''].filter(Boolean),
          participantLanguages: { [currentUser?.id]: currentUser?.default_language || 'en' },
          preferredLanguage: currentUser?.default_language || 'en',
          inviteCode: code,
          inviteOpen: true,
          unreadCounts: {},
        });
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