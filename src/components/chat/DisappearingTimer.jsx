import { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

export default function DisappearingTimer({ expiresAt, onExpired }) {
  const [timeLeft, setTimeLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    if (timeLeft <= 0) { onExpired?.(); return; }
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        if (next <= 0) { clearInterval(interval); onExpired?.(); return 0; }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (timeLeft <= 0) return null;

  const color = timeLeft <= 10 ? '#ef4444' : timeLeft <= 30 ? '#f59e0b' : 'var(--muted)';

  return (
    <span className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color }}>
      <Timer className="w-2.5 h-2.5" />
      {timeLeft}s
    </span>
  );
}