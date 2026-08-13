import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, UserCircle, Pin, Archive, Users, BellOff, SearchIcon } from 'lucide-react';
import { useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import ConversationContextMenu from '@/components/chat/ConversationContextMenu';
import NewConversationModal from '@/components/chat/NewConversationModal';
import PullToRefresh from '@/components/chat/PullToRefresh';
import InviteButton from '@/components/chat/InviteButton';

function formatTime(dateStr) {
  if (!dateStr) return '';
  try { return formatDistanceToNowStrict(new Date(dateStr), { addSuffix: false }).replace(' minutes', 'm').replace(' minute', 'm').replace(' hours', 'h').replace(' hour', 'h').replace(' days', 'd').replace(' day', 'd'); }
  catch { return ''; }
}

export default function ConversationList({ conversations, activeId, onSelect, isOpen, onClose, onPin, onArchive, onDeleteConversation, onMuteConversation, onBlockReport, onProfileClick, onNewConversation, onRefresh, onSearchOpen, onFindPeople, currentUser }) {
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [contextMenu, setContextMenu] = useState({ open: false, conv: null, x: 0, y: 0 });
  const [newModalOpen, setNewModalOpen] = useState(false);

  const handleContextMenu = (e, conv) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(e.clientX, window.innerWidth - 180);
    const y = Math.min(rect.bottom + 4, window.innerHeight - 140);
    setContextMenu({ open: true, conv, x, y });
  };

  const filtered = conversations
    .filter(c => {
      const matchSearch = c.participant_name?.toLowerCase().includes(search.toLowerCase());
      const matchArchived = showArchived ? c.archived : !c.archived;
      return matchSearch && matchArchived;
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <aside className={`
        fixed lg:relative z-50 lg:z-auto
        w-[80vw] sm:w-64 md:w-72 h-[100dvh] flex flex-col
        border-r transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `} style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)' }}>
        {/* Header */}
        <div className="p-4 sm:p-5" style={{ borderBottom: '1px solid var(--surface-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-heading font-semibold" style={{ color: 'var(--primary)' }}>Preter</h1>
            <div className="flex items-center gap-1">
              {onSearchOpen && (
                <button onClick={onSearchOpen} className="p-2 rounded-xl hover:bg-black/5 transition-colors" title="Search all chats">
                  <SearchIcon className="w-5 h-5 text-foreground/40" />
                </button>
              )}
              <button onClick={onProfileClick} className="p-2 rounded-xl hover:bg-black/5 transition-colors" title="Profile">
                <UserCircle className="w-5 h-5 text-foreground/40" />
              </button>
              <button onClick={onClose} className="lg:hidden p-2 rounded-xl hover:bg-black/5 transition-colors">
                <X className="w-5 h-5 text-foreground/40" />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--foreground)' }}
            />
          </div>

          {/* Archive toggle */}
          <div className="flex gap-2 mt-3">
            <button onClick={() => setShowArchived(false)}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={!showArchived ? { background: 'var(--accent-pink)', color: 'var(--primary)' } : { color: 'var(--muted)' }}>
              Active
            </button>
            <button onClick={() => setShowArchived(true)}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1"
              style={showArchived ? { background: 'var(--accent-pink)', color: 'var(--primary)' } : { color: 'var(--muted)' }}>
              <Archive className="w-3 h-3" />
              Archived
            </button>
          </div>
        </div>

        {/* Conversation list */}
        <PullToRefresh onRefresh={onRefresh || (() => Promise.resolve())}>
        <div className="px-2 sm:px-3 py-2 space-y-0.5 overflow-y-auto flex-1" style={{ maxHeight: 'calc(100dvh - 215px)' }}>
          <AnimatePresence initial={false}>
            {filtered.map((conv) => (
              <motion.div
                key={conv.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20, height: 0 }}
                className="relative group"
              >
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { onSelect(conv); onClose(); }}
                  onContextMenu={(e) => handleContextMenu(e, conv)}
                  className="w-full p-3 rounded-xl text-left transition-all duration-150"
                  style={activeId === conv.id
                    ? { background: 'var(--card-bg)', border: '1px solid var(--card-border)' }
                    : { background: 'transparent', border: '1px solid transparent' }}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold overflow-hidden"
                        style={{ background: 'var(--glass-border)', color: 'var(--primary)' }}>
                        {conv.is_group
                          ? <Users className="w-4 h-4" />
                          : conv.participant_name?.[0]?.toUpperCase()}
                      </div>
                      {conv.pinned && (
                        <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                          style={{ background: 'var(--accent-pink)' }}>
                          <Pin className="w-2 h-2" style={{ color: 'var(--primary)' }} />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{conv.participant_name}</span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {conv.muted && <BellOff className="w-2.5 h-2.5" style={{ color: 'var(--muted)' }} />}
                          <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{formatTime(conv.last_message_time)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-0.5 gap-1">
                        <span className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                          {conv.last_message_preview || 'No messages yet'}
                        </span>
                        {conv.unread_count > 0 && (
                          <span className="ml-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0"
                            style={{ background: 'var(--primary)', color: 'var(--paper)' }}>
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleContextMenu(e, conv)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-black/5 transition-all flex-shrink-0 hidden sm:flex"
                      style={{ color: 'var(--muted)' }}>
                      <span className="text-base leading-none">⋯</span>
                    </button>
                  </div>
                </motion.button>
              </motion.div>
            ))}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-sm" style={{ color: 'var(--muted)' }}>
              {showArchived ? 'No archived conversations' : 'No conversations found'}
            </div>
          )}
        </div>
        </PullToRefresh>

        {/* Footer */}
        <div className="p-3 mt-auto flex-shrink-0" style={{ borderTop: '1px solid var(--surface-border)' }}>
          <button
            onClick={() => setNewModalOpen(true)}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 hover:opacity-80"
            style={{ background: 'var(--primary)', color: 'var(--paper)' }}
          >
            + New Conversation
          </button>
          {onFindPeople && (
            <button
              onClick={onFindPeople}
              className="w-full py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80 mt-1.5 flex items-center justify-center gap-1.5"
              style={{ color: 'var(--muted)', border: '1px solid var(--surface-border)' }}
            >
              <Users className="w-3.5 h-3.5" /> Find People
            </button>
          )}
          <div className="mt-1.5">
            <InviteButton currentUser={currentUser} />
          </div>
        </div>
      </aside>

      <NewConversationModal
        isOpen={newModalOpen}
        onClose={() => { setNewModalOpen(false); onClose(); }}
        currentUser={currentUser}
        onCreate={async (data) => {
          if (onNewConversation) return await onNewConversation(data);
        }}
      />

      <ConversationContextMenu
        isOpen={contextMenu.open}
        position={{ x: contextMenu.x, y: contextMenu.y }}
        conversation={contextMenu.conv}
        onPin={onPin}
        onArchive={onArchive}
        onDelete={onDeleteConversation}
        onMute={onMuteConversation}
        onBlockReport={onBlockReport}
        onClose={() => setContextMenu(m => ({ ...m, open: false }))}
      />
    </>
  );
}