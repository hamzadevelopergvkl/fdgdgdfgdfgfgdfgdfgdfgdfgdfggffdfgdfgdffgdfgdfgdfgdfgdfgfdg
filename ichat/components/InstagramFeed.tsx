import React, { useEffect, useState, useRef } from 'react';
import { getFeed, likePost, savePost, commentPost } from '../services/api';
import { InstaPost } from '../types';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Share2 } from 'lucide-react';
import StoriesViewer, { Story } from './StoriesViewer';
import ShareModal from './ShareModal';

interface InstagramFeedProps {
    onNavigateToProfile?: (userId: string) => void;
}

const InstagramFeed: React.FC<InstagramFeedProps> = ({ onNavigateToProfile }) => {
  const [posts, setPosts] = useState<InstaPost[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [viewingStoryIndex, setViewingStoryIndex] = useState<number | null>(null);
  const [sharePost, setSharePost] = useState<InstaPost | null>(null);

  useEffect(() => {
    loadFeed();
    setStories([
        { id: 1, user: 'Your Story', avatar: 'https://via.placeholder.com/150', storyImage: 'https://picsum.photos/400/800?random=101', isUser: true, timestamp: '10m' },
        { id: 2, user: 'sarah_design', avatar: 'https://picsum.photos/id/65/200/200', storyImage: 'https://picsum.photos/400/800?random=102', timestamp: '1h' },
        { id: 3, user: 'mike_travels', avatar: 'https://picsum.photos/id/91/200/200', storyImage: 'https://picsum.photos/400/800?random=103', timestamp: '2h' },
        { id: 4, user: 'jenna_foodie', avatar: 'https://picsum.photos/id/129/200/200', storyImage: 'https://picsum.photos/400/800?random=104', timestamp: '3h' },
    ]);
  }, []);

  const loadFeed = () => {
      getFeed().then(data => setPosts(data));
  };

  const handleLike = async (post: InstaPost) => {
      // Optimistic Update
      const originalPosts = [...posts];
      const newHasLiked = !post.hasLiked;
      
      setPosts(prev => prev.map(p => {
          if (p.id === post.id) {
              return { 
                  ...p, 
                  hasLiked: newHasLiked,
                  likesCount: newHasLiked ? p.likesCount + 1 : p.likesCount - 1
              };
          }
          return p;
      }));

      try {
          await likePost(post.id);
      } catch (error) {
          console.error("Like failed", error);
          setPosts(originalPosts); // Revert on failure
      }
  };

  const handleSave = async (post: InstaPost) => {
      // Optimistic Update
      const originalPosts = [...posts];
      const newIsSaved = !post.isSaved;

      setPosts(prev => prev.map(p => {
          if (p.id === post.id) return { ...p, isSaved: newIsSaved };
          return p;
      }));

      try {
          await savePost(post.id);
      } catch (error) {
          console.error("Save failed", error);
          setPosts(originalPosts); // Revert
      }
  };

  const Post: React.FC<{ post: InstaPost }> = ({ post }) => {
      const [showBigHeart, setShowBigHeart] = useState(false);

      const handleDoubleTap = () => {
          setShowBigHeart(true);
          setTimeout(() => setShowBigHeart(false), 1000);
          if (!post.hasLiked) {
              handleLike(post);
          }
      };

      return (
        <div className="relative w-full max-w-lg mx-auto mb-10 group">
            {/* Main Card Container */}
            <div className="relative rounded-[2rem] overflow-hidden shadow-2xl bg-white dark:bg-zinc-900 aspect-[4/5] transition-all duration-300 hover:shadow-gold/20">
                
                {/* Background Image/Video */}
                <div className="relative w-full h-full" onDoubleClick={handleDoubleTap}>
                    <img 
                        src={post.imageUrl} 
                        alt="Post" 
                        className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${post.filterClass || ''}`}
                    />
                    {/* Big Heart Animation */}
                    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-300 ${showBigHeart ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                        <Heart size={120} className="fill-white text-white drop-shadow-2xl animate-bounce" />
                    </div>
                </div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 opacity-90 pointer-events-none"></div>

                {/* Header (User Info) */}
                <div className="absolute top-0 left-0 p-5 flex items-center space-x-3 z-10 w-full">
                    <div 
                        className="p-[2px] bg-white/30 backdrop-blur-sm rounded-full cursor-pointer transition-transform hover:scale-110"
                        onClick={(e) => { e.stopPropagation(); onNavigateToProfile?.(post.user.id); }}
                    >
                        <img src={post.user.avatarUrl} alt={post.user.username} className="w-10 h-10 rounded-full object-cover border-2 border-white/80" />
                    </div>
                    <div className="flex flex-col text-white cursor-pointer" onClick={(e) => { e.stopPropagation(); onNavigateToProfile?.(post.user.id); }}>
                        <span className="font-bold text-sm tracking-wide drop-shadow-md">{post.user.username}</span>
                        {post.location && <span className="text-[10px] opacity-80 flex items-center"><span className="w-1 h-1 bg-gold rounded-full mr-1"></span>{post.location}</span>}
                    </div>
                    <div className="ml-auto">
                        <button className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors">
                            <MoreHorizontal size={20} />
                        </button>
                    </div>
                </div>

                {/* Content Overlay (Bottom) */}
                <div className="absolute bottom-0 left-0 w-full p-6 z-10 pr-16">
                    <p className="text-white text-sm font-medium leading-relaxed drop-shadow-md line-clamp-2 mb-2">
                        <span className="font-bold mr-2 cursor-pointer" onClick={() => onNavigateToProfile?.(post.user.id)}>{post.user.username}</span>
                        {post.caption}
                    </p>
                    <div className="text-[10px] text-white/60 uppercase tracking-widest font-bold">
                        {new Date(post.timestamp).toLocaleDateString()}
                    </div>
                </div>

                {/* Floating Action Bar (Right) */}
                <div className="absolute bottom-6 right-4 flex flex-col items-center space-y-4 z-20">
                    <div className="flex flex-col items-center group/btn">
                        <button 
                            onClick={() => handleLike(post)}
                            className={`p-3 rounded-full backdrop-blur-md shadow-lg transition-all duration-300 ${post.hasLiked ? 'bg-red-500/90 text-white scale-110' : 'bg-white/10 text-white hover:bg-white/20 hover:scale-110'}`}
                        >
                            <Heart size={24} fill={post.hasLiked ? "currentColor" : "none"} />
                        </button>
                        <span className="text-xs text-white font-bold mt-1 shadow-black drop-shadow-lg">{post.likesCount}</span>
                    </div>

                    <div className="flex flex-col items-center">
                        <button className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 shadow-lg transition-all hover:scale-110">
                            <MessageCircle size={24} />
                        </button>
                        <span className="text-xs text-white font-bold mt-1 shadow-black drop-shadow-lg">{post.commentsCount}</span>
                    </div>

                    <button 
                        onClick={() => handleSave(post)}
                        className={`p-3 rounded-full backdrop-blur-md shadow-lg transition-all hover:scale-110 ${post.isSaved ? 'bg-gold text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                        <Bookmark size={24} fill={post.isSaved ? "currentColor" : "none"} />
                    </button>

                    <button 
                        onClick={() => setSharePost(post)}
                        className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 shadow-lg transition-all hover:scale-110"
                    >
                        <Share2 size={24} />
                    </button>
                </div>
            </div>
        </div>
      );
  };

  return (
    <div className="flex w-full justify-center min-h-screen pt-4 pb-4">
       {viewingStoryIndex !== null && (
           <StoriesViewer 
               stories={stories} 
               initialIndex={viewingStoryIndex} 
               onClose={() => setViewingStoryIndex(null)} 
           />
       )}

       <div className="flex flex-col w-full px-4">
          
          {/* Stories - Horizontal Scroll with clean look */}
          <div className="mb-8 w-full max-w-lg mx-auto">
             <div className="flex space-x-4 overflow-x-auto scrollbar-hide py-2">
                {stories.map((story, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => setViewingStoryIndex(idx)}
                        className="flex flex-col items-center space-y-2 min-w-[70px] cursor-pointer group"
                    >
                        <div className={`p-[2px] rounded-[24px] ${story.isUser ? 'bg-gray-200 dark:bg-zinc-700' : 'bg-gradient-to-tr from-gold to-orange-500'} group-hover:scale-105 transition-transform duration-300`}>
                            <div className="bg-cream dark:bg-navy-deep p-[2px] rounded-[22px]">
                                <img src={story.avatar} className="w-16 h-16 rounded-[20px] object-cover" alt={story.user} />
                            </div>
                        </div>
                        <span className="text-[10px] w-16 truncate text-center text-navy dark:text-gray-300 font-medium tracking-wide">{story.user}</span>
                    </div>
                ))}
             </div>
          </div>

          {/* Posts Feed */}
          <div className="flex flex-col">
             {posts.map(post => <Post key={post.id} post={post} />)}
          </div>
       </div>

       {sharePost && (
           <ShareModal 
                onClose={() => setSharePost(null)}
                contentUrl={sharePost.imageUrl}
                contentType={sharePost.type === 'reel' ? 'video' : 'image'}
           />
       )}
    </div>
  );
};

export default InstagramFeed;