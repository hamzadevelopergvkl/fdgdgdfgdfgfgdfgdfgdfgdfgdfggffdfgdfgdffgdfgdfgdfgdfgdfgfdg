export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  isOnline: boolean;
  lastSeen?: Date | string;
  publicKey?: string;
  timezone?: string;
  settings?: {
      isPrivate: boolean;
      language: string;
      autoTranslate: boolean;
      timezone: string;
      themeColor: string;
      highContrast: boolean;
      dataSaver: boolean;
      fontSize: string;
      pushLikes: boolean;
      pushComments: boolean;
      pushFollowers: boolean;
  };
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio'
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  QUEUED = 'queued'
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string; 
  type: MessageType;
  timestamp: Date | string;
  status: MessageStatus;
  reactions: Record<string, string>;
  translation?: string;
  expiresAt?: Date | string;
  isEncrypted?: boolean;
}

export interface Chat {
  id: string;
  type: 'direct' | 'group';
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  name?: string;
  isTyping?: boolean;
  isRequest?: boolean; 
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface InstaPost {
    id: string;
    imageUrl: string;
    caption: string;
    location: string;
    likesCount: number;
    commentsCount: number;
    timestamp: string;
    type?: 'image' | 'reel';
    user: {
        id: string;
        username: string;
        avatarUrl: string;
        isFollowing?: boolean;
    };
    hasLiked: boolean;
    isSaved: boolean;
    filterClass?: string;
    comments: {
        id: string;
        username: string;
        content: string;
    }[];
}

export interface Notification {
    id: string;
    type: 'like' | 'comment' | 'follow';
    actor: {
        username: string;
        avatarUrl: string;
    };
    postImage?: string;
    read: boolean;
    createdAt: string;
}