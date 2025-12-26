import React, { useState } from 'react';
import { X, User as UserIcon } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
  currentUser: { displayName: string; avatarUrl: string };
  targetLanguage: string;
  onUpdateProfile: (name: string, avatar: string, language: string) => void;
}

const LANGUAGES = [
  "Roman Urdu",
  "English",
  "Spanish",
  "French",
  "German",
  "Chinese",
  "Hindi",
  "Arabic",
  "Russian",
  "Japanese"
];

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, currentUser, targetLanguage, onUpdateProfile }) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl);
  const [language, setLanguage] = useState(targetLanguage);

  const handleSave = () => {
    onUpdateProfile(displayName, avatarUrl, language);
    onClose();
  };

  return (
    <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
          <h2 className="text-lg font-bold dark:text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center">
            <div className="relative w-24 h-24 mb-4">
              <img 
                src={avatarUrl || 'https://via.placeholder.com/150'} 
                alt="Profile" 
                className="w-full h-full rounded-full object-cover border-4 border-gray-100 dark:border-zinc-800"
              />
              <div className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-1.5 text-white border-2 border-white dark:border-zinc-900">
                 <UserIcon size={14} />
              </div>
            </div>
            <div className="w-full">
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Avatar URL</label>
                <input 
                    type="text" 
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                    placeholder="https://..."
                />
            </div>
          </div>

          {/* Name Section */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Display Name</label>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>

          {/* Language Section */}
          <div>
             <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Translation Language</label>
             <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
             >
                 {LANGUAGES.map(lang => (
                     <option key={lang} value={lang}>{lang}</option>
                 ))}
             </select>
             <p className="text-xs text-gray-400 mt-1">Messages will be translated into this language.</p>
          </div>

          <button 
            onClick={handleSave}
            className="w-full bg-[#0095f6] hover:bg-[#1877f2] text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;