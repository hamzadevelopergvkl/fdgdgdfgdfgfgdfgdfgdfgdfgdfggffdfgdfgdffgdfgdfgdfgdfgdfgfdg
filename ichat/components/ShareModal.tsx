
import React, { useState, useEffect } from 'react';
import { User, Chat, MessageType } from '../types';
import { getChats, searchUsers, sendMessage, startDirectChat } from '../services/api';
import { X, Search, Plus } from 'lucide-react';

interface ShareModalProps {
    onClose: () => void;
    contentUrl: string; // The URL of the Reel/Post image/video
    contentType: 'image' | 'video'; // Informative type
    // Fix: Added onAddToStory prop to resolve type mismatch in ReelsView
    onAddToStory?: (mediaUrl: string) => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ onClose, contentUrl, contentType, onAddToStory }) => {
    const [chats, setChats] = useState<Chat[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getChats().then(data => setChats(data));
    }, []);

    useEffect(() => {
        if (searchQuery.length > 1) {
            const timer = setTimeout(async () => {
                const results = await searchUsers(searchQuery);
                setSearchResults(results);
            }, 400);
            return () => clearTimeout(timer);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery]);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedUsers);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedUsers(newSet);
    };

    const handleSend = async () => {
        setLoading(true);
        try {
            // Send to selected existing chats or users
            // If user is from search, we might need to start chat first
            for (const id of selectedUsers) {
                let chatId = chats.find(c => c.id === id)?.id;
                
                // If it's a user ID (from search or participants mapping), find or create chat
                if (!chatId) {
                    // Check if it's a chat ID or User ID. 
                    // To simplify, we treat everything in the UI list as a potential target.
                    // If the ID exists in the CHATS array, it's a chat ID.
                    // If not, it's likely a user ID from search results.
                    
                    const isChat = chats.some(c => c.id === id);
                    if (!isChat) {
                        // Create direct chat
                        const newChat = await startDirectChat(id);
                        chatId = newChat.id;
                    } else {
                        chatId = id;
                    }
                }

                if (chatId) {
                    // Send URL as text message for now (simplest integration)
                    // Or send as MessageType.IMAGE / VIDEO if applicable
                    const msgType = contentType === 'video' ? MessageType.VIDEO : MessageType.IMAGE;
                    // Actually, if it's a URL, we send it as text if it's external, or content if supported.
                    // The App handles URLs starting with http generally.
                    await sendMessage(chatId, contentUrl, msgType);
                }
            }
            onClose();
            alert("Sent!");
        } catch (e) {
            console.error("Failed to send", e);
            alert("Failed to send message.");
        } finally {
            setLoading(false);
        }
    };

    // Combine recent chats and search results for display
    // Map chats to display format
    const recentItems = chats.map(c => {
        const other = c.participants.find(p => p.username !== 'Me' && !p.isOnline); // Simplified logic
        // We need 'currentUser' to filter correctly, but for this modal let's just grab the first non-me or name
        return {
            id: c.id,
            name: c.name || c.participants[0]?.displayName || 'Chat',
            avatar: c.participants[0]?.avatarUrl,
            username: c.participants[0]?.username,
            isChat: true
        };
    });

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                    <h3 className="font-bold text-lg dark:text-white">Share to...</h3>
                    <button onClick={onClose}><X className="dark:text-white" /></button>
                </div>

                <div className="p-3">
                    <div className="flex items-center bg-gray-100 dark:bg-zinc-800 rounded-lg px-3 py-2">
                        <Search size={18} className="text-gray-400 mr-2" />
                        <input 
                            type="text" 
                            placeholder="Search" 
                            className="bg-transparent flex-1 outline-none text-sm dark:text-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-4">
                    {/* Horizontal Recent Scroll */}
                    {searchQuery.length === 0 && (
                        <div className="flex space-x-4 overflow-x-auto py-4 scrollbar-hide mb-2 border-b border-gray-50 dark:border-zinc-800">
                            {/* Implementation: Show "Your Story" button if onAddToStory callback is provided */}
                            {onAddToStory && (
                                <div 
                                    className="flex flex-col items-center w-16 cursor-pointer" 
                                    onClick={() => { onAddToStory(contentUrl); onClose(); }}
                                >
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-gold to-orange-500 p-0.5 mb-1">
                                        <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center">
                                            <Plus size={24} className="text-gold" />
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-center truncate w-full dark:text-gray-300">Your Story</span>
                                </div>
                            )}
                            {recentItems.slice(0, 10).map(item => (
                                <div key={item.id} className="flex flex-col items-center w-16 cursor-pointer" onClick={() => toggleSelection(item.id)}>
                                    <div className={`relative w-14 h-14 rounded-full overflow-hidden mb-1 border-2 ${selectedUsers.has(item.id) ? 'border-blue-500 p-0.5' : 'border-transparent'}`}>
                                        <img src={item.avatar || 'https://via.placeholder.com/50'} className="w-full h-full rounded-full object-cover" />
                                        {selectedUsers.has(item.id) && (
                                            <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                                <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-xs text-center truncate w-full dark:text-gray-300">{item.name}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Vertical List */}
                    <div className="space-y-1">
                        {(searchQuery.length > 0 ? searchResults : recentItems).map((item: any) => (
                            <div 
                                key={item.id} 
                                onClick={() => toggleSelection(item.id)}
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-900 cursor-pointer"
                            >
                                <div className="flex items-center space-x-3">
                                    <img src={item.avatarUrl || item.avatar || 'https://via.placeholder.com/50'} className="w-10 h-10 rounded-full object-cover" />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold dark:text-white">{item.displayName || item.name}</span>
                                        <span className="text-xs text-gray-500">{item.username ? `@${item.username}` : ''}</span>
                                    </div>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedUsers.has(item.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-zinc-600'}`}>
                                    {selectedUsers.has(item.id) && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-zinc-800">
                    <button 
                        onClick={handleSend}
                        disabled={selectedUsers.size === 0 || loading}
                        className={`w-full py-3 rounded-lg font-semibold text-white flex items-center justify-center space-x-2 transition-colors ${selectedUsers.size > 0 ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-300 cursor-not-allowed'}`}
                    >
                        <span>Send</span>
                        {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareModal;
