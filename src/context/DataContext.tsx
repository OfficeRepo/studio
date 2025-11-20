'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export type ChatHistory = {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
};

interface DataContextType {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  chatHistories: ChatHistory[];
  currentChatId: string | null;
  saveCurrentChat: () => void;
  loadChat: (id: string) => void;
  deleteChat: (id: string) => void;
  startNewChat: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const CHAT_HISTORIES_KEY = 'dojogpt-chat-histories';
const CURRENT_CHAT_KEY = 'dojogpt-current-chat';

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load chat histories from localStorage on mount
  useEffect(() => {
    const savedHistories = localStorage.getItem(CHAT_HISTORIES_KEY);
    const savedCurrentId = localStorage.getItem(CURRENT_CHAT_KEY);
    
    if (savedHistories) {
      const parsed = JSON.parse(savedHistories);
      setChatHistories(parsed);
    }
    
    if (savedCurrentId) {
      setCurrentChatId(savedCurrentId);
      const histories = savedHistories ? JSON.parse(savedHistories) : [];
      const currentChat = histories.find((h: ChatHistory) => h.id === savedCurrentId);
      if (currentChat) {
        setMessages(currentChat.messages);
      }
    }
    
    setIsHydrated(true);
  }, []);

  // Save current chat to localStorage whenever messages change
  useEffect(() => {
    if (!isHydrated) return;
    
    if (messages.length > 0 && currentChatId) {
      const updatedHistories = chatHistories.map(h => 
        h.id === currentChatId 
          ? { ...h, messages, timestamp: Date.now(), title: generateChatTitle(messages) }
          : h
      );
      
      // If current chat doesn't exist, create it
      if (!chatHistories.find(h => h.id === currentChatId)) {
        updatedHistories.push({
          id: currentChatId,
          title: generateChatTitle(messages),
          messages,
          timestamp: Date.now(),
        });
      }
      
      setChatHistories(updatedHistories);
      localStorage.setItem(CHAT_HISTORIES_KEY, JSON.stringify(updatedHistories));
    }
  }, [messages, currentChatId, isHydrated]);

  const generateChatTitle = (msgs: Message[]): string => {
    const firstUserMessage = msgs.find(m => m.role === 'user');
    if (firstUserMessage) {
      return firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
    }
    return 'New Chat';
  };

  const saveCurrentChat = () => {
    if (messages.length === 0) return;
    
    const chatId = currentChatId || Date.now().toString();
    const newChat: ChatHistory = {
      id: chatId,
      title: generateChatTitle(messages),
      messages,
      timestamp: Date.now(),
    };
    
    const exists = chatHistories.find(h => h.id === chatId);
    const updatedHistories = exists
      ? chatHistories.map(h => h.id === chatId ? newChat : h)
      : [newChat, ...chatHistories];
    
    setChatHistories(updatedHistories);
    setCurrentChatId(chatId);
    localStorage.setItem(CHAT_HISTORIES_KEY, JSON.stringify(updatedHistories));
    localStorage.setItem(CURRENT_CHAT_KEY, chatId);
  };

  const loadChat = (id: string) => {
    const chat = chatHistories.find(h => h.id === id);
    if (chat) {
      setMessages(chat.messages);
      setCurrentChatId(id);
      localStorage.setItem(CURRENT_CHAT_KEY, id);
    }
  };

  const deleteChat = (id: string) => {
    const updatedHistories = chatHistories.filter(h => h.id !== id);
    setChatHistories(updatedHistories);
    localStorage.setItem(CHAT_HISTORIES_KEY, JSON.stringify(updatedHistories));
    
    if (currentChatId === id) {
      startNewChat();
    }
  };

  const startNewChat = () => {
    setMessages([]);
    const newChatId = Date.now().toString();
    setCurrentChatId(newChatId);
    localStorage.setItem(CURRENT_CHAT_KEY, newChatId);
  };

  const value = {
    messages,
    setMessages,
    chatHistories,
    currentChatId,
    saveCurrentChat,
    loadChat,
    deleteChat,
    startNewChat,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
