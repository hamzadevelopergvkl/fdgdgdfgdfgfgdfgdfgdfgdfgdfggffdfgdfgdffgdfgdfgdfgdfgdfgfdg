import { User, Chat, Message, MessageType, MessageStatus } from './types';

export const BOT_USER: User = {
  id: '0', // Matches seeded backend user ID
  username: 'ai_assistant',
  displayName: 'AI Assistant',
  avatarUrl: 'https://cdn-icons-png.flaticon.com/512/4712/4712035.png', 
  isOnline: true,
  settings: {
      isPrivate: false,
      language: 'English',
      autoTranslate: false,
      timezone: 'UTC',
      themeColor: 'formal',
      highContrast: false,
      dataSaver: false,
      fontSize: 'default',
      pushLikes: true,
      pushComments: true,
      pushFollowers: true
  }
};

export const CURRENT_USER: User = {
  id: 'u1',
  username: 'alex_dev',
  displayName: 'Alex Developer',
  avatarUrl: 'https://picsum.photos/id/64/200/200',
  isOnline: true,
};

export const MOCK_USERS: User[] = [
{
  id: 'u2',
  username: 'sarah_design',
  displayName: 'Sarah Designer',
  avatarUrl: 'https://picsum.photos/id/65/200/200',
  isOnline: true,
}
];

export const MOCK_CHATS: Chat[] = [];
export const MOCK_MESSAGES: Message[] = [];