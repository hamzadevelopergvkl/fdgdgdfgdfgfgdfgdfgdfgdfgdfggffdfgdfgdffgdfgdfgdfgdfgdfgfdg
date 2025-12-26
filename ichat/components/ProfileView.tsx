import React, { useEffect, useState } from 'react';
import { User, InstaPost } from '../types';
import { getUserProfile, getUserPosts, followUser, unfollowUser, getSavedPosts } from '../services/api';
import { Grid, Film, UserSquare, Settings, MapPin, Link as LinkIcon, Heart, Bookmark } from 'lucide-react';

interface ProfileViewProps {
    userId: string;
    onOpenSettings?: () => void;
}

interface UserProfile {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    bio: string;
    website: string;
    stats: {
        posts: number;
        followers: number;
        following: number;
    };
    isFollowing: boolean;
    isMe: boolean;
}

const ProfileView: React.FC<ProfileViewProps> = ({ userId, onOpenSettings }) => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [posts, setPosts] = useState<InstaPost[]>([]);
    const [savedPosts, setSavedPosts] = useState<InstaPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'saved' | 'tagged'>('posts');

    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        setProfile(null); 
        
        const promises: [Promise<any>, Promise<any>, Promise<any>?] = [
            getUserProfile(userId),
            getUserPosts(userId)
        ];

        // Only fetch saved posts if viewing own profile
        // Note: isMe is determined after profile fetch, so we fetch it separately or later
        
        Promise.all(promises).then(([profileData, postsData]) => {
            setProfile(profileData);
            setPosts(postsData || []);
            
            if (profileData.isMe) {
                getSavedPosts().then(data => setSavedPosts(data || []));
            }
            
            setLoading(false);
        }).catch(err => {
            console.error("Failed to fetch profile", err);
            setLoading(false);
        });
    }, [userId]);

    const handleFollowToggle = async () => {
        if (!profile) return;
        const newStatus = !profile.isFollowing;
        setProfile(prev => prev ? ({
            ...prev,
            isFollowing: newStatus,
            stats: {
                ...prev.stats,
                followers: newStatus ? prev.stats.followers + 1 : prev.stats.followers - 1
            }
        }) : null);

        try {
            if (newStatus) await followUser(profile.id);
            else await unfollowUser(profile.id);
        } catch (e) {
            console.error("Follow failed", e);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[50vh]">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-gold rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <h3 className="text-xl font-bold text-navy dark:text-white mb-2">User not found</h3>
                <p className="text-gray-500">The link you followed may be broken, or the page may have been removed.</p>
            </div>
        );
    }

    const currentDisplayPosts = activeTab === 'saved' ? savedPosts : posts;

    return (
        <div className="flex justify-center min-h-screen pb-4">
            <div className="w-full max-w-4xl px-4 pt-8">
                
                {/* Profile Header - Centered Layout */}
                <div className="flex flex-col items-center text-center mb-10">
                    <div className="relative mb-4">
                        <div className="w-28 h-28 p-1 rounded-full bg-gradient-to-tr from-gold to-orange-500 shadow-xl">
                            <img 
                                src={profile.avatarUrl} 
                                alt={profile.username} 
                                className="w-full h-full rounded-full object-cover border-4 border-cream dark:border-black" 
                            />
                        </div>
                        {profile.isMe && (
                            <button 
                                onClick={onOpenSettings}
                                className="absolute bottom-0 right-0 p-2 bg-white dark:bg-zinc-800 text-navy dark:text-white rounded-full shadow-md border border-gray-100 dark:border-zinc-700 hover:bg-gray-50 transition-colors"
                            >
                                <Settings size={16} />
                            </button>
                        )}
                    </div>

                    <h2 className="text-2xl font-bold text-navy dark:text-white mb-1">{profile.displayName}</h2>
                    <p className="text-sm text-gray-500 font-medium mb-4">@{profile.username}</p>

                    {profile.bio && (
                        <p className="text-sm text-navy/80 dark:text-gray-300 max-w-md leading-relaxed mb-3">
                            {profile.bio}
                        </p>
                    )}

                    {profile.website && (
                        <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center text-gold hover:underline text-xs font-semibold mb-6">
                            <LinkIcon size={12} className="mr-1" />
                            {profile.website.replace(/^https?:\/\//, '')}
                        </a>
                    )}

                    {/* Stats Pills */}
                    <div className="flex items-center space-x-2 mb-6 bg-white dark:bg-zinc-900 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                        <div className="px-6 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors">
                            <span className="block font-bold text-lg text-navy dark:text-white">{profile.stats.posts}</span>
                            <span className="text-[10px] uppercase tracking-wider text-gray-400">Posts</span>
                        </div>
                        <div className="w-px h-8 bg-gray-200 dark:bg-zinc-800"></div>
                        <div className="px-6 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors">
                            <span className="block font-bold text-lg text-navy dark:text-white">{profile.stats.followers}</span>
                            <span className="text-[10px] uppercase tracking-wider text-gray-400">Followers</span>
                        </div>
                        <div className="w-px h-8 bg-gray-200 dark:bg-zinc-800"></div>
                        <div className="px-6 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors">
                            <span className="block font-bold text-lg text-navy dark:text-white">{profile.stats.following}</span>
                            <span className="text-[10px] uppercase tracking-wider text-gray-400">Following</span>
                        </div>
                    </div>

                    {!profile.isMe && (
                        <button 
                            onClick={handleFollowToggle}
                            className={`px-8 py-2.5 rounded-full text-sm font-bold shadow-lg transition-all transform hover:scale-105 ${profile.isFollowing ? 'bg-gray-200 dark:bg-zinc-800 text-navy dark:text-white' : 'bg-gold text-white hover:bg-gold-hover'}`}
                        >
                            {profile.isFollowing ? 'Following' : 'Follow'}
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex justify-center mb-6">
                    <div className="flex p-1 bg-gray-100 dark:bg-zinc-900 rounded-full overflow-x-auto scrollbar-hide">
                        <button 
                            onClick={() => setActiveTab('posts')}
                            className={`flex items-center space-x-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'posts' ? 'bg-white dark:bg-zinc-800 text-navy dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                        >
                            <Grid size={16} />
                            <span>Posts</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('reels')}
                            className={`flex items-center space-x-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'reels' ? 'bg-white dark:bg-zinc-800 text-navy dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                        >
                            <Film size={16} />
                            <span>Reels</span>
                        </button>
                        {profile.isMe && (
                            <button 
                                onClick={() => setActiveTab('saved')}
                                className={`flex items-center space-x-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'saved' ? 'bg-white dark:bg-zinc-800 text-navy dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                            >
                                <Bookmark size={16} />
                                <span>Saved</span>
                            </button>
                        )}
                        <button 
                            onClick={() => setActiveTab('tagged')}
                            className={`flex items-center space-x-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'tagged' ? 'bg-white dark:bg-zinc-800 text-navy dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                        >
                            <UserSquare size={16} />
                            <span>Tagged</span>
                        </button>
                    </div>
                </div>

                {/* Grid Content */}
                <div className="grid grid-cols-3 gap-1 md:gap-6">
                    {currentDisplayPosts.length === 0 ? (
                        <div className="col-span-3 py-20 text-center bg-gray-50 dark:bg-zinc-900 rounded-3xl">
                            <div className="w-16 h-16 bg-gray-200 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                {activeTab === 'saved' ? <Bookmark size={32} /> : <Grid size={32} />}
                            </div>
                            <h3 className="text-lg font-bold text-navy dark:text-white mb-1">
                                {activeTab === 'saved' ? 'No Saved Posts' : 'No Posts Yet'}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {activeTab === 'saved' ? 'Saved photos and videos will appear here.' : 'Share your first photo with the world.'}
                            </p>
                        </div>
                    ) : (
                        currentDisplayPosts.map(post => (
                            <div key={post.id} className="relative group cursor-pointer aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-zinc-900">
                                <img 
                                    src={post.imageUrl} 
                                    alt="Post" 
                                    className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${post.filterClass || ''}`} 
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white">
                                    <div className="flex items-center space-x-1 mb-2">
                                        <Heart size={24} fill="white" />
                                        <span className="font-bold text-lg">{post.likesCount}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileView;