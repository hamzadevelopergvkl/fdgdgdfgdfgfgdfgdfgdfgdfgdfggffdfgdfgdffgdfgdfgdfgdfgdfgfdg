import React, { useState, useEffect } from 'react';
import { Chat, User, MessageStatus } from '../types';
import { SquarePen, X, Search, Sparkles } from 'lucide-react';
import { searchUsers } from '../services/api';
import { BOT_USER } from '../constants';

interface ChatListProps {
  chats: Chat[];
  users: User[]; 
  currentUser: User;
  activeChatId: string | null;
  onSelectChat: (chat: Chat) => void;
  onStartChat: (user: User) => void;
  showNewMessageModal: boolean;
  setShowNewMessageModal: (show: boolean) => void;
  onOpenSettings: () => void; 
}

const ChatList: React.FC<ChatListProps> = ({ 
    chats, 
    currentUser, 
    activeChatId, 
    onSelectChat, 
    onStartChat,
    showNewMessageModal,
    setShowNewMessageModal,
}) => {
  const [activeTab, setActiveTab] = useState<'messages' | 'requests'>('messages');
  const [modalSearch, setModalSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (showNewMessageModal) {
        if (modalSearch.trim().length > 1) {
            setSearching(true);
            const timer = setTimeout(async () => {
                try {
                    const results = await searchUsers(modalSearch);
                    const botMatches = BOT_USER.username.includes(modalSearch.toLowerCase()) || 
                                     BOT_USER.displayName.toLowerCase().includes(modalSearch.toLowerCase());
                    
                    setSearchResults(botMatches ? [BOT_USER, ...results] : results);
                } catch (e) {
                    console.error(e);
                } finally {
                    setSearching(false);
                }
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setSearchResults([BOT_USER]);
        }
    }
  }, [modalSearch, showNewMessageModal]);

  const getChatName = (chat: Chat) => {
    if (chat.type === 'group' && chat.name) return chat.name;
    const otherParticipant = chat.participants.find(p => p.id !== currentUser.id);
    return otherParticipant?.displayName || 'Unknown';
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.type === 'group') return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(chat.name || 'G');
    const otherParticipant = chat.participants.find(p => p.id !== currentUser.id);
    return otherParticipant?.avatarUrl || 'https://via.placeholder.com/40';
  };

  const filteredChats = chats.filter(chat => activeTab === 'requests' ? chat.isRequest : !chat.isRequest);

  return (
    <div className="flex flex-col h-full bg-cream dark:bg-black border-r border-gray-200 dark:border-zinc-800 relative transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <h2 className="text-2xl font-serif text-navy dark:text-white font-bold">Messages</h2>
        <div className="flex items-center space-x-2">
            <button 
                onClick={(e) => { e.stopPropagation(); onStartChat(BOT_USER); }}
                className="relative z-20 p-2 bg-navy dark:bg-zinc-800 text-gold rounded-full shadow-lg hover:bg-navy-light transition-colors active:scale-95"
                title="Chat with AI"
            >
                <Sparkles size={20} />
            </button>
            <button 
                onClick={() => setShowNewMessageModal(true)}
                className="relative z-20 p-2 bg-gold text-white rounded-full shadow-lg hover:bg-gold-hover transition-colors active:scale-95"
                title="New Message"
            >
                <SquarePen size={20} />
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 mb-4">
          <div className="flex p-1 bg-gray-200 dark:bg-zinc-800 rounded-xl">
             <button 
                onClick={() => setActiveTab('messages')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'messages' ? 'bg-white dark:bg-zinc-700 shadow-sm text-navy dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
             >
                Chats
             </button>
             <button 
                onClick={() => setActiveTab('requests')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'requests' ? 'bg-white dark:bg-zinc-700 shadow-sm text-navy dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
             >
                Requests
                {chats.some(c => c.isRequest && c.unreadCount > 0) && <span className="ml-1 text-red-500">•</span>}
             </button>
          </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        {filteredChats.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                 <p className="text-sm">No conversations yet</p>
                 <button onClick={() => onStartChat(BOT_USER)} className="mt-4 text-gold text-xs font-bold uppercase tracking-widest hover:underline flex items-center">
                    <Sparkles size={12} className="mr-1" /> Try AI Assistant
                 </button>
             </div>
        ) : (
            filteredChats.map(chat => {
            const isActive = chat.id === activeChatId;
            const name = getChatName(chat);
            const avatar = getChatAvatar(chat);
            const lastMsg = chat.lastMessage?.content || 'Started a chat';
            const isUnread = chat.unreadCount > 0;
            const isBotChat = chat.participants.some(p => p.id === BOT_USER.id);

            return (
                <div 
                key={chat.id}
                onClick={() => onSelectChat(chat)}
                className={`flex items-center px-3 py-3 rounded-2xl cursor-pointer transition-all duration-200 ${isActive ? 'bg-white dark:bg-zinc-900 shadow-sm' : 'hover:bg-white/50 dark:hover:bg-zinc-900/50'}`}
                >
                <div className="relative mr-4">
                    <img src={avatar} alt={name} className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-zinc-800 shadow-sm" />
                    {isBotChat ? (
                        <span className="absolute bottom-0 right-0 w-4 h-4 bg-navy dark:bg-gold text-white dark:text-navy rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center">
                            <Sparkles size={8} />
                        </span>
                    ) : (
                        chat.participants.some(p => p.id !== currentUser.id && p.isOnline) && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full"></span>
                        )
                    )}
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                        <h3 className={`text-sm truncate text-navy dark:text-white ${isUnread ? 'font-bold' : 'font-medium'}`}>{name}</h3>
                        {chat.lastMessage && <span className="text-[10px] text-gray-400">{new Date(chat.lastMessage.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>}
                    </div>
                    <div className="flex justify-between items-center">
                        <p className={`text-xs truncate pr-2 ${isUnread ? 'text-navy dark:text-white font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                            {chat.isTyping ? <span className="text-gold italic">Typing...</span> : (lastMsg.startsWith('http') ? 'Sent a photo' : lastMsg)}
                        </p>
                        {isUnread && <div className="w-2 h-2 bg-gold rounded-full shadow-lg shadow-gold/50"></div>}
                    </div>
                </div>
                </div>
            );
            })
        )}
      </div>

      {/* Modal */}
      {showNewMessageModal && (
          <div className="absolute inset-0 bg-cream/95 dark:bg-black/95 z-50 flex flex-col backdrop-blur-md animate-in fade-in slide-in-from-bottom-5">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-zinc-800">
                  <h3 className="font-bold text-navy dark:text-white text-lg">New Message</h3>
                  <button onClick={() => setShowNewMessageModal(false)} className="p-2 bg-gray-200 dark:bg-zinc-800 rounded-full text-navy dark:text-white hover:bg-gray-300 dark:hover:bg-zinc-700">
                      <X size={20} />
                  </button>
              </div>
              
              <div className="p-4">
                  <div className="flex items-center bg-white dark:bg-zinc-900 rounded-xl px-4 py-3 shadow-sm border border-gray-100 dark:border-zinc-800">
                      <Search size={18} className="text-gray-400 mr-2" />
                      <input 
                          type="text" 
                          className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-navy dark:text-white placeholder-gray-400 outline-none"
                          placeholder="Search people..."
                          value={modalSearch}
                          onChange={(e) => setModalSearch(e.target.value)}
                          autoFocus
                      />
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto px-2">
                  <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Suggestions</div>
                  {searchResults.map(user => (
                    <div 
                        key={user.id}
                        onClick={() => onStartChat(user)}
                        className="flex items-center px-4 py-3 rounded-xl cursor-pointer hover:bg-white/50 dark:hover:bg-zinc-900 transition-colors"
                    >
                        <img src={user.avatarUrl || 'https://via.placeholder.com/40'} alt={user.username} className="w-12 h-12 rounded-full object-cover mr-4 shadow-sm" />
                        <div>
                            <h4 className="font-bold text-sm text-navy dark:text-white flex items-center">
                                {user.displayName}
                                {user.id === BOT_USER.id && <Sparkles size={12} className="ml-1 text-gold" />}
                            </h4>
                            <p className="text-gray-500 dark:text-gray-400 text-xs">@{user.username}</p>
                        </div>
                    </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};

export default ChatList;