import React, { useState, useEffect, useRef } from 'react';
import { Chat, User, Message, MessageType } from '../types';
import MessageBubble from './MessageBubble';
import { Phone, Video, Image as ImageIcon, Heart, SendHorizontal, Mic, Clock, Lock, Trash2 } from 'lucide-react';
import { markChatRead } from '../services/api';

interface ChatWindowProps {
  chat: Chat;
  currentUser: User;
  messages: Message[];
  onSendMessage: (chatId: string, content: string, type: MessageType, expiresAt?: Date) => void;
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
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [ttl, setTtl] = useState<number>(0); 
  const [showTtlMenu, setShowTtlMenu] = useState(false);
  const [recipientTime, setRecipientTime] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const otherParticipant = chat.participants.find(p => p.id !== currentUser.id);
  const chatName = chat.type === 'group' ? chat.name : otherParticipant?.displayName;
  const chatAvatar = chat.type === 'group'
  ? `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name || 'G')}`
  : otherParticipant?.avatarUrl;
  const isUserOnline = chat.type === 'direct' && otherParticipant?.isOnline;
  const isEncrypted = chat.type === 'direct'; 

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    if (!chat.isRequest) {
        markChatRead(chat.id);
    }
  }, [messages, chat.id]);

  // Update recipient's local time every minute
  useEffect(() => {
      const updateTime = () => {
          if (otherParticipant?.timezone) {
              try {
                  const formatter = new Intl.DateTimeFormat([], {
                      timeZone: otherParticipant.timezone,
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                  });
                  setRecipientTime(formatter.format(new Date()));
              } catch (e) {
                  setRecipientTime('');
              }
          } else {
              setRecipientTime('');
          }
      };

      updateTime();
      const timer = setInterval(updateTime, 60000);
      return () => clearInterval(timer);
  }, [otherParticipant]);

  useEffect(() => {
    if (isRecording) {
        setRecordingDuration(0);
        recordingTimerRef.current = window.setInterval(() => {
            setRecordingDuration(prev => prev + 1);
        }, 1000);
    } else {
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
    return () => { if (recordingTimerRef.current) clearInterval(recordingTimerRef.current); };
  }, [isRecording]);

  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => {
                const base64Audio = reader.result as string;
                let expirationDate: Date | undefined;
                if (ttl > 0) expirationDate = new Date(Date.now() + ttl * 1000);
                onSendMessage(chat.id, base64Audio, MessageType.AUDIO, expirationDate);
            };
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
    } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
        if (mediaRecorderRef.current.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        }
    }
    setIsRecording(false);
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    let expirationDate: Date | undefined;
    if (ttl > 0) expirationDate = new Date(Date.now() + ttl * 1000);
    onSendMessage(chat.id, inputText, MessageType.TEXT, expirationDate);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                let expirationDate: Date | undefined;
                if (ttl > 0) expirationDate = new Date(Date.now() + ttl * 1000);
                onSendMessage(chat.id, reader.result, MessageType.IMAGE, expirationDate);
            }
        };
        reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

    return (
      <div className="flex flex-col h-full bg-white dark:bg-black transition-colors duration-300">
      {/* Clean Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800 bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center space-x-4">
            <div className="relative">
                <img src={chatAvatar} alt={chatName} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-zinc-700 shadow-sm" />
                {isUserOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-black"></span>}
            </div>
            <div>
                <h2 className="text-sm font-bold text-navy dark:text-white flex items-center gap-2">
                    {chatName}
                    {isEncrypted && <Lock size={12} className="text-gold" />}
                </h2>
                <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {isUserOnline ? 'Active now' : otherParticipant?.lastSeen ? `Last seen ${new Date(otherParticipant.lastSeen).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` : 'Offline'}
                    {recipientTime && <span className="mx-1 opacity-50">•</span>}
                    {recipientTime && <span className="text-gold dark:text-gold-light">{recipientTime} local</span>}
                </div>
            </div>
        </div>
        {!chat.isRequest && (
            <div className="flex items-center space-x-4 text-gray-400 dark:text-gray-500">
                <Phone size={20} className="hover:text-gold cursor-pointer transition-colors" />
                <Video size={24} className="hover:text-gold cursor-pointer transition-colors" />
                <Trash2 size={20} className="hover:text-red-500 cursor-pointer transition-colors" onClick={() => { if(confirm('Delete?')) onDeleteChat(chat.id) }} />
            </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-2 bg-cream/30 dark:bg-transparent">
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
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 pb-4 bg-white dark:bg-black border-t border-gray-100 dark:border-zinc-800">
      {chat.isRequest ? (
        <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-gray-500">Accept message request?</p>
            <div className="flex gap-4 w-full max-w-xs">
                <button onClick={() => onDeleteChat(chat.id)} className="flex-1 py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 dark:border-zinc-700 dark:hover:bg-zinc-800">Delete</button>
                <button onClick={() => onAcceptChat(chat.id)} className="flex-1 py-2 rounded-lg bg-navy text-white hover:bg-navy-light shadow-md dark:bg-zinc-700">Accept</button>
            </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl px-2 py-2 shadow-inner">
            {isRecording ? (
                <div className="flex items-center flex-1 px-3 text-red-500 animate-pulse font-mono text-sm">
                    <span className="mr-2 text-lg">●</span> {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                    <button onClick={cancelRecording} className="ml-auto text-gray-500 text-xs font-bold hover:text-red-500">CANCEL</button>
                </div>
            ) : (
                <>
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-gold transition-colors">
                        <ImageIcon size={20} />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    
                    <div className="relative">
                        <button onClick={() => setShowTtlMenu(!showTtlMenu)} className={`p-2 transition-colors ${ttl > 0 ? 'text-gold' : 'text-gray-400 hover:text-gold'}`}>
                            <Clock size={20} />
                        </button>
                        {showTtlMenu && (
                            <div className="absolute bottom-12 left-0 bg-white dark:bg-zinc-800 shadow-xl rounded-lg p-2 flex flex-col gap-1 z-30 min-w-[80px] border border-gray-100 dark:border-zinc-700">
                                {[0, 10, 60, 3600].map(v => (
                                    <div key={v} onClick={() => { setTtl(v); setShowTtlMenu(false); }} className="px-3 py-1 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded cursor-pointer text-xs dark:text-white">
                                        {v === 0 ? 'Off' : v < 60 ? `${v}s` : v < 3600 ? `${v/60}m` : '1h'}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <input 
                        ref={inputRef}
                        type="text" 
                        className="flex-1 bg-transparent border-none outline-none text-sm text-navy dark:text-white placeholder-gray-400 mx-2"
                        placeholder="Type a message..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                </>
            )}

            {inputText.trim() || isRecording ? (
                <button 
                    onClick={isRecording ? stopRecording : handleSend} 
                    className={`p-2 rounded-full shadow-md text-white transition-all transform hover:scale-105 ${isRecording ? 'bg-red-500' : 'bg-gold hover:bg-gold-hover'}`}
                >
                    <SendHorizontal size={20} />
                </button>
            ) : (
                <div className="flex">
                    <button onClick={startRecording} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                        <Mic size={20} />
                    </button>
                    <button onClick={() => onSendMessage(chat.id, '❤️', MessageType.TEXT)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                        <Heart size={20} />
                    </button>
                </div>
            )}
        </div>
      )}
      </div>
      </div>
    );
};

export default ChatWindow;