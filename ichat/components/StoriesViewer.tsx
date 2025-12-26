import React, { useState, useEffect, useRef } from 'react';
import { X, Heart, Send, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';

export interface Story {
    id: number;
    user: string;
    avatar: string;
    storyImage: string;
    isUser?: boolean;
    timestamp?: string;
}

interface StoriesViewerProps {
    stories: Story[];
    initialIndex: number;
    onClose: () => void;
}

interface FloatingHeart {
    id: number;
    left: number; 
}

const StoriesViewer: React.FC<StoriesViewerProps> = ({ stories, initialIndex, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [hasLiked, setHasLiked] = useState(false);
    const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
    
    const storyDuration = 5000; // 5 seconds per story
    const requestRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const pausedProgressRef = useRef(0);

    const currentStory = stories[currentIndex];

    useEffect(() => {
        // Reset state on story change
        setHasLiked(false);
        setFloatingHearts([]);
        setProgress(0);
        pausedProgressRef.current = 0;
        startTimeRef.current = null;
    }, [currentIndex]);

    // Handle Progress Bar
    useEffect(() => {
        if (!isPaused) {
            const animate = (time: number) => {
                if (!startTimeRef.current) startTimeRef.current = time;
                
                // Calculate lapsed time including any time previously elapsed
                const elapsed = time - startTimeRef.current + pausedProgressRef.current;
                const newProgress = (elapsed / storyDuration) * 100;

                if (newProgress >= 100) {
                    handleNext();
                } else {
                    setProgress(newProgress);
                    requestRef.current = requestAnimationFrame(animate);
                }
            };
            requestRef.current = requestAnimationFrame(animate);
        }

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [currentIndex, isPaused]);

    const handleNext = () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        } else {
            // Restart current story if it's the first one
            setProgress(0);
            startTimeRef.current = null;
            pausedProgressRef.current = 0;
        }
    };

    const handleMouseDown = () => {
        setIsPaused(true);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        
        // Calculate current progress in ms to resume from later
        const currentElapsed = (progress / 100) * storyDuration;
        pausedProgressRef.current = currentElapsed;
        startTimeRef.current = null;
    };

    const handleMouseUp = () => {
        setIsPaused(false);
        // Animation effect will pick up due to !isPaused dependency change
    };

    const handleSend = () => {
        if (!inputValue.trim()) return;
        alert(`Reply sent to ${currentStory.user}: ${inputValue}`);
        setInputValue('');
    };

    const handleLike = () => {
        setHasLiked(!hasLiked);
        if (!hasLiked) {
            // Spawn floating hearts
            const newHearts = Array.from({ length: 5 }).map((_, i) => ({
                id: Date.now() + i,
                left: 50 + (Math.random() * 40 - 20) // Random horizontal scatter
            }));
            setFloatingHearts(prev => [...prev, ...newHearts]);
            
            // Cleanup hearts after animation
            setTimeout(() => {
                setFloatingHearts(prev => prev.filter(h => h.id < Date.now()));
            }, 1500);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
            {/* Desktop Navigation Arrows */}
            <button 
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                className="hidden md:block absolute left-4 text-white opacity-50 hover:opacity-100 transition-opacity z-20"
            >
                <ChevronLeft size={32} />
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="hidden md:block absolute right-4 text-white opacity-50 hover:opacity-100 transition-opacity z-20"
            >
                <ChevronRight size={32} />
            </button>

            {/* Logo/Close on Desktop */}
            <div className="absolute top-4 right-4 z-20">
                <button onClick={onClose} className="text-white hover:opacity-70">
                    <X size={32} />
                </button>
            </div>
            <div className="absolute top-4 left-4 z-20 hidden md:block">
               <span className="text-white font-serif text-2xl tracking-tight" style={{ fontFamily: '"Grand Hotel", cursive' }}>Shadow</span>
            </div>

            {/* Story Container */}
            <div 
                className="relative w-full h-full md:w-[400px] md:h-[85vh] bg-zinc-900 md:rounded-xl overflow-hidden shadow-2xl"
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchEnd={handleMouseUp}
            >
                {/* Image Background */}
                <img 
                    src={currentStory.storyImage} 
                    alt="Story" 
                    className="w-full h-full object-cover"
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 pointer-events-none"></div>

                {/* Floating Hearts Animation */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {floatingHearts.map(heart => (
                        <div 
                            key={heart.id}
                            className="absolute bottom-20 text-red-500 animate-float-up opacity-0"
                            style={{ 
                                left: `${heart.left}%`,
                                animationDuration: `${1 + Math.random()}s`
                            }}
                        >
                            <Heart size={32} fill="currentColor" />
                        </div>
                    ))}
                </div>

                {/* Progress Bar */}
                <div className="absolute top-0 left-0 right-0 p-3 z-10 flex space-x-1">
                    {stories.map((_, idx) => (
                        <div key={idx} className="h-0.5 flex-1 bg-white/30 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-white transition-all duration-0 ease-linear"
                                style={{ 
                                    width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' 
                                }}
                            ></div>
                        </div>
                    ))}
                </div>

                {/* Header */}
                <div className="absolute top-6 left-0 right-0 px-3 flex items-center justify-between z-10">
                    <div className="flex items-center space-x-3">
                        <img 
                            src={currentStory.avatar} 
                            alt={currentStory.user} 
                            className="w-8 h-8 rounded-full border border-white/50"
                        />
                        <div className="flex flex-col text-white">
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-semibold text-white">{currentStory.user}</span>
                                <span className="text-xs text-white/70">{currentStory.timestamp || '5h'}</span>
                            </div>
                        </div>
                    </div>
                    <button className="text-white" onClick={() => alert("Story Options")}>
                        <MoreHorizontal size={24} />
                    </button>
                </div>

                {/* Mobile Close Button (Top Right specific to container on mobile feel) */}
                <div className="md:hidden absolute top-6 right-3 z-20">
                     <button onClick={onClose}><X size={24} className="text-white" /></button>
                </div>

                {/* Interactive Tap Zones (Invisible) */}
                <div className="absolute inset-0 flex z-0">
                    <div className="w-1/3 h-full" onClick={handlePrev}></div>
                    <div className="w-2/3 h-full" onClick={handleNext}></div>
                </div>

                {/* Footer Input */}
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center space-x-4 z-20" onMouseDown={(e) => e.stopPropagation()}>
                    <div className="flex-1 relative">
                        <input 
                            type="text" 
                            placeholder={`Send message to ${currentStory.user}...`} 
                            className="w-full bg-transparent border border-white/50 rounded-full py-2.5 px-4 text-white text-sm placeholder-white/70 focus:outline-none focus:border-white"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                    </div>
                    <button onClick={handleLike}>
                        <Heart size={28} className={`hover:scale-110 transition-transform cursor-pointer ${hasLiked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
                    </button>
                    <button onClick={handleSend}>
                        <Send size={28} className="text-white hover:scale-110 transition-transform cursor-pointer" />
                    </button>
                </div>
            </div>
            
            <style>{`
                @keyframes float-up {
                    0% { transform: translateY(0) scale(1); opacity: 1; }
                    100% { transform: translateY(-200px) scale(1.5); opacity: 0; }
                }
                .animate-float-up {
                    animation-name: float-up;
                    animation-timing-function: ease-out;
                    animation-fill-mode: forwards;
                }
            `}</style>
        </div>
    );
};

export default StoriesViewer;