import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, MessageCircle, Send, MoreHorizontal, Music, Bookmark, Volume2, VolumeX, Loader2, Users } from 'lucide-react';
import { getReels, likePost, savePost, followUser, unfollowUser } from '../services/api';
import { InstaPost } from '../types';
import ShareModal from './ShareModal';
import CommentsModal from './CommentsModal';

interface ReelsViewProps {
    onNavigateToProfile?: (userId: string) => void;
    onAddToStory?: (mediaUrl: string) => void;
}

const REELS_PER_PAGE = 3;

const ReelsView: React.FC<ReelsViewProps> = ({ onNavigateToProfile, onAddToStory }) => {
  const [reels, setReels] = useState<InstaPost[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [shareReel, setShareReel] = useState<InstaPost | null>(null);
  const [activeCommentsReel, setActiveCommentsReel] = useState<InstaPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const observer = useRef<IntersectionObserver | null>(null);

  const trackInterest = (caption: string) => {
      const hashtags = caption.match(/#\w+/g) || [];
      const keywords = caption.split(' ').filter(w => w.length > 4).slice(0, 3);
      const combined = [...hashtags, ...keywords].map(t => t.replace('#', '').toLowerCase());
      
      const stored = localStorage.getItem('user_interests');
      let interests = stored ? JSON.parse(stored) : [];
      interests = Array.from(new Set([...interests, ...combined])).slice(-20); 
      localStorage.setItem('user_interests', JSON.stringify(interests));
  };

  const getInterests = () => {
      const stored = localStorage.getItem('user_interests');
      return stored ? JSON.parse(stored) : [];
  };

  const loadMoreReels = useCallback(async () => {
      if (loading || !hasMore) return;
      setLoading(true);
      try {
          const interests = getInterests();
          const newReels = await getReels(reels.length, REELS_PER_PAGE, interests);
          if (newReels.length < REELS_PER_PAGE) {
              setHasMore(false);
          }
          setReels(prev => [...prev, ...newReels]);
      } catch (e) {
          console.error("Failed to load reels", e);
      } finally {
          setLoading(false);
      }
  }, [reels.length, loading, hasMore]);

  useEffect(() => {
      loadMoreReels();
  }, []);

  const lastReelRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || !node) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreReels();
      }
    }, { threshold: 0.1 });
    observer.current.observe(node);
  }, [loading, hasMore, loadMoreReels]);

  const handleLike = async (reel: InstaPost) => {
      const newHasLiked = !reel.hasLiked;
      setReels(prev => prev.map(r => {
          if (r.id === reel.id) {
              return { 
                  ...r, 
                  hasLiked: newHasLiked,
                  likesCount: newHasLiked ? r.likesCount + 1 : r.likesCount - 1
              };
          }
          return r;
      }));

      if (newHasLiked) trackInterest(reel.caption);
      await likePost(reel.id);
  };

  const handleSave = async (reelId: string) => {
      setReels(prev => prev.map(r => {
          if (r.id === reelId) return { ...r, isSaved: !r.isSaved };
          return r;
      }));
      await savePost(reelId);
  };

  const handleFollow = async (reel: InstaPost) => {
      const newStatus = !reel.user.isFollowing;
      setReels(prev => prev.map(r => {
          if(r.user.id === reel.user.id) {
              return { ...r, user: { ...r.user, isFollowing: newStatus }};
          }
          return r;
      }));

      try {
          if(newStatus) await followUser(reel.user.id);
          else await unfollowUser(reel.user.id);
      } catch(e) {
          console.error(e);
      }
  };

  const toggleMute = () => setIsMuted(!isMuted);

  return (
    <div className="flex justify-center bg-black h-[calc(100vh-64px)] overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
        <div className="w-full max-w-[420px] h-full">
            {reels.length === 0 && !loading && <div className="text-white text-center pt-20">No Reels found.</div>}
            
            {reels.map((reel, index) => {
                const isLast = reels.length === index + 1;
                const relevanceScore = (reel as any).relevanceScore || 0;
                const fromFollowing = relevanceScore >= 2;

                return (
                    <div 
                        key={reel.id} 
                        ref={isLast ? lastReelRef : null}
                        className="relative w-full h-full snap-start border-b border-zinc-800 flex items-center justify-center bg-zinc-900 overflow-hidden group"
                    >
                        <video 
                            src={reel.imageUrl} 
                            className="absolute w-full h-full object-cover" 
                            loop 
                            muted={isMuted}
                            autoPlay 
                            playsInline
                            onClick={toggleMute}
                        />
                        
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-active:opacity-100 transition-opacity bg-black/50 p-4 rounded-full z-20">
                            {isMuted ? <VolumeX className="text-white" size={32} /> : <Volume2 className="text-white" size={32} />}
                        </div>

                        {fromFollowing && (
                            <div className="absolute top-4 left-4 z-20 flex items-center bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full text-white/90 text-[10px] font-bold uppercase tracking-widest border border-white/10">
                                <Users size={12} className="mr-2 text-gold" />
                                Following
                            </div>
                        )}

                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent pt-20 z-10">
                            <div className="flex items-center mb-3">
                                <div 
                                    onClick={() => onNavigateToProfile && onNavigateToProfile(reel.user.id)}
                                    className="flex items-center cursor-pointer"
                                >
                                    <img src={reel.user.avatarUrl} className="w-8 h-8 rounded-full border border-white mr-2" alt="Avatar" />
                                    <span className="text-white font-semibold text-sm mr-2 shadow-sm">{reel.user.username}</span>
                                </div>
                                <button 
                                    onClick={() => handleFollow(reel)}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold backdrop-blur-sm transition-colors ${reel.user.isFollowing ? 'text-black bg-white border-transparent' : 'text-white border border-white/50 hover:bg-white/20'}`}
                                >
                                    {reel.user.isFollowing ? 'Following' : 'Follow'}
                                </button>
                            </div>
                            <p className="text-white text-sm mb-3 drop-shadow-md line-clamp-2">{reel.caption}</p>
                            <div className="flex items-center text-white text-xs bg-white/20 w-fit px-2 py-1 rounded-full backdrop-blur-sm">
                                <Music size={12} className="mr-1" />
                                <span>Original Audio - {reel.user.username}</span>
                            </div>
                        </div>

                        <div className="absolute bottom-10 right-4 flex flex-col items-center space-y-6 z-10">
                            <div className="flex flex-col items-center">
                                <button onClick={() => handleLike(reel)} className="transition-transform active:scale-75">
                                    <Heart size={28} className={`${reel.hasLiked ? 'text-red-500 fill-red-500' : 'text-white'} drop-shadow-md`} />
                                </button>
                                <span className="text-white text-xs font-semibold mt-1 drop-shadow-md">{reel.likesCount}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <button onClick={() => setActiveCommentsReel(reel)} className="hover:scale-110 transition-transform">
                                    <MessageCircle size={28} className="text-white mb-1 drop-shadow-md" />
                                </button>
                                <span className="text-white text-xs font-semibold drop-shadow-md">{reel.commentsCount}</span>
                            </div>
                            <button onClick={() => setShareReel(reel)} className="hover:scale-110 transition-transform">
                                <Send size={28} className="text-white drop-shadow-md" />
                            </button>
                            <button onClick={() => handleSave(reel.id)}>
                                <Bookmark size={28} className={`${reel.isSaved ? 'text-white fill-white' : 'text-white'} drop-shadow-md`} />
                            </button>
                            <button className="hover:scale-110 transition-transform">
                                <MoreHorizontal size={28} className="text-white drop-shadow-md" />
                            </button>
                            <div className="w-8 h-8 rounded-lg border-2 border-white overflow-hidden shadow-lg mt-2 cursor-pointer" onClick={() => onNavigateToProfile && onNavigateToProfile(reel.user.id)}>
                                <img src={reel.user.avatarUrl} className="w-full h-full object-cover" />
                            </div>
                        </div>
                    </div>
                );
            })}

            {loading && (
                <div className="flex justify-center items-center py-10 bg-black">
                    <Loader2 className="text-gold animate-spin" size={32} />
                </div>
            )}
        </div>
        
        {shareReel && (
            <ShareModal 
                onClose={() => setShareReel(null)}
                contentUrl={shareReel.imageUrl}
                contentType='video'
                onAddToStory={onAddToStory}
            />
        )}
        {activeCommentsReel && (
           <CommentsModal 
                postId={activeCommentsReel.id}
                postOwnerId={activeCommentsReel.user.id}
                postOwnerUsername={activeCommentsReel.user.username}
                postCaption={activeCommentsReel.caption}
                onClose={() => setActiveCommentsReel(null)}
                onNavigateToProfile={(uid) => { setActiveCommentsReel(null); onNavigateToProfile?.(uid); }}
           />
       )}
    </div>
  );
};

export default ReelsView;
