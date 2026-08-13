import { MessageSquare, Settings } from 'lucide-react';

export default function BottomTabBar({ activeTab, onChatsClick, onSettingsClick }) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t"
      style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(24px)', borderColor: 'var(--surface-border)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <button
        onClick={onChatsClick}
        style={{ userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
        className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all ${activeTab === 'chats' ? 'text-primary' : 'text-muted-foreground'}`}
      >
        <MessageSquare className="w-5 h-5" />
        <span className="text-[10px] font-medium">Chats</span>
      </button>
      <button
        onClick={onSettingsClick}
        style={{ userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
        className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all ${activeTab === 'settings' ? 'text-primary' : 'text-muted-foreground'}`}
      >
        <Settings className="w-5 h-5" />
        <span className="text-[10px] font-medium">Settings</span>
      </button>
    </div>
  );
}