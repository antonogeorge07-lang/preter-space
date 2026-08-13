import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Globe, Images, Phone, Video, Search, X, MoreVertical, Users } from 'lucide-react';
import TextMessage from '@/components/chat/TextMessage';
import SwipeableMessage from '@/components/chat/SwipeableMessage';
import VoiceNoteBubble from '@/components/chat/VoiceNoteBubble';
import VideoMessageBubble from '@/components/chat/VideoMessageBubble';
import MessageInput from '@/components/chat/MessageInput';
import LanguageSettings from '@/components/chat/LanguageSettings';
import ThemeToggle from '@/components/chat/ThemeToggle';
import TypingIndicator from '@/components/chat/TypingIndicator.jsx';
import SmartReplies from '@/components/chat/SmartReplies';
import ConversationSummary from '@/components/chat/ConversationSummary';
import MediaGallery from '@/components/chat/MediaGallery';
import { LANG_MAP as LANG_MAP_CODES } from '@/lib/translation';
import NeuralTrustBadge from '@/components/chat/NeuralTrustBadge';
import DateSeparator from '@/components/chat/DateSeparator';
import ImageLightbox from '@/components/chat/ImageLightbox';
import GroupManageModal from '@/components/chat/GroupManageModal';
import FileAttachmentBubble from '@/components/chat/FileAttachmentBubble';
import ContactProfileModal from '@/components/chat/ContactProfileModal';

const LANG_MAP = Object.fromEntries(Object.entries(LANG_MAP_CODES).map(([code, name]) => [name, code]));
const LANG_NAMES = LANG_MAP_CODES;

export default function ChatView({
  conversation, messages, currentUser, myLang,
  onSendMessage, onTyping, onStartRecording, onStartVideo, onImageSend, onFileSend,
  isProcessing, onBack, onLanguageChange, onDeleteMessage, onEditMessage, onStartCall,
  replyTo, onSetReplyTo, onCancelReply, othersTyping = [], onReaction, contactPresence,
}) {
  const messagesEndRef = useRef(null);
  const [langSettingsOpen, setLangSettingsOpen] = useState(false);
  const [showSmartReplies, setShowSmartReplies] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sendError, setSendError] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [groupManageOpen, setGroupManageOpen] = useState(false);
  const [contactProfileUserId, setContactProfileUserId] = useState(null);
  const moreMenuRef = useRef(null);

  useEffect(() => {
    if (!showMoreMenu) return;
    const handler = (e) => { if (!moreMenuRef.current?.contains(e.target)) setShowMoreMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMoreMenu]);

  const preferredLang = myLang || conversation?.preferred_language || 'en';
  const smartRepliesVisible = showSmartReplies && messages.length > 0 && !isProcessing;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, othersTyping]);

  const handleLanguageSelect = (langName) => {
    const code = LANG_MAP[langName] || 'en';
    if (onLanguageChange) onLanguageChange(code);
  };

  const handleReplyTo = (msg) => {
    if (onSetReplyTo) onSetReplyTo({ id: msg.id, content: msg.content || '[media]', sender_name: msg.sender_name || (msg.sender === 'me' ? 'You' : conversation?.participant_name) });
  };

  return (
    <div className="flex flex-col h-full w-full min-w-0 overflow-hidden">
      {/* Header */}
      <div className="min-h-14 sm:min-h-16 border-b px-3 sm:px-4 flex items-center gap-2 sm:gap-3 z-10 flex-shrink-0 glass-panel" style={{ background: 'var(--header-bg)', borderColor: 'var(--header-border)' }}>
        <button onClick={onBack} className="lg:hidden p-2 rounded-xl hover:bg-black/5 transition-colors flex-shrink-0">
          <ArrowLeft className="w-5 h-5 text-foreground/60" />
        </button>
        <button
          onClick={() => {
            if (!conversation?.is_group) {
              const otherId = (conversation?.participant_ids || []).find(id => id !== currentUser?.id);
              if (otherId) setContactProfileUserId(otherId);
            } else {
              setGroupManageOpen(true);
            }
          }}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold overflow-hidden hover:opacity-80 transition-opacity"
          style={{ background: 'var(--glass-border)', color: 'var(--primary)' }}>
          {conversation?.participant_avatar
            ? <img src={conversation.participant_avatar} className="w-full h-full object-cover" alt="" />
            : conversation?.is_group
              ? <Users className="w-4 h-4" />
              : conversation?.participant_name?.[0]?.toUpperCase()}
        </button>
        <div className="flex-1 min-w-0">
          <h2
            className="font-semibold text-base text-foreground truncate cursor-pointer hover:opacity-70 transition-opacity"
            onClick={() => {
              if (!conversation?.is_group) {
                const otherId = (conversation?.participant_ids || []).find(id => id !== currentUser?.id);
                if (otherId) setContactProfileUserId(otherId);
              }
            }}
          >{conversation?.participant_name}</h2>
          <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
            {othersTyping.length > 0 ? (
              <span>typing...</span>
            ) : contactPresence === 'online' ? (
              <><span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0 inline-block" /><span>Online</span></>
            ) : contactPresence ? (
              <span>Last seen {contactPresence}</span>
            ) : conversation?.is_group ? (
              <button onClick={() => setGroupManageOpen(true)} className="flex items-center gap-1 hover:opacity-70 transition-opacity">
                <Users className="w-3 h-3" />
                {(conversation?.participant_ids || []).length} members
              </button>
            ) : (
              LANG_NAMES[preferredLang] || 'English'
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <ThemeToggle />
          <button onClick={() => setLangSettingsOpen(true)} className="p-2 rounded-xl hover:bg-black/5 transition-colors text-foreground/50" title="Language">
            <Globe className="w-4 h-4" />
          </button>
          {onStartCall && (
            <>
              <button onClick={() => onStartCall('audio')} className="p-2 rounded-xl hover:bg-black/5 transition-colors text-foreground/50" title="Voice call">
                <Phone className="w-4 h-4" />
              </button>
              <button onClick={() => onStartCall('video')} className="p-2 rounded-xl hover:bg-black/5 transition-colors text-foreground/50" title="Video call">
                <Video className="w-4 h-4" />
              </button>
            </>
          )}
          <button onClick={() => setShowSearch(v => !v)} className="p-2 rounded-xl hover:bg-black/5 transition-colors text-foreground/50" title="Search">
            <Search className="w-4 h-4" />
          </button>
          <button onClick={() => setGalleryOpen(true)} className="hidden md:flex p-2 rounded-xl hover:bg-black/5 transition-colors text-foreground/50" title="Media">
            <Images className="w-4 h-4" />
          </button>
          <ConversationSummary messages={messages} targetLangCode={preferredLang} />
          <button onClick={() => setShowSmartReplies(v => !v)}
            className={`flex p-2 rounded-xl transition-colors text-foreground/50 hover:bg-black/5 ${showSmartReplies ? 'text-foreground' : ''}`}
            title="Smart replies">
            <span>✨</span>
          </button>
          <div className="relative" ref={moreMenuRef}>
            <button onClick={() => setShowMoreMenu(v => !v)}
              className="p-2 rounded-xl hover:bg-black/5 transition-colors text-foreground/50" title="More">
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1 z-30 rounded-2xl border shadow-xl overflow-hidden"
                style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)', minWidth: 160 }}>
                <button onClick={() => { setShowMoreMenu(false); alert('Reported. We will review this conversation.'); }}
                  className="w-full px-4 py-3 text-sm text-left hover:bg-black/5 transition-colors" style={{ color: 'var(--foreground)' }}>
                  Report conversation
                </button>
                <button onClick={() => { setShowMoreMenu(false); alert('Contact blocked.'); }}
                  className="w-full px-4 py-3 text-sm text-left hover:bg-red-50 transition-colors text-red-500">
                  Block contact
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid var(--header-border)', background: 'var(--header-bg)' }}>
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search messages..." className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none" />
            {searchQuery && <button onClick={() => setSearchQuery('')}><X className="w-4 h-4 text-muted-foreground" /></button>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-8 overscroll-contain">
        <AnimatePresence initial={false}>
          {(() => {
            const filtered = messages.filter(msg => !searchQuery || (msg.content?.toLowerCase().includes(searchQuery.toLowerCase())) || (msg.translated_content?.toLowerCase().includes(searchQuery.toLowerCase())));
            const result = [];
            let lastDate = null;
            filtered.forEach((msg) => {
              const msgDate = msg.created_date ? new Date(msg.created_date).toDateString() : null;
              if (msgDate && msgDate !== lastDate) {
                result.push(<DateSeparator key={`sep-${msgDate}`} date={msg.created_date} />);
                lastDate = msgDate;
              }
              result.push(msg);
            });
            return result;
          })().map((item) => {
            // DateSeparator elements pass through directly
            if (item && !item.id) return item;
            const msg = item;
            // Deleted message
            if (msg.deleted) {
              return (
                <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'} px-4`}>
                  <span className="text-xs italic text-muted-foreground/50 px-4 py-2 rounded-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                    This message was deleted
                  </span>
                </div>
              );
            }
            // Only show "translating" for my own outgoing messages that haven't been translated yet
            const isTranslating = msg.sender === 'me' && !msg.deleted && !msg.translated_content && msg.type === 'text' && !!msg.id;

            if (msg.type === 'voice') return <VoiceNoteBubble key={msg.id} message={msg} preferredLang={preferredLang} />;
            if (msg.type === 'video') return <VideoMessageBubble key={msg.id} message={msg} preferredLang={preferredLang} />;
            if (msg.type === 'file') return <FileAttachmentBubble key={msg.id} message={msg} />;
            if (msg.type === 'image') return (
              <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'} px-3`}>
                <div className="flex flex-col gap-1">
                  {msg.reply_to_id && <ReplyPreview content={msg.reply_to_content} sender={msg.reply_to_sender} isMe={msg.sender === 'me'} />}
                  <img src={msg.image_url} alt="shared" className="max-w-[60%] rounded-2xl shadow-xl object-cover cursor-pointer hover:opacity-90 transition-opacity" style={{ border: '2px solid var(--card-border)' }}
                    onClick={() => setLightboxSrc(msg.image_url)} />
                </div>
              </div>
            );
            return (
              <SwipeableMessage key={msg.id} isMe={msg.sender === 'me'} onReply={() => handleReplyTo(msg)}>
                <TextMessage message={msg} preferredLang={preferredLang}
                  isTranslating={isTranslating} onDelete={onDeleteMessage} onEdit={onEditMessage} onReply={handleReplyTo}
                  onReaction={onReaction} currentUserId={currentUser?.id} />
              </SwipeableMessage>
            );
          })}
        </AnimatePresence>

        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full pt-20">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--card-bg)' }}>
                <span className="text-2xl">💬</span>
              </div>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Send a message to start translating</p>
            </div>
          </div>
        )}

        <AnimatePresence>
          {othersTyping.length > 0 && (
            <TypingIndicator key="typing" name={conversation?.participant_name} />
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <SmartReplies
        messages={messages}
        targetLangCode={preferredLang}
        visible={smartRepliesVisible}
        onSelect={(reply) => { onSendMessage(reply); setShowSmartReplies(false); }}
      />

      {sendError && (
        <div className="px-4 py-2 text-xs text-red-500 text-center bg-red-50/80 border-t border-red-100">
          {sendError}
        </div>
      )}

      <NeuralTrustBadge />
      <MessageInput
        onSend={async (text, expiresAt) => {
          setSendError('');
          try { await onSendMessage(text, expiresAt); }
          catch { setSendError('Message failed to send. Please try again.'); setTimeout(() => setSendError(''), 4000); }
        }}
        onTyping={onTyping}
        onStartRecording={onStartRecording}
        onStartVideo={onStartVideo}
        onImageSend={onImageSend}
        onFileSend={onFileSend}
        isProcessing={isProcessing}
        replyTo={replyTo}
        onCancelReply={onCancelReply}
      />

      <LanguageSettings
        isOpen={langSettingsOpen}
        onClose={() => setLangSettingsOpen(false)}
        preferredLang={LANG_NAMES[preferredLang] || 'English'}
        onSelectLang={handleLanguageSelect}
      />

      <MediaGallery
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        messages={messages}
        conversationName={conversation?.participant_name}
      />

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      <ContactProfileModal
        userId={contactProfileUserId}
        onClose={() => setContactProfileUserId(null)}
      />

      <GroupManageModal
        isOpen={groupManageOpen}
        onClose={() => setGroupManageOpen(false)}
        conversation={conversation}
        currentUser={currentUser}
      />
    </div>
  );
}

function ReplyPreview({ content, sender, isMe }) {
  return (
    <div className="px-3 py-1.5 rounded-xl border-l-4 text-xs opacity-70" style={{ background: 'var(--glass-bg-subtle)', borderColor: 'var(--primary)' }}>
      <span className="font-semibold block">{sender}</span>
      <span className="truncate block max-w-[200px]">{content}</span>
    </div>
  );
}