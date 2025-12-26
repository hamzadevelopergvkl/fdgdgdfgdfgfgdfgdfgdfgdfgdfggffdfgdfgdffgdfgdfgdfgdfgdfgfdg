import React, { useState, useEffect } from 'react';
import { Message, MessageType, MessageStatus, User } from '../types';
import { Check, CheckCheck, Globe, Loader2, Heart, Play, Pause } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  sender?: User;
  showAvatar: boolean;
  onReaction: (messageId: string, reaction: string) => void;
  onTranslate: (message: Message) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMe, sender, showAvatar, onReaction, onTranslate }) => {
  const [translating, setTranslating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Ensure speech synthesis cancels when component unmounts
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const formatTime = (dateInput: Date | string) => {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleTranslateClick = async () => {
    if (message.translation) return; // Already translated
    setTranslating(true);
    await onTranslate(message);
    setTranslating(false);
  };

  const toggleAudio = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      // 1. Cancel any existing speech
      window.speechSynthesis.cancel();

      // 2. Determine text
      const textToSpeak = message.content === 'simulated_audio_content'
      ? "This is a voice message from " + (sender?.displayName || "the user")
      : message.translation || message.content;

      // 3. Create Utterance
      const utterance = new SpeechSynthesisUtterance(textToSpeak);

      // 4. Voice & Language Strategy
      const voices = window.speechSynthesis.getVoices();

      // Detect basic character sets
      const isChinese = /[\u4e00-\u9fa5]/.test(textToSpeak);
      const isEnglish = /^[A-Za-z0-9\s.,!?'"]+$/.test(textToSpeak);

      if (isChinese) {
        // Set Language Hint
        utterance.lang = 'zh-CN';
        // Try to find a Chinese voice explicitly
        const zhVoice = voices.find(v => v.lang.includes('zh'));
        if (zhVoice) utterance.voice = zhVoice;
      } else if (isEnglish) {
        // For English, prefer a clear US accent if available
        const enVoice = voices.find(v => v.lang.startsWith('en-US')) || voices.find(v => v.lang.startsWith('en'));
        if (enVoice) utterance.voice = enVoice;
      } else {
        // For other languages, rely on the browser's auto-detection or default voice
        // We do NOT force a voice here to avoid silence
      }

      // 5. Event Handlers
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = (e) => {
        console.error("Speech Error", e);
        setIsPlaying(false);
      };

      // 6. Speak
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }
  };

  const renderContent = () => {
    switch (message.type) {
      case MessageType.IMAGE:
        return (
          <img
          src={message.content}
          alt="Sent attachment"
          className="rounded-lg max-w-[200px] md:max-w-[300px] object-cover cursor-pointer hover:opacity-95 transition"
          />
        );
      case MessageType.AUDIO:
        return (
          <div className="flex items-center space-x-3 min-w-[160px] p-1">
          <button
          onClick={toggleAudio}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isMe ? 'bg-white text-[#3797f0]' : 'bg-gray-200 text-gray-700 dark:bg-zinc-700 dark:text-white'}`}
          >
          {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
          </button>
          <div className="flex flex-col flex-1">
          <div className="h-1 w-full bg-black/10 dark:bg-white/20 rounded-full overflow-hidden">
          <div className={`h-full bg-current opacity-50 ${isPlaying ? 'w-full transition-all duration-[3000ms] ease-linear' : 'w-0'}`}></div>
          </div>
          <span className="text-[10px] opacity-70 mt-1">
          {isPlaying ? 'Playing...' : '0:03'}
          </span>
          </div>
          </div>
        );
      case MessageType.TEXT:
      default:
        return (
          <div className="flex flex-col">
          {/* Removed 'font-sans' to allow inheritance of Noto Sans SC for foreign characters */}
          <p className="text-[15px] leading-snug whitespace-pre-wrap">{message.content}</p>
          {message.translation && (
            <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10 text-sm text-gray-600 dark:text-gray-300 italic">
            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Translated</span>
            {message.translation}
            </div>
          )}
          </div>
        );
    }
  };

  return (
    <div className={`flex w-full mb-4 ${isMe ? 'justify-end' : 'justify-start'} group relative`}>
    {!isMe && (
      <div className={`w-8 h-8 mr-2 flex-shrink-0 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
      <img
      src={sender?.avatarUrl || 'https://via.placeholder.com/32'}
      alt={sender?.username}
      className="w-8 h-8 rounded-full object-cover border border-gray-100"
      />
      </div>
    )}

    <div className={`relative max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
    <div
    className={`
      px-4 py-2.5 rounded-2xl relative
      ${isMe
        ? 'bg-[#3797f0] text-white rounded-br-none'
  : 'bg-gray-100 text-gray-900 rounded-bl-none dark:bg-zinc-800 dark:text-gray-100'}
  ${message.type === MessageType.IMAGE ? 'p-1 bg-transparent' : ''}
  `}
  >
  {renderContent()}
  </div>

  {Object.keys(message.reactions).length > 0 && (
    <div className={`absolute -bottom-3 ${isMe ? 'right-0' : 'left-0'} bg-white dark:bg-zinc-800 shadow-sm border border-gray-100 dark:border-zinc-700 rounded-full px-1.5 py-0.5 flex items-center gap-0.5 text-xs z-10`}>
    {Object.values(message.reactions).slice(0, 3).map((r, i) => <span key={i}>{String(r)}</span>)}
    {Object.keys(message.reactions).length > 1 && <span className="text-gray-500 ml-1">{Object.keys(message.reactions).length}</span>}
    </div>
  )}

  <div className={`flex items-center mt-1 space-x-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
  <span className="text-[10px] text-gray-400">{formatTime(message.timestamp)}</span>
  {isMe && (
    <span className="text-gray-400">
    {message.status === MessageStatus.READ ? <CheckCheck size={12} className="text-blue-500" /> :
    message.status === MessageStatus.DELIVERED ? <CheckCheck size={12} /> :
    <Check size={12} />}
    </span>
  )}

  <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
  {message.type === MessageType.TEXT && !message.translation && (
    <button
    onClick={handleTranslateClick}
    disabled={translating}
    className="p-0.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-gray-400 hover:text-blue-500 transition"
    title="Translate"
    >
    {translating ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
    </button>
  )}

  <button
  onClick={() => onReaction(message.id, '❤️')}
  className="p-0.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-gray-400 hover:text-red-500 transition"
  title="Like"
  >
  <Heart size={14} />
  </button>
  </div>
  </div>
  </div>
  </div>
  );
};

export default MessageBubble;