import axios from 'axios';
import { User, Chat, Message, MessageType } from '../types';

// Dynamic URL: Uses the IP address in the browser bar.
// If you access via localhost, it uses localhost.
// If you access via 192.168.1.X, it uses that IP.
const BACKEND_PORT = '5000';
const API_URL = `http://${window.location.hostname}:${BACKEND_PORT}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to include the auth token
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

export const registerUser = async (username: string, email: string, password: string, displayName: string): Promise<{ token: string, user: User }> => {
  const res = await api.post('/auth/register', { username, email, password, displayName });
  return res.data;
};

export const getMe = async (): Promise<User> => {
  const res = await api.get('/auth/me');
  return res.data;
};

export const getChats = async (): Promise<Chat[]> => {
  const res = await api.get('/chat');
  return res.data;
};

export const getMessages = async (chatId: string): Promise<Message[]> => {
  const res = await api.get(`/chat/${chatId}/messages`);
  return res.data;
};

export const sendMessage = async (chatId: string, content: string, type: MessageType): Promise<Message> => {
  const res = await api.post(`/chat/${chatId}/messages`, { content, type });
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

export default api;
