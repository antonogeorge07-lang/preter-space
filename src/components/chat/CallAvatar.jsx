import { useState } from 'react';
import { User } from 'lucide-react';

const isUrl = (v) => typeof v === 'string' && /^(https?:\/\/|data:image\/|blob:|\/)/i.test(v.trim());

/**
 * Renders a caller avatar safely: image URLs go into an <img>, short emoji
 * strings render as text, everything else falls back to an icon circle.
 * Prevents long avatar URLs from leaking into the UI as raw text.
 */
export default function CallAvatar({ avatar, name, className = '', iconClassName = 'w-1/2 h-1/2' }) {
  const [failed, setFailed] = useState(false);
  const value = typeof avatar === 'string' ? avatar.trim() : '';

  if (isUrl(value) && !failed) {
    return (
      <img
        src={value}
        alt={name || 'Caller avatar'}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${className} object-cover`}
      />
    );
  }

  // Short non-URL strings (emoji) are safe to show as-is.
  if (value && !isUrl(value) && [...value].length <= 3) {
    return <div className={className}>{value}</div>;
  }

  return (
    <div className={className}>
      <User className={`${iconClassName} text-white/80`} />
    </div>
  );
}
