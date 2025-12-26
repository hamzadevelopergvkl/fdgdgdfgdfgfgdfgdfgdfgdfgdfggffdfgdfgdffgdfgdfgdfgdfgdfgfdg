import React, { useState, useEffect, useRef } from 'react';
import { Chat, User, Message, MessageType, MessageStatus } from '../types';
import MessageBubble from './MessageBubble';
import { Phone, Video, Info, Image as ImageIcon, Smile, Heart, SendHorizontal, Mic, XCircle } from 'lucide-react';

interface ChatWindowProps {
  chat: Chat;
  currentUser: User;
  messages: Message[];
  onSendMessage: (chatId: string, content: string, type: MessageType) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onDeleteChat: (chatId: string) => void;
  onAcceptChat: (chatId: string) => void;
  onTranslate: (message: Message) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  currentUser,
  messages,
  onSendMessage,
  onReaction,
  onDeleteChat,
  onAcceptChat,
  onTranslate
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const otherParticipants = chat.participants.filter(p => p.id !== currentUser.id);
  const chatName = chat.type === 'group' ? chat.name : otherParticipants[0]?.displayName;
  const chatAvatar = chat.type === 'group'
  ? `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name || 'G')}`
  : otherParticipants[0]?.avatarUrl;
  const isOnline = chat.type === 'direct' && otherParticipants[0]?.isOnline;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, chat.id]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(chat.id, inputText, MessageType.TEXT);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Button Handlers
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create a fake URL for the browser
      const url = URL.createObjectURL(file);
      onSendMessage(chat.id, url, MessageType.IMAGE);
    }
    // Reset
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

    const handleHeartClick = () => {
      onSendMessage(chat.id, '❤️', MessageType.TEXT);
    };

    const handleMicClick = () => {
      if (isRecording) {
        // Stop recording and send
        setIsRecording(false);
        // Sending a specific string that MessageBubble can recognize or just generic text
        onSendMessage(chat.id, "simulated_audio_content", MessageType.AUDIO);
      } else {
        setIsRecording(true);
      }
    };

    return (
      <div className="flex flex-col h-full bg-white dark:bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-zinc-800 bg-white/90 dark:bg-black/90 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center space-x-3">
      <img src={chatAvatar} alt={chatName} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
      <div>
      <h2 className="text-base font-semibold dark:text-white">{chatName}</h2>
      {chat.type === 'direct' && (
        <p className="text-xs text-gray-500">
        {isOnline ? <span className="text-green-500">Active now</span> : `Active ${otherParticipants[0]?.lastSeen ? 'recently' : 'a while ago'}`}
        </p>
      )}
      {chat.type === 'group' && (
        <p className="text-xs text-gray-500">{chat.participants.length} members</p>
      )}
      </div>
      </div>
      {!chat.isRequest && (
        <div className="flex items-center space-x-5 text-gray-800 dark:text-white">
        <Phone className="cursor-pointer hover:text-gray-500 transition" size={24} />
        <Video className="cursor-pointer hover:text-gray-500 transition" size={28} />
        <Info className="cursor-pointer hover:text-gray-500 transition" size={24} />
        </div>
      )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
      <div className="text-center py-6">
      <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden border-2 border-gray-100">
      <img src={chatAvatar} alt={chatName} className="w-full h-full object-cover" />
      </div>
      <h3 className="text-lg font-bold dark:text-white">{chatName}</h3>
      <p className="text-sm text-gray-500">{chat.type === 'group' ? 'You are in this group.' : `IChat · ${otherParticipants[0]?.username}`}</p>
      </div>

      {messages.map((msg, idx) => {
        const isMe = msg.senderId === currentUser.id;
        const sender = chat.participants.find(p => p.id === msg.senderId);
        const showAvatar = chat.type === 'group' && !isMe && (idx === messages.length - 1 || messages[idx + 1]?.senderId !== msg.senderId);

        return (
          <MessageBubble
          key={msg.id}
          message={msg}
          isMe={isMe}
          sender={sender}
          showAvatar={showAvatar}
          onReaction={onReaction}
          onTranslate={onTranslate}
          />
        );
      })}

      {/* Seen indicator - only if not request */}
      {!chat.isRequest && messages.length > 0 && messages[messages.length-1].senderId === currentUser.id && (
        <div className="text-right text-[11px] text-gray-400 font-medium px-2 pb-2">
        Seen
        </div>
      )}

      <div ref={messagesEndRef} />
      </div>

      {/* Input Area or Request Actions */}
      {chat.isRequest ? (
        <div className="px-4 py-4 bg-white dark:bg-black border-t border-gray-100 dark:border-zinc-800">
        <div className="flex flex-col items-center space-y-3">
        <div className="text-center px-4">
        <h3 className="text-sm font-semibold dark:text-white">
        Accept message request from {chatName}?
        </h3>
        <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
        If you accept, they will also be able to video chat with you and see info such as your Activity Status and when you've read messages.
        </p>
        </div>
        <div className="flex items-center space-x-3 w-full max-w-sm pt-2">
        <button
        onClick={() => onDeleteChat(chat.id)}
        className="flex-1 text-red-500 font-semibold text-sm py-2 hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-lg transition-colors border border-gray-200 dark:border-zinc-800"
        >
        Delete
        </button>
        <button
        onClick={() => onAcceptChat(chat.id)}
        className="flex-1 text-black dark:text-white font-semibold text-sm py-2 hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-lg transition-colors border border-gray-200 dark:border-zinc-800"
        >
        Accept
        </button>
        </div>
        </div>
        </div>
      ) : (
        <div className="px-4 py-3 bg-white dark:bg-black">
        <div className="flex items-center bg-transparent min-h-[44px] border border-gray-200 dark:border-zinc-700 rounded-full px-2 py-1 relative">

        <button
        onClick={handleImageClick}
        className="p-2 text-gray-800 dark:text-white hover:text-gray-500 transition-colors"
        >
        <ImageIcon size={24} strokeWidth={1.5} />
        </button>
        <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
        />

        <input
        ref={inputRef}
        type="text"
        className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-2 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none"
        placeholder="Message..."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleKeyDown}
        />

        {inputText.length > 0 ? (
          <button
          onClick={handleSend}
          className="p-2 text-[#0095f6] font-semibold hover:text-[#1877f2] transition-colors"
          >
          <SendHorizontal size={24} strokeWidth={2} />
          </button>
        ) : (
          <div className="flex items-center space-x-1">
          <button
          onClick={handleMicClick}
          className={`p-2 transition-colors ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-800 dark:text-white hover:text-gray-500'}`}
          title={isRecording ? "Stop Recording" : "Record Audio"}
          >
          <Mic size={24} strokeWidth={1.5} fill={isRecording ? "currentColor" : "none"} />
          </button>
          <button
          onClick={handleHeartClick}
          className="p-2 text-gray-800 dark:text-white hover:text-gray-500 transition-colors"
          >
          <Heart size={24} strokeWidth={1.5} />
          </button>
          </div>
        )}
        </div>
        </div>
      )}
      </div>
    );
};

export default ChatWindow;
