import React, { useEffect, useState } from 'react';
import { getNotifications } from '../services/api';
import { Notification } from '../types';
import { Heart, MessageCircle, UserPlus } from 'lucide-react';

const NotificationsView: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getNotifications().then(data => {
            setNotifications(data);
            setLoading(false);
        });
    }, []);

    const getIcon = (type: string) => {
        switch (type) {
            case 'like': return <Heart size={16} className="text-white fill-white" />;
            case 'comment': return <MessageCircle size={16} className="text-white fill-white" />;
            case 'follow': return <UserPlus size={16} className="text-white fill-white" />;
            default: return null;
        }
    };

    const getBgColor = (type: string) => {
        switch (type) {
            case 'like': return 'bg-red-500';
            case 'comment': return 'bg-blue-500';
            case 'follow': return 'bg-purple-500';
            default: return 'bg-gray-500';
        }
    };

    const getMessage = (type: string) => {
        switch (type) {
            case 'like': return 'liked your post.';
            case 'comment': return 'commented: ';
            case 'follow': return 'started following you.';
            default: return '';
        }
    };

    return (
        <div className="flex justify-center bg-white dark:bg-black min-h-screen pt-4 pb-4">
            <div className="w-full max-w-[600px]">
                <h2 className="text-2xl font-bold px-4 mb-6 dark:text-white">Notifications</h2>
                
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">No notifications yet.</div>
                ) : (
                    <div className="flex flex-col">
                        {notifications.map(notif => (
                            <div key={notif.id} className="flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer">
                                <div className="relative mr-3">
                                    <img src={notif.actor.avatarUrl} alt={notif.actor.username} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-zinc-700" />
                                    <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-white dark:border-black ${getBgColor(notif.type)}`}>
                                        {getIcon(notif.type)}
                                    </div>
                                </div>
                                <div className="flex-1 text-sm dark:text-white">
                                    <span className="font-bold mr-1">{notif.actor.username}</span>
                                    <span className="text-gray-600 dark:text-gray-300">{getMessage(notif.type)}</span>
                                    <div className="text-xs text-gray-400 mt-0.5">{new Date(notif.createdAt).toLocaleDateString()}</div>
                                </div>
                                {notif.postImage && (
                                    <div className="w-10 h-10 ml-2">
                                        <img src={notif.postImage} className="w-full h-full object-cover rounded" />
                                    </div>
                                )}
                                {notif.type === 'follow' && (
                                    <button className="ml-2 px-3 py-1.5 bg-[#0095f6] text-white text-xs font-bold rounded-lg hover:bg-[#1877f2]">
                                        Follow
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsView;