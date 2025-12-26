import React, { useState, useEffect, useRef } from 'react';
import { Message, MessageType, MessageStatus, User } from '../types';
import { Check, CheckCheck, Globe, Loader2, Heart, Play, Pause, Clock, Smile, ThumbsUp, PartyPopper } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  sender?: User;
  showAvatar: boolean;
  onReaction: (messageId: string, reaction: string) => void;
  onTranslate: (message: Message) => void;
}

const REACTIONS = ['❤️', '😂', '😮', '👏', '👎'];

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMe, sender, showAvatar, onReaction, onTranslate }) => {
  const [translating, setTranslating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (message.expiresAt) {
        const checkExpiration = () => {
            if (new Date(message.expiresAt!) < new Date()) {
                setIsExpired(true);
            }
        };
        checkExpiration(); // Check immediately
        const timer = setInterval(checkExpiration, 1000);
        return () => clearInterval(timer);
    }
  }, [message.expiresAt]);

  const formatTime = (dateInput: Date | string) => {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleTranslateClick = async () => {
    if (message.translation) return;
    setTranslating(true);
    await onTranslate(message);
    setTranslating(false);
  };

  const toggleAudio = () => {
    if (message.type === MessageType.AUDIO && message.content.startsWith('data:audio')) {
        if (!audioRef.current) {
            audioRef.current = new Audio(message.content);
            audioRef.current.onended = () => setIsPlaying(false);
            audioRef.current.onpause = () => setIsPlaying(false);
            audioRef.current.onplay = () => setIsPlaying(true);
        }

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            // Stop other audio sources if necessary
            window.speechSynthesis.cancel();
            audioRef.current.play().catch(e => console.error("Audio playback error:", e));
        }
    } else {
        // Fallback or Text-to-Speech for text messages
        if (isPlaying) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
        } else {
            window.speechSynthesis.cancel();
            const textToSpeak = message.content === 'simulated_audio_content'
            ? "This is a voice message from " + (sender?.displayName || "the user")
            : message.translation || message.content;

            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            const voices = window.speechSynthesis.getVoices();
            const isChinese = /[\u4e00-\u9fa5]/.test(textToSpeak);
            const isEnglish = /^[A-Za-z0-9\s.,!?'"]+$/.test(textToSpeak);

            if (isChinese) {
                utterance.lang = 'zh-CN';
                const zhVoice = voices.find(v => v.lang.includes('zh'));
                if (zhVoice) utterance.voice = zhVoice;
            } else if (isEnglish) {
                const enVoice = voices.find(v => v.lang.startsWith('en-US')) || voices.find(v => v.lang.startsWith('en'));
                if (enVoice) utterance.voice = enVoice;
            }

            utterance.onend = () => setIsPlaying(false);
            utterance.onerror = (e) => {
                console.error("Speech Error", e);
                setIsPlaying(false);
            };
            window.speechSynthesis.speak(utterance);
            setIsPlaying(true);
        }
    }
  };

  if (isExpired) {
      return null;
  }

  const renderContent = () => {
    switch (message.type) {
      case MessageType.IMAGE:
        return (
          <img
          src={message.content}
          alt="Sent attachment"
          className="rounded-xl max-w-[220px] md:max-w-[320px] object-cover cursor-pointer hover:opacity-95 transition shadow-sm border border-black/5"
          />
        );
      case MessageType.AUDIO:
        return (
          <div className="flex items-center space-x-3 min-w-[160px] p-1">
          <button
          onClick={toggleAudio}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shadow-sm ${isMe ? 'bg-white text-navy' : 'bg-navy text-gold dark:bg-cream dark:text-navy'}`}
          >
          {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
          </button>
          <div className="flex flex-col flex-1">
          <div className="h-1 w-full bg-black/10 dark:bg-white/20 rounded-full overflow-hidden">
          <div className={`h-full bg-current opacity-50 ${isPlaying ? 'w-full transition-all duration-[3000ms] ease-linear' : 'w-0'}`}></div>
          </div>
          <span className="text-[10px] opacity-70 mt-1 font-mono">
          {isPlaying ? 'Playing...' : 'Voice Message'}
          </span>
          </div>
          </div>
        );
      case MessageType.TEXT:
      default:
        return (
          <div className="flex flex-col">
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-sans font-light tracking-wide">{message.content}</p>
          {message.translation && (
            <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10 text-sm opacity-90 italic font-serif text-gray-200">
            <span className="text-[9px] uppercase font-bold opacity-60 block mb-0.5 tracking-widest">Translated</span>
            {message.translation}
            </div>
          )}
          </div>
        );
    }
  };

  return (
    <div 
        className={`flex w-full mb-4 ${isMe ? 'justify-end' : 'justify-start'} group relative animate-in slide-in-from-bottom-2 duration-300`}
        onMouseLeave={() => setShowReactions(false)}
    >
    {!isMe && (
      <div className={`w-8 h-8 mr-3 flex-shrink-0 self-end mb-5 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
      <img
      src={sender?.avatarUrl || 'https://via.placeholder.com/32'}
      alt={sender?.username}
      className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-zinc-700 shadow-sm"
      />
      </div>
    )}

    <div className={`relative max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
    
    {/* Reaction Popup */}
    {showReactions && (
        <div className={`absolute -top-12 ${isMe ? 'right-0' : 'left-0'} bg-white dark:bg-zinc-800 shadow-xl border border-gray-100 dark:border-zinc-700 rounded-full px-3 py-1.5 flex items-center gap-2 z-20 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-md bg-opacity-95`}>
            {REACTIONS.map(emoji => (
                <button 
                    key={emoji}
                    onClick={() => { onReaction(message.id, emoji); setShowReactions(false); }}
                    className="hover:scale-125 transition-transform p-1 text-xl hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-full"
                >
                    {emoji}
                </button>
            ))}
        </div>
    )}

    <div
    className={`
      px-5 py-3 rounded-2xl relative shadow-sm border
      ${isMe
        ? 'bg-navy text-cream border-navy-light rounded-br-sm dark:bg-gold dark:text-navy dark:border-gold shadow-md'
        : 'bg-white text-charcoal border-gray-200 rounded-bl-sm dark:bg-navy-light dark:text-cream dark:border-zinc-800'}
        ${message.type === MessageType.IMAGE ? 'p-1 bg-transparent border-none shadow-none' : ''}
    `}
    >
    {renderContent()}
    </div>

  {Object.keys(message.reactions).length > 0 && (
    <div className={`absolute -bottom-2 ${isMe ? 'right-0' : 'left-0'} bg-white dark:bg-zinc-800 shadow-md border border-gray-100 dark:border-zinc-700 rounded-full px-2 py-0.5 flex items-center gap-0.5 text-xs z-10 scale-90 translate-y-1`}>
    {Object.values(message.reactions).slice(0, 3).map((r, i) => <span key={i}>{String(r)}</span>)}
    {Object.keys(message.reactions).length > 1 && <span className="text-gray-500 ml-1 font-bold">{Object.keys(message.reactions).length}</span>}
    </div>
  )}

  <div className={`flex items-center mt-1 space-x-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
  <span className="text-[10px] text-gray-400 font-mono tracking-tighter opacity-70 uppercase">{formatTime(message.timestamp)}</span>
  {isMe && (
    <span className="text-gray-400 opacity-70">
    {message.status === MessageStatus.READ ? <CheckCheck size={12} className="text-gold" /> :
    message.status === MessageStatus.DELIVERED ? <CheckCheck size={12} /> :
    message.status === MessageStatus.QUEUED ? <Clock size={12} /> :
    <Check size={12} />}
    </span>
  )}
  
  {/* Expiration Indicator */}
  {message.expiresAt && <span className="text-red-400 opacity-70 animate-pulse" title="Self-destructing"><Clock size={10} /></span>}

  <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
  {message.type === MessageType.TEXT && !message.translation && (
    <button
    onClick={handleTranslateClick}
    disabled={translating}
    className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-400 hover:text-gold transition"
    title="Translate"
    >
    {translating ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
    </button>
  )}

  <button
  onClick={() => setShowReactions(!showReactions)}
  className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-400 hover:text-red-500 transition"
  title="React"
  >
  <Heart size={12} />
  </button>
  </div>
  </div>
  </div>
  </div>
  );
};

export default MessageBubble;