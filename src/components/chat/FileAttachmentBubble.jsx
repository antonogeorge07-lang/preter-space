import { FileText, FileArchive, File, Download } from 'lucide-react';

function getFileIcon(mimeType = '') {
  const props = { className: 'w-5 h-5', style: { color: 'var(--primary)' } };
  if (mimeType.includes('pdf')) return <FileText {...props} />;
  if (mimeType.includes('word') || mimeType.includes('officedocument')) return <FileText {...props} />;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return <FileArchive {...props} />;
  return <File {...props} />;
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileAttachmentBubble({ message }) {
  const isMe = message.sender === 'me';

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} px-4 sm:px-6 w-full`}>
      <a
        href={message.file_url}
        download={message.file_name}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 px-4 py-3 rounded-2xl max-w-[260px] transition-opacity hover:opacity-80 active:opacity-70"
        style={{
          background: isMe ? 'var(--bubble-outgoing)' : 'var(--bubble-incoming)',
          border: '1px solid var(--card-border)',
          textDecoration: 'none',
        }}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent-pink)' }}>
          {getFileIcon(message.file_name?.split('.').pop())}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate font-heading" style={{ color: 'var(--foreground)' }}>
            {message.file_name || 'File'}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
            {formatSize(message.file_size)} · tap to download
          </p>
        </div>
        <Download className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--primary)' }} />
      </a>
    </div>
  );
}