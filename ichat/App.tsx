import React, { useState, useEffect, useRef } from 'react';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import SettingsModal from './components/SettingsModal';
import Login from './components/Login';
import InstagramLayout from './components/InstagramLayout';
import InstagramFeed from './components/InstagramFeed';
import ReelsView from './components/ReelsView';
import SearchPane from './components/SearchPane';
import CreatePost from './components/CreatePost';
import NotificationsView from './components/NotificationsView';
import ProfileView from './components/ProfileView';
import { User, Chat, Message, MessageType, MessageStatus } from './types';
import { translateText, getBotResponse } from './services/geminiService';
import { getChats, getMessages, sendMessage, startDirectChat, getMe, acceptChat, deleteChat, sendReaction, updateProfile } from './services/api';
import { io, Socket } from 'socket.io-client';
import { getPrivateKey, importPublicKey, deriveSharedKey, encryptMessage, decryptMessage } from './services/encryption';
import { BOT_USER } from './constants';

const THEME_PRESETS: Record<string, any> = {
    formal: {
        primary: '#D97706',
        primaryLight: '#FEF3C7',
        primaryDark: '#B45309',
        primaryHover: '#F59E0B',
        secondary: '#1E293B',
        secondaryLight: '#334155',
    }
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState('home');
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  
  const [offlineQueue, setOfflineQueue] = useState<{chatId: string, content: string, type: MessageType, tempId: string, expiresAt?: Date}[]>(() => {
      try {
          const saved = localStorage.getItem('offlineQueue');
          return saved ? JSON.parse(saved) : [];
      } catch { return []; }
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [showSettings, setShowSettings] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('English');
  
  const [darkMode, setDarkMode] = useState<boolean>(() => {
      const saved = localStorage.getItem('theme');
      return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const sharedKeysCache = useRef<Record<string, CryptoKey>>({});
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  // Using any for socketRef to avoid complex and inconsistent type definitions for Socket.io client instances
  const socketRef = useRef<any>(null);

  useEffect(() => {
      if (darkMode) {
          document.documentElement.classList.add('dark');
          localStorage.setItem('theme', 'dark');
      } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('theme', 'light');
      }
  }, [darkMode]);

  useEffect(() => {
      const theme = THEME_PRESETS['formal'];
      const root = document.documentElement;
      root.style.setProperty('--theme-primary', theme.primary);
      root.style.setProperty('--theme-primary-light', theme.primaryLight);
      root.style.setProperty('--theme-primary-dark', theme.primaryDark);
      root.style.setProperty('--theme-primary-hover', theme.primaryHover);
      root.style.setProperty('--theme-secondary', theme.secondary);
      root.style.setProperty('--theme-secondary-light', theme.secondaryLight);
  }, [currentUser]);

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  useEffect(() => {
      localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      const processQueue = async () => {
        const queueToProcess = [...offlineQueue];
        for (const msg of queueToProcess) {
          try {
            await handleSendMessage(msg.chatId, msg.content, msg.type, msg.expiresAt, msg.tempId);
            setOfflineQueue(prev => prev.filter(m => m.tempId !== msg.tempId));
          } catch (e) {
            console.error("Failed to send queued message", e);
          }
        }
      };
      processQueue();
    }
  }, [isOnline]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      getMe().then(user => {
        setCurrentUser(user);
        setActiveProfileId(user.id);
        setIsAuthenticated(true);
        if (user.settings?.language) setTargetLanguage(user.settings.language);
        initializeRealtimeData(user);
      }).catch(() => {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      });
    }
  }, []);

  const handleNavigateToProfile = (userId: string) => {
      setActiveProfileId(userId);
      setView('profile');
  };

  const initializeRealtimeData = async (user: User) => {
    // Fixed type errors by casting the io options and instance to any to bypass version mismatches
    const socket = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    } as any);
    socketRef.current = socket;
    
    socket.emit('join_user', user.id);

    socket.on('receive_message', async (incomingMessage: Message) => {
      const decryptedMsg = await decryptMessageIfEncrypted(incomingMessage);
      handleReceiveRealtimeMessage(decryptedMsg);
    });

    socket.on('user_status', (data: any) => {
        setChats(prevChats => prevChats.map(chat => {
            const hasUser = chat.participants.some(p => p.id === data.userId);
            if (hasUser) {
                return {
                    ...chat,
                    participants: chat.participants.map(p => {
                        if (p.id === data.userId) {
                            return { ...p, isOnline: data.isOnline, lastSeen: data.lastSeen || p.lastSeen };
                        }
                        return p;
                    })
                };
            }
            return chat;
        }));
    });

    socket.on('messages_read', (data: any) => {
        if (data.userId !== user.id) {
            setMessages(prev => {
                const chatMsgs = prev[data.chatId];
                if (!chatMsgs) return prev;
                return {
                    ...prev,
                    [data.chatId]: chatMsgs.map(m => 
                        (m.senderId === user.id && m.status !== MessageStatus.READ) 
                        ? { ...m, status: MessageStatus.READ } 
                        : m
                    )
                };
            });
        }
    });

    try {
      const fetchedChats = await getChats();
      setChats(fetchedChats);
    } catch (err) {
      console.error("Failed to fetch chats", err);
    }
  };

  const handleReceiveRealtimeMessage = (message: any) => {
    setMessages(prev => {
      const chatMessages = prev[message.chatId] || [];
      if (chatMessages.some(m => m.id === message.id)) return prev;
      return {
        ...prev,
        [message.chatId]: [...chatMessages, message]
      };
    });

    setChats(prev => {
        const chatExists = prev.find(c => c.id === message.chatId);
        if (chatExists) {
            return prev.map(c => {
                if (c.id === message.chatId) {
                    return {
                        ...c,
                        lastMessage: message,
                        unreadCount: c.id !== selectedChatId ? (c.unreadCount || 0) + 1 : 0
                    };
                }
                return c;
            });
        } else {
            getChats().then(fetched => setChats(fetched));
            return prev;
        }
    });
  };

  const getSharedKeyForChat = async (chatId: string): Promise<CryptoKey | null> => {
      if (sharedKeysCache.current[chatId]) return sharedKeysCache.current[chatId];
      const chat = chats.find(c => c.id === chatId);
      if (!chat || chat.type !== 'direct') return null;
      const otherUser = chat.participants.find(p => p.id !== currentUser?.id);
      if (!otherUser || !otherUser.publicKey) return null;
      const myPrivateKey = await getPrivateKey();
      if (!myPrivateKey) return null;
      try {
          const otherPublicKey = await importPublicKey(otherUser.publicKey);
          const sharedKey = await deriveSharedKey(myPrivateKey, otherPublicKey);
          sharedKeysCache.current[chatId] = sharedKey;
          return sharedKey;
      } catch (e) {
          console.error("Key derivation failed", e);
          return null;
      }
  };

  const decryptMessageIfEncrypted = async (msg: Message): Promise<Message> => {
      if (msg.content && msg.content.startsWith('ENC:')) {
          const key = await getSharedKeyForChat(msg.chatId);
          if (key) {
              try {
                const decryptedContent = await decryptMessage(msg.content, key);
                return { ...msg, content: decryptedContent, isEncrypted: true };
              } catch (e) {
                  return { ...msg, content: "Message encrypted (Keys mismatched)", isEncrypted: true };
              }
          }
      }
      return msg;
  }

  useEffect(() => {
    if (selectedChatId) {
      socketRef.current?.emit('join_chat', selectedChatId);
      socketRef.current?.emit('mark_read', { chatId: selectedChatId, userId: currentUser?.id });
      
      getMessages(selectedChatId).then(async (msgs) => {
        const decryptedMessages = await Promise.all(msgs.map(m => decryptMessageIfEncrypted(m)));
        setMessages(prev => ({ ...prev, [selectedChatId]: decryptedMessages }));
      });
      setChats(prev => prev.map(c => c.id === selectedChatId ? { ...c, unreadCount: 0 } : c));
    }
  }, [selectedChatId]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveProfileId(user.id);
    setIsAuthenticated(true);
    initializeRealtimeData(user);
  };

  const handleUpdateProfile = async (name: string, avatar: string, language: string, timezone: string, themeColor: string) => {
    if (currentUser) {
        setCurrentUser({ ...currentUser, displayName: name, avatarUrl: avatar });
    }
  };

  const handleSendMessage = async (chatId: string, content: string, type: MessageType, expiresAt?: Date, existingTempId?: string) => {
    const chat = chats.find(c => c.id === chatId);
    const isBotChat = chat?.participants.some(p => p.id === BOT_USER.id);
    
    const tempId = existingTempId || `temp_${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      chatId,
      senderId: currentUser!.id,
      content,
      type,
      timestamp: new Date(),
      status: isOnline ? MessageStatus.SENT : MessageStatus.QUEUED,
      reactions: {},
      expiresAt: expiresAt,
      isEncrypted: chat?.type === 'direct' && !isBotChat
    };

    if (!existingTempId) {
      setMessages(prev => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), optimisticMessage]
      }));
      setChats(prev => prev.map(c => {
        if (c.id === chatId) return { ...c, lastMessage: optimisticMessage };
        return c;
      }));
    }

    if (!navigator.onLine) {
        if (!existingTempId) {
            setOfflineQueue(prev => [...prev, { chatId, content, type, tempId, expiresAt }]);
        }
        return; 
    }

    try {
      let finalContent = content;
      const key = await getSharedKeyForChat(chatId);
      if (key && type === MessageType.TEXT && !isBotChat) {
          finalContent = await encryptMessage(content, key);
      }

      const savedMessage = await sendMessage(chatId, finalContent, type, expiresAt);
      if (expiresAt) savedMessage.expiresAt = expiresAt;
      savedMessage.content = content; 
      savedMessage.isEncrypted = !!key && !isBotChat;

      const socketMessage = { ...savedMessage, content: finalContent };
      socketRef.current?.emit('send_message', socketMessage);

      setMessages(prev => ({
        ...prev,
        [chatId]: prev[chatId].map(m => m.id === tempId ? savedMessage : m)
      }));

      setChats(prev => prev.map(c => {
        if (c.id === chatId) return { ...c, lastMessage: savedMessage };
        return c;
      }));

      if (isBotChat && type === MessageType.TEXT) {
          setChats(prev => prev.map(c => c.id === chatId ? { ...c, isTyping: true } : c));
          try {
              const botReplyText = await getBotResponse(content);
              if (botReplyText) {
                  // Wait a bit to simulate thinking
                  await new Promise(r => setTimeout(r, 800));
                  // Bot sends message (backend handles the ID but we display it as bot)
                  const botMessage = await sendMessage(chatId, botReplyText, MessageType.TEXT);
                  setMessages(prev => ({
                      ...prev,
                      [chatId]: [...(prev[chatId] || []), { ...botMessage, senderId: BOT_USER.id }]
                  }));
              }
          } finally {
              setChats(prev => prev.map(c => c.id === chatId ? { ...c, isTyping: false } : c));
          }
      }

    } catch (error) {
      console.error("Failed to send message", error);
      setMessages(prev => ({
        ...prev,
        [chatId]: prev[chatId].map(m => m.id === tempId ? { ...m, status: MessageStatus.FAILED } : m)
      }));
    }
  };

  const handleStartChat = async (targetUser: User) => {
    try {
      const newChat = await startDirectChat(targetUser.id);
      setChats(prev => {
        if (prev.find(c => c.id === newChat.id)) return prev;
        return [newChat, ...prev];
      });
      setSelectedChatId(newChat.id);
      setShowNewMessageModal(false);
      setView('messages');
      
      // If bot chat, ensure greeting
      if (targetUser.id === BOT_USER.id) {
          const chatMsgs = messages[newChat.id] || [];
          if (chatMsgs.length === 0) {
              const greeting = "Hi there! I'm your Shadow AI Assistant. I can help you with translations, summaries, or just chat! How are you doing today? ✨";
              const fakeMsg = {
                  id: `bot_greet_${Date.now()}`,
                  chatId: newChat.id,
                  senderId: BOT_USER.id,
                  content: greeting,
                  type: MessageType.TEXT,
                  timestamp: new Date().toISOString(),
                  status: MessageStatus.SENT,
                  reactions: {}
              };
              setMessages(prev => ({ ...prev, [newChat.id]: [fakeMsg] }));
          }
      }
    } catch (error) {
      console.error("Error starting chat", error);
      alert("Failed to start chat. Check if backend is running.");
    }
  };

  const handleAcceptChat = async (chatId: string) => {
    try {
      await acceptChat(chatId);
      setChats(prev => prev.map(c => {
        if (c.id === chatId) return { ...c, isRequest: false };
        return c;
      }));
    } catch (error) {
      console.error("Failed to accept chat", error);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChat(chatId);
      setChats(prev => prev.filter(c => c.id !== chatId));
      if (selectedChatId === chatId) setSelectedChatId(null);
    } catch (error) {
      console.error("Failed to delete chat", error);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
      if (!currentUser || !selectedChatId) return;
      setMessages(prev => ({
          ...prev,
          [selectedChatId]: prev[selectedChatId].map(m => {
              if (m.id === messageId) {
                  const newReactions = { ...m.reactions };
                  if (newReactions[currentUser.id] === emoji) delete newReactions[currentUser.id];
                  else newReactions[currentUser.id] = emoji;
                  return { ...m, reactions: newReactions };
              }
              return m;
          })
      }));
      try { await sendReaction(selectedChatId, messageId, emoji); } catch (e) { console.error("Failed to react", e); }
  };

  const handleTranslateMessage = async (message: Message) => {
    if (!selectedChatId) return;
    const translation = await translateText(message.content, targetLanguage);
    setMessages(prev => ({
      ...prev,
      [selectedChatId]: prev[selectedChatId].map(m => {
        if (m.id === message.id) return { ...m, translation };
        return m;
      })
    }));
  };

  if (!isAuthenticated) return <Login onLogin={handleLogin} />;

  const renderContent = () => {
      if (view === 'home') return <InstagramFeed onNavigateToProfile={handleNavigateToProfile} />;
      if (view === 'search') return <SearchPane onNavigateToProfile={handleNavigateToProfile} />;
      if (view === 'reels') return <ReelsView onNavigateToProfile={handleNavigateToProfile} />;
      if (view === 'notifications') return <NotificationsView />;
      if (view === 'create') return <CreatePost onBack={() => setView('home')} onPostCreated={() => { setActiveProfileId(currentUser!.id); setView('profile'); }} />;
      if (view === 'profile') return <ProfileView userId={activeProfileId || currentUser!.id} onOpenSettings={() => setShowSettings(true)} />;
      
      if (view === 'messages') {
          const selectedChat = chats.find(c => c.id === selectedChatId);
          return (
            <div className="flex h-full w-full overflow-hidden relative">
                <div className={`${selectedChatId ? 'hidden md:flex' : 'flex'} w-full md:w-[350px] lg:w-[400px] flex-col h-full z-10 border-r border-gray-200 dark:border-zinc-800`}>
                    <ChatList
                        chats={chats}
                        users={[]} 
                        currentUser={currentUser!}
                        activeChatId={selectedChatId}
                        onSelectChat={(chat) => setSelectedChatId(chat.id)}
                        onStartChat={handleStartChat}
                        showNewMessageModal={showNewMessageModal}
                        setShowNewMessageModal={setShowNewMessageModal}
                        onOpenSettings={() => setShowSettings(true)}
                    />
                </div>

                <div className={`flex-1 h-full bg-white dark:bg-black relative ${!selectedChatId ? 'hidden md:flex' : 'flex'}`}>
                    {selectedChat ? (
                    <div className="flex flex-col w-full h-full">
                        <div className="md:hidden absolute top-3 left-2 z-20">
                            <button onClick={() => setSelectedChatId(null)} className="p-2 bg-white/80 dark:bg-black/50 rounded-full shadow-sm text-black dark:text-white">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                            </button>
                        </div>
                        <ChatWindow
                            chat={selectedChat}
                            currentUser={currentUser!}
                            messages={messages[selectedChat.id] || []}
                            onSendMessage={(chatId, content, type, expiresAt) => handleSendMessage(chatId, content, type, expiresAt)}
                            onReaction={handleReaction}
                            onDeleteChat={handleDeleteChat}
                            onAcceptChat={handleAcceptChat}
                            onTranslate={handleTranslateMessage}
                        />
                    </div>
                    ) : (
                    <div className="flex flex-col items-center justify-center h-full w-full text-center p-8 bg-white dark:bg-black">
                        <div className="w-24 h-24 rounded-full border-2 border-black dark:border-white flex items-center justify-center mb-4">
                            <svg className="w-12 h-12 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                        </div>
                        <h2 className="text-xl font-light text-black dark:text-white mb-2">Your Messages</h2>
                        <p className="text-gray-500 text-sm mb-6">Send private photos and messages to a friend or group.</p>
                        <button onClick={() => setShowNewMessageModal(true)} className="bg-gold hover:bg-gold-hover text-white px-4 py-1.5 rounded-[4px] text-sm font-semibold">Send Message</button>
                    </div>
                    )}
                </div>
            </div>
          );
      }
      return null;
  };

  return (
    <InstagramLayout 
        onNavigate={(v) => { 
            if (v === 'profile') setActiveProfileId(currentUser!.id);
            setView(v); 
        }} 
        currentView={view} 
        currentUser={currentUser}
        unreadCount={chats.reduce((acc, chat) => acc + (chat.unreadCount || 0), 0)}
        onOpenSettings={() => setShowSettings(true)}
    >
        {renderContent()}
        
        {showSettings && (
            <SettingsModal
                onClose={() => setShowSettings(false)}
                currentUser={currentUser!}
                targetLanguage={targetLanguage}
                onUpdateProfile={handleUpdateProfile}
                darkMode={darkMode}
                onToggleTheme={() => setDarkMode(!darkMode)}
            />
        )}
    </InstagramLayout>
  );
};

export default App;