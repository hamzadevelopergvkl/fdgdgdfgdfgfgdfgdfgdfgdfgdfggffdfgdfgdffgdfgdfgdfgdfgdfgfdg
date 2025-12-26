import React, { useState, useEffect } from 'react';
import { X, Send, Heart, Loader2 } from 'lucide-react';
import { getComments, commentPost, likeComment } from '../services/api';

interface Comment {
    id: string;
    content: string;
    username: string;
    avatarUrl: string;
    userId: string;
    createdAt: string;
    hasLiked: boolean;
}

interface CommentsModalProps {
    postId: string;
    postOwnerId: string;
    postOwnerUsername: string;
    postCaption: string;
    onClose: () => void;
    onNavigateToProfile: (userId: string) => void;
}

const CommentsModal: React.FC<CommentsModalProps> = ({ postId, postOwnerUsername, postCaption, onClose, onNavigateToProfile }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        getComments(postId).then(data => {
            setComments(data);
            setLoading(false);
        });
    }, [postId]);

    const handleSendComment = async () => {
        if (!newComment.trim()) return;
        setSubmitting(true);
        try {
            const comment = await commentPost(postId, newComment);
            setComments(prev => [...prev, comment]);
            setNewComment('');
        } catch (e) {
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    };

    const handleLikeComment = async (id: string) => {
        setComments(prev => prev.map(c => c.id === id ? { ...c, hasLiked: !c.hasLiked } : c));
        await likeComment(id);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-lg h-[80vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl border border-gray-100 dark:border-zinc-800">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                    <h3 className="font-bold dark:text-white">Comments</h3>
                    <button onClick={onClose}><X className="dark:text-white" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Caption / Author */}
                    <div className="flex items-start space-x-3 mb-6 pb-6 border-b border-gray-50 dark:border-zinc-800">
                        <div className="font-bold text-sm dark:text-white">@{postOwnerUsername}</div>
                        <div className="text-sm text-gray-800 dark:text-gray-200">{postCaption}</div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="animate-spin text-gold" />
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 text-sm italic">No comments yet. Be the first to say something!</div>
                    ) : (
                        comments.map(c => (
                            <div key={c.id} className="flex items-start justify-between group">
                                <div className="flex items-start space-x-3">
                                    <img src={c.avatarUrl} className="w-8 h-8 rounded-full object-cover cursor-pointer" onClick={() => onNavigateToProfile(c.userId)} />
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <span className="font-bold text-xs dark:text-white cursor-pointer" onClick={() => onNavigateToProfile(c.userId)}>{c.username}</span>
                                            <span className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{c.content}</p>
                                    </div>
                                </div>
                                <button onClick={() => handleLikeComment(c.id)}>
                                    <Heart size={14} className={`${c.hasLiked ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-zinc-800 flex items-center space-x-3 bg-gray-50 dark:bg-zinc-800/50">
                    <input 
                        type="text" 
                        placeholder="Add a comment..." 
                        className="flex-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-full px-4 py-2 text-sm outline-none dark:text-white"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                    />
                    <button 
                        onClick={handleSendComment}
                        disabled={!newComment.trim() || submitting}
                        className="text-blue-500 font-bold text-sm disabled:opacity-50"
                    >
                        Post
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CommentsModal;
