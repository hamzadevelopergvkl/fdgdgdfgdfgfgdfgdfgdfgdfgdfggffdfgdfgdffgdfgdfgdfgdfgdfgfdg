import React, { useState, useRef } from 'react';
import { ArrowLeft, Image as ImageIcon, MapPin, Loader2, Video as VideoIcon } from 'lucide-react';
import { createPost } from '../services/api';

interface CreatePostProps {
    onBack: () => void;
    onPostCreated: () => void;
}

const FILTERS = [
    { name: 'Normal', class: '' },
    { name: 'Clarendon', class: 'brightness-110 contrast-125 saturate-125' },
    { name: 'Gingham', class: 'sepia-[.2] contrast-[.9] brightness-105' },
    { name: 'Moon', class: 'grayscale brightness-110 contrast-110' },
    { name: 'Lark', class: 'brightness-110 contrast-[.9] saturate-110' },
    { name: 'Reyes', class: 'sepia-[.4] brightness-125 contrast-[.85]' },
    { name: 'Juno', class: 'contrast-115 brightness-115 saturate-150' },
];

const CreatePost: React.FC<CreatePostProps> = ({ onBack, onPostCreated }) => {
    const [mediaSrc, setMediaSrc] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'reel'>('image');
    const [caption, setCaption] = useState('');
    const [location, setLocation] = useState('');
    const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Select, 2: Filter/Edit
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const isVideo = file.type.startsWith('video');
            setMediaType(isVideo ? 'reel' : 'image');
            
            const reader = new FileReader();
            reader.onloadend = () => {
                setMediaSrc(reader.result as string);
                setStep(2);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        if (!mediaSrc) return;
        setLoading(true);
        try {
            await createPost(mediaSrc, caption, location, selectedFilter.class, mediaType);
            onPostCreated();
        } catch (error) {
            console.error(error);
            alert("Failed to upload post");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-black w-full max-w-[600px] mx-auto animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-zinc-800">
                <button onClick={step === 2 ? () => setStep(1) : onBack} className="text-gray-800 dark:text-white">
                    <ArrowLeft size={24} />
                </button>
                <h2 className="font-bold text-lg dark:text-white">{step === 1 ? 'New Post' : 'Filter & Share'}</h2>
                {step === 2 && (
                    <button 
                        onClick={handleSubmit} 
                        disabled={loading}
                        className={`text-[#0095f6] font-bold text-sm ${loading ? 'opacity-50' : 'hover:text-[#1877f2]'}`}
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : 'Share'}
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {!mediaSrc || step === 1 ? (
                    <div className="h-[400px] flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800">
                        <div className="flex gap-4 mb-4 text-gray-300">
                            <ImageIcon size={64} />
                            <VideoIcon size={64} />
                        </div>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-[#0095f6] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#1877f2]"
                        >
                            Select from computer
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {/* Preview with Filter */}
                        <div className={`relative w-full aspect-square bg-black overflow-hidden flex items-center justify-center`}>
                            {mediaType === 'image' ? (
                                <img 
                                    src={mediaSrc} 
                                    alt="Preview" 
                                    className={`w-full h-full object-contain transition-all duration-300 ${selectedFilter.class}`} 
                                />
                            ) : (
                                <video 
                                    src={mediaSrc} 
                                    className={`w-full h-full object-contain ${selectedFilter.class}`}
                                    controls
                                    autoPlay
                                    muted
                                    loop
                                />
                            )}
                        </div>

                        {/* Filter Selection Strip (Only for Images usually, but CSS filters work on video too) */}
                        <div className="p-4 bg-white dark:bg-black border-b border-gray-100 dark:border-zinc-800 overflow-x-auto">
                            <div className="flex space-x-4">
                                {FILTERS.map((filter) => (
                                    <button 
                                        key={filter.name}
                                        onClick={() => setSelectedFilter(filter)}
                                        className="flex flex-col items-center space-y-1 focus:outline-none"
                                    >
                                        <div className={`w-20 h-20 rounded overflow-hidden border-2 flex items-center justify-center bg-gray-100 dark:bg-zinc-800 ${selectedFilter.name === filter.name ? 'border-[#0095f6]' : 'border-transparent'}`}>
                                            {mediaType === 'image' ? (
                                                <img src={mediaSrc} className={`w-full h-full object-cover ${filter.class}`} />
                                            ) : (
                                                <video src={mediaSrc} className={`w-full h-full object-cover ${filter.class}`} muted />
                                            )}
                                        </div>
                                        <span className={`text-xs font-semibold ${selectedFilter.name === filter.name ? 'text-[#0095f6]' : 'text-gray-500'}`}>{filter.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Metadata Inputs */}
                        <div className="p-4 space-y-4">
                            <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="w-full h-full bg-gradient-to-tr from-gray-300 to-gray-400"></div>
                                </div>
                                <textarea
                                    placeholder="Write a caption..."
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm resize-none dark:text-white"
                                    rows={4}
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value)}
                                />
                            </div>
                            
                            <div className="border-t border-gray-200 dark:border-zinc-800 pt-3">
                                <div className="flex items-center">
                                    <MapPin size={20} className="text-gray-500 mr-2" />
                                    <input 
                                        type="text" 
                                        placeholder="Add Location" 
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm dark:text-white"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*,video/*" 
                    className="hidden" 
                />
            </div>
        </div>
    );
};

export default CreatePost;