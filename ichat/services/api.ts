import axios from 'axios';
import { User, Chat, Message, MessageType, InstaPost, Notification } from '../types';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const loginUser = async (email: string, password: string): Promise<{ token: string, user: User }> => {
  const res = await api.post('/auth/login', { email, password });
  return res.data;
};

export const registerUser = async (username: string, email: string, password: string, displayName: string, publicKey?: string): Promise<{ token: string, user: User }> => {
  const res = await api.post('/auth/register', { username, email, password, displayName, publicKey });
  return res.data;
};

export const getMe = async (): Promise<User> => {
  const res = await api.get('/auth/me');
  return res.data;
};

export const updateProfile = async (
    displayName: string, 
    avatarUrl: string, 
    settings: any,
    bio?: string,
    website?: string
): Promise<User> => {
    const res = await api.put('/auth/me', { 
        displayName, 
        avatarUrl, 
        bio,
        website,
        ...settings 
    });
    return res.data;
};

export const updateUserPublicKey = async (publicKey: string): Promise<void> => {
    await api.put('/auth/key', { publicKey });
};

export const getUserProfile = async (userId: string): Promise<any> => {
    const res = await api.get(`/users/${userId}/profile`);
    return res.data;
};

export const followUser = async (userId: string): Promise<void> => {
    await api.post(`/users/${userId}/follow`);
};

export const unfollowUser = async (userId: string): Promise<void> => {
    await api.delete(`/users/${userId}/follow`);
};

export const wipeDatabase = async (): Promise<void> => {
    await api.post('/admin/reset');
};

// --- CHAT API ---

export const getChats = async (): Promise<Chat[]> => {
  const res = await api.get('/chat');
  return res.data;
};

export const getMessages = async (chatId: string): Promise<Message[]> => {
  const res = await api.get(`/chat/${chatId}/messages`);
  return res.data;
};

export const sendMessage = async (chatId: string, content: string, type: MessageType, expiresAt?: Date): Promise<Message> => {
  const res = await api.post(`/chat/${chatId}/messages`, { content, type, expiresAt });
  return res.data;
};

export const markChatRead = async (chatId: string): Promise<void> => {
    await api.put(`/chat/${chatId}/read`);
};

export const sendReaction = async (chatId: string, messageId: string, emoji: string): Promise<{id: string, chatId: string, reactions: Record<string, string>}> => {
    const res = await api.post(`/chat/messages/${messageId}/react`, { emoji });
    return res.data;
};

export const searchUsers = async (query: string): Promise<User[]> => {
  const res = await api.get(`/users/search?q=${query}`);
  return res.data;
};

export const startDirectChat = async (recipientId: string): Promise<Chat> => {
  const res = await api.post('/chat/direct', { recipientId });
  return res.data;
};

export const acceptChat = async (chatId: string): Promise<void> => {
  await api.put(`/chat/${chatId}/accept`);
};

export const deleteChat = async (chatId: string): Promise<void> => {
  await api.delete(`/chat/${chatId}`);
};

// --- FEED API ---

export const getFeed = async (): Promise<InstaPost[]> => {
    const res = await api.get('/feed');
    return res.data;
};

export const getReels = async (offset: number = 0, limit: number = 3, interests: string[] = []): Promise<InstaPost[]> => {
    const interestStr = interests.length > 0 ? `&interests=${interests.join(',')}` : '';
    const res = await api.get(`/feed/reels?offset=${offset}&limit=${limit}${interestStr}`);
    return res.data;
};

export const getUserPosts = async (userId: string): Promise<InstaPost[]> => {
    const res = await api.get(`/feed/user/${userId}`);
    return res.data;
};

export const getSavedPosts = async (): Promise<InstaPost[]> => {
    const res = await api.get('/feed/saved');
    return res.data;
};

export const createPost = async (imageUrl: string, caption: string, location: string, filterClass?: string, type: 'image' | 'reel' = 'image'): Promise<void> => {
    await api.post('/feed', { imageUrl, caption, location, filterClass, type });
};

export const likePost = async (postId: string): Promise<{ liked: boolean }> => {
    const res = await api.post(`/feed/${postId}/like`);
    return res.data;
};

export const getComments = async (postId: string): Promise<any[]> => {
    const res = await api.get(`/feed/${postId}/comments`);
    return res.data;
};

export const commentPost = async (postId: string, content: string): Promise<any> => {
    const res = await api.post(`/feed/${postId}/comments`, { content });
    return res.data;
};

export const likeComment = async (commentId: string): Promise<{ liked: boolean }> => {
    const res = await api.post(`/feed/comments/${commentId}/like`);
    return res.data;
};

export const savePost = async (postId: string): Promise<{ saved: boolean }> => {
    const res = await api.post(`/feed/${postId}/save`);
    return res.data;
};

export const getNotifications = async (): Promise<Notification[]> => {
    const res = await api.get('/users/notifications');
    return res.data;
};

export default api;