import React, { useState, useEffect } from 'react';
import { Chat, User } from '../types';
import { SquarePen, X, Settings } from 'lucide-react';
import { searchUsers } from '../services/api';

interface ChatListProps {
  chats: Chat[];
  users: User[]; // Still in props but we use async search now
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
    onOpenSettings
}) => {
  const [activeTab, setActiveTab] = useState<'messages' | 'requests'>('messages');
  const [modalSearch, setModalSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  // Search effect
  useEffect(() => {
    if (showNewMessageModal && modalSearch.trim().length > 1) {
        setSearching(true);
        const timer = setTimeout(async () => {
            try {
                const results = await searchUsers(modalSearch);
                setSearchResults(results);
            } catch (e) {
                console.error(e);
            } finally {
                setSearching(false);
            }
        }, 500); // Debounce
        return () => clearTimeout(timer);
    } else {
        setSearchResults([]);
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

  const formatLastMessageTime = (date?: Date | string) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 1000 * 60 * 60 * 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString();
  };

  // Filter chats based on tab
  const filteredChats = chats.filter(chat => {
      if (activeTab === 'requests') return chat.isRequest;
      return !chat.isRequest;
  });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black border-r border-gray-200 dark:border-zinc-800 relative">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 pt-6">
        <div className="flex items-center space-x-2 cursor-pointer">
          <span className="font-bold text-xl dark:text-white">{currentUser.username}</span>
          <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
        </div>
        <div className="flex items-center space-x-3">
             <button 
                onClick={onOpenSettings}
                className="text-gray-800 dark:text-white hover:opacity-70 transition-opacity"
                title="Settings"
            >
                <Settings size={24} />
            </button>
            <button 
                onClick={() => setShowNewMessageModal(true)}
                className="text-gray-800 dark:text-white hover:opacity-70 transition-opacity"
                title="New Message"
            >
                <SquarePen size={24} />
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-5 space-x-6 border-b border-gray-100 dark:border-zinc-800 pb-1 mt-1">
         <button 
            onClick={() => setActiveTab('messages')}
            className={`pb-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'messages' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
         >
            Messages
         </button>
         <button 
            onClick={() => setActiveTab('requests')}
            className={`pb-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'requests' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
         >
            Requests
            {chats.some(c => c.isRequest && c.unreadCount > 0) && <span className="ml-1 text-red-500">•</span>}
         </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
             <div className="text-center mt-10 text-gray-400 text-sm">
                 {activeTab === 'requests' ? 'No message requests' : 'No messages found'}
             </div>
        ) : (
            filteredChats.map(chat => {
            const isActive = chat.id === activeChatId;
            const name = getChatName(chat);
            const avatar = getChatAvatar(chat);
            const lastMsg = chat.lastMessage?.content || 'Started a chat';
            const isUnread = chat.unreadCount > 0;

            return (
                <div 
                key={chat.id}
                onClick={() => onSelectChat(chat)}
                className={`flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors ${isActive ? 'bg-gray-100 dark:bg-zinc-900' : ''}`}
                >
                <div className="relative mr-3">
                    <img src={avatar} alt={name} className="w-14 h-14 rounded-full object-cover border border-gray-200 dark:border-zinc-800" />
                    {chat.participants.some(p => p.id !== currentUser.id && p.isOnline) && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                    <h3 className={`text-sm truncate dark:text-white ${isUnread ? 'font-semibold' : 'font-normal'}`}>{name}</h3>
                    {chat.lastMessage && <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatLastMessageTime(chat.lastMessage.timestamp)}</span>}
                    </div>
                    <div className="flex justify-between items-center mt-0.5">
                    <p className={`text-sm truncate pr-2 ${isUnread ? 'text-black dark:text-white font-semibold' : 'text-gray-500'}`}>
                        {chat.isTyping ? <span className="text-blue-500 italic">Typing...</span> : 
                            (lastMsg.startsWith('http') ? 'Sent a photo' : lastMsg)}
                    </p>
                    {isUnread && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    )}
                    </div>
                </div>
                </div>
            );
            })
        )}
      </div>

      {/* New Message Modal Overlay */}
      {showNewMessageModal && (
          <div className="absolute inset-0 bg-white dark:bg-black z-20 flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-zinc-800">
                  <div className="w-6"></div> 
                  <h3 className="font-semibold dark:text-white">New Message</h3>
                  <button onClick={() => setShowNewMessageModal(false)} className="text-gray-800 dark:text-white">
                      <X size={24} />
                  </button>
              </div>
              
              <div className="px-4 py-2 border-b border-gray-100 dark:border-zinc-800 flex items-center">
                  <span className="font-semibold mr-3 dark:text-white">To:</span>
                  <input 
                      type="text" 
                      className="flex-1 bg-transparent border-none focus:ring-0 text-sm dark:text-white focus:outline-none"
                      placeholder="Search users..."
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                      autoFocus
                  />
              </div>

              <div className="flex-1 overflow-y-auto">
                  <h4 className="px-4 py-3 text-sm font-semibold text-gray-500">Found</h4>
                  {searching && <div className="px-4 text-gray-400 text-xs">Searching...</div>}
                  
                  {!searching && searchResults.length === 0 && modalSearch.length > 1 && (
                      <div className="px-4 text-gray-400 text-sm">No users found.</div>
                  )}

                  {searchResults.map(user => (
                    <div 
                        key={user.id}
                        onClick={() => onStartChat(user)}
                        className="flex items-center px-4 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900"
                    >
                        <img src={user.avatarUrl || 'https://via.placeholder.com/40'} alt={user.username} className="w-12 h-12 rounded-full object-cover mr-3 border border-gray-200 dark:border-zinc-800" />
                        <div>
                            <h4 className="font-semibold text-sm dark:text-white">{user.displayName}</h4>
                            <p className="text-gray-500 text-xs">{user.username}</p>
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