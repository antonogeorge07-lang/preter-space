import { format, isToday, isYesterday } from 'date-fns';

export default function DateSeparator({ date }) {
  const d = new Date(date);
  let label;
  if (isToday(d)) label = 'Today';
  else if (isYesterday(d)) label = 'Yesterday';
  else label = format(d, 'MMMM d, yyyy');

  return (
    <div className="flex items-center gap-3 px-6 py-2">
      <div className="flex-1 h-px" style={{ background: 'var(--surface-border)' }} />
      <span className="text-[11px] font-medium px-3 py-1 rounded-full flex-shrink-0"
        style={{ color: 'var(--muted)', background: 'var(--glass-bg-subtle)', letterSpacing: '0.04em' }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: 'var(--surface-border)' }} />
    </div>
  );
}