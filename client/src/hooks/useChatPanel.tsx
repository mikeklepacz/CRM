import { createContext, useContext, useState, ReactNode } from 'react';
import { ChatPanelGlobal } from '@/components/chat-panel-global';

interface ChatPanelContextType {
  isPanelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
}

const ChatPanelContext = createContext<ChatPanelContextType | undefined>(undefined);

export function ChatPanelProvider({ children }: { children: ReactNode }) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const openPanel = () => setIsPanelOpen(true);
  const closePanel = () => setIsPanelOpen(false);
  const togglePanel = () => setIsPanelOpen(prev => !prev);

  return (
    <ChatPanelContext.Provider value={{ isPanelOpen, openPanel, closePanel, togglePanel }}>
      {children}
      <ChatPanelGlobal />
    </ChatPanelContext.Provider>
  );
}

export function useChatPanel() {
  const context = useContext(ChatPanelContext);
  if (!context) {
    throw new Error('useChatPanel must be used within ChatPanelProvider');
  }
  return context;
}
