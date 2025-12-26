import React, { useState, useRef } from 'react';
import { X, User as UserIcon, Globe, Eye, Bell, Shield, ChevronRight, Moon, Upload, RefreshCw, Smartphone, Palette, Globe2 } from 'lucide-react';
import { wipeDatabase } from '../services/api';

interface SettingsModalProps {
  onClose: () => void;
  currentUser: any;
  targetLanguage: string;
  onUpdateProfile: (name: string, avatar: string, language: string, timezone: string, themeColor: string) => void;
  darkMode: boolean;
  onToggleTheme: () => void;
}

const LANGUAGES = ["Roman Urdu", "Urdu (Native)", "French", "German", "Chinese", "Hindi", "Arabic", "Russian", "Japanese", "English", "Spanish"];
const TIMEZONES = (Intl as any).supportedValuesOf('timeZone');
const FONT_SIZES = ["Small", "Default", "Large"];

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, currentUser, onUpdateProfile, darkMode, onToggleTheme }) => {
  const [activeTab, setActiveTab] = useState('account');
  const [resetting, setResetting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
      displayName: currentUser.displayName,
      avatarUrl: currentUser.avatarUrl,
      bio: currentUser.bio || '',
      website: currentUser.website || '',
      isPrivate: currentUser.settings?.isPrivate || false,
      language: currentUser.settings?.language || 'Roman Urdu',
      autoTranslate: currentUser.settings?.autoTranslate || false,
      timezone: currentUser.settings?.timezone || 'UTC',
      highContrast: currentUser.settings?.highContrast || false,
      dataSaver: currentUser.settings?.dataSaver || false,
      fontSize: currentUser.settings?.fontSize || 'Default',
      pushLikes: currentUser.settings?.pushLikes !== false,
      pushComments: currentUser.settings?.pushComments !== false,
      pushFollowers: currentUser.settings?.pushFollowers !== false,
  });

  const handleChange = (key: string, value: any) => {
      setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
      const settings = {
          isPrivate: formData.isPrivate,
          language: formData.language,
          autoTranslate: formData.autoTranslate,
          timezone: formData.timezone,
          themeColor: 'formal',
          highContrast: formData.highContrast,
          dataSaver: formData.dataSaver,
          fontSize: formData.fontSize,
          pushLikes: formData.pushLikes,
          pushComments: formData.pushComments,
          pushFollowers: formData.pushFollowers
      };

      import('../services/api').then(({ updateProfile }) => {
          updateProfile(
              formData.displayName, 
              formData.avatarUrl, 
              settings,
              formData.bio,
              formData.website
          ).then(() => {
              onClose();
              window.location.reload();
          });
      });
  };

  const handleFactoryReset = async () => {
      if (!confirm("WARNING: This will PERMANENTLY delete ALL users, posts, chats, and data for EVERYONE. Are you absolutely sure?")) return;
      setResetting(true);
      try {
          await wipeDatabase();
          localStorage.clear();
          window.location.href = '/';
      } catch (e) {
          console.error(e);
          alert("Reset failed");
          setResetting(false);
      }
  };

  const Toggle = ({ checked, onChange, label, sublabel }: any) => (
      <div className="flex items-center justify-between py-3">
          <div>
              <p className="text-sm font-semibold text-navy dark:text-white">{label}</p>
              {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
          </div>
          <button 
              onClick={() => onChange(!checked)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-gold' : 'bg-gray-200 dark:bg-zinc-700'}`}
          >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
      </div>
  );

  const SidebarItem = ({ id, label, icon: Icon }: any) => (
      <button 
          onClick={() => setActiveTab(id)}
          className={`w-full flex items-center justify-between p-3 rounded-lg mb-1 transition-colors ${activeTab === id ? 'bg-gray-100 dark:bg-zinc-800 font-semibold' : 'hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-600 dark:text-gray-400'}`}
      >
          <div className="flex items-center space-x-3">
              <Icon size={20} />
              <span>{label}</span>
          </div>
          <ChevronRight size={16} className="opacity-50" />
      </button>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-black w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-gray-200 dark:border-zinc-800">
        
        <div className="w-full md:w-64 bg-white dark:bg-black border-b md:border-b-0 md:border-r border-gray-200 dark:border-zinc-800 flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-zinc-800">
                <h2 className="text-xl font-bold dark:text-white">Settings</h2>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-1">
                <SidebarItem id="account" label="Account" icon={UserIcon} />
                <SidebarItem id="localization" label="Localization" icon={Globe} />
                <SidebarItem id="display" label="Display" icon={Eye} />
                <SidebarItem id="notifications" label="Notifications" icon={Bell} />
                <SidebarItem id="security" label="System" icon={Shield} />
            </div>
        </div>

        <div className="flex-1 flex flex-col bg-white dark:bg-black overflow-hidden relative">
            <div className="absolute top-4 right-4 z-10">
                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                    <X size={24} className="text-gray-800 dark:text-white" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
                
                {activeTab === 'account' && (
                    <div className="space-y-8 max-w-lg">
                        <div className="flex items-center space-x-6">
                            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <img src={formData.avatarUrl} className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 dark:border-zinc-700" />
                                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Upload className="text-white" size={20} />
                                </div>
                            </div>
                            <input type="file" ref={fileInputRef} onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => handleChange('avatarUrl', reader.result as string);
                                    reader.readAsDataURL(file);
                                }
                            }} className="hidden" accept="image/*" />
                            <div>
                                <h3 className="font-bold text-lg dark:text-white">{formData.displayName}</h3>
                                <button onClick={() => fileInputRef.current?.click()} className="text-blue-500 text-sm font-semibold">Change Photo</button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Display Name</label>
                                <input type="text" value={formData.displayName} onChange={(e) => handleChange('displayName', e.target.value)} className="w-full p-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg dark:text-white outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Bio</label>
                                <textarea value={formData.bio} onChange={(e) => handleChange('bio', e.target.value)} rows={3} className="w-full p-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg dark:text-white outline-none resize-none" />
                            </div>
                            <div className="pt-4 border-t border-gray-50 dark:border-zinc-800">
                                <Toggle 
                                    label="Private Account" 
                                    sublabel="Only followers can see your posts and stories."
                                    checked={formData.isPrivate} 
                                    onChange={(v) => handleChange('isPrivate', v)} 
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'localization' && (
                    <div className="space-y-8 max-w-lg">
                        <div>
                            <h3 className="font-bold text-lg mb-6 dark:text-white">Regional Settings</h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Your Timezone</label>
                                    <div className="relative">
                                        <select 
                                            value={formData.timezone} 
                                            onChange={(e) => handleChange('timezone', e.target.value)} 
                                            className="w-full p-3 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg dark:text-white outline-none appearance-none"
                                        >
                                            {(TIMEZONES as string[]).map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                                        </select>
                                        <Globe2 className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={18} />
                                    </div>
                                    <p className="text-[10px] text-gold mt-2 font-semibold">Important: This is how others see your local time in chat.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">App Language</label>
                                    <select value={formData.language} onChange={(e) => handleChange('language', e.target.value)} className="w-full p-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg dark:text-white outline-none">
                                        {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <Toggle 
                                    label="Auto-Translate" 
                                    sublabel="Automatically translate incoming messages."
                                    checked={formData.autoTranslate} 
                                    onChange={(v) => handleChange('autoTranslate', v)} 
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'display' && (
                    <div className="space-y-8 max-w-lg">
                        <h3 className="font-bold text-lg dark:text-white">Appearance</h3>
                        <div className="space-y-2">
                            <Toggle 
                                label="Dark Mode" 
                                checked={darkMode} 
                                onChange={onToggleTheme} 
                            />
                            <Toggle 
                                label="High Contrast" 
                                sublabel="Improves visibility for visual impairments."
                                checked={formData.highContrast} 
                                onChange={(v) => handleChange('highContrast', v)} 
                            />
                             <Toggle 
                                label="Data Saver" 
                                sublabel="Reduces image quality to save mobile data."
                                checked={formData.dataSaver} 
                                onChange={(v) => handleChange('dataSaver', v)} 
                            />
                            <div className="py-3">
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Font Size</label>
                                <div className="flex gap-2">
                                    {FONT_SIZES.map(f => (
                                        <button 
                                            key={f}
                                            onClick={() => handleChange('fontSize', f)}
                                            className={`flex-1 py-2 rounded-lg text-sm border transition-all ${formData.fontSize === f ? 'bg-gold text-white border-gold' : 'border-gray-200 dark:border-zinc-700 dark:text-gray-400'}`}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <div className="space-y-6 max-w-lg">
                        <h3 className="font-bold text-lg dark:text-white">Push Notifications</h3>
                        <div className="divide-y divide-gray-50 dark:divide-zinc-800">
                            <Toggle 
                                label="Likes" 
                                checked={formData.pushLikes} 
                                onChange={(v) => handleChange('pushLikes', v)} 
                            />
                            <Toggle 
                                label="Comments" 
                                checked={formData.pushComments} 
                                onChange={(v) => handleChange('pushComments', v)} 
                            />
                            <Toggle 
                                label="Followers" 
                                checked={formData.pushFollowers} 
                                onChange={(v) => handleChange('pushFollowers', v)} 
                            />
                        </div>
                    </div>
                )}


            </div>

            <div className="p-4 border-t border-gray-200 dark:border-zinc-800 flex justify-end">
                <button onClick={handleSave} className="bg-gold hover:bg-gold-hover text-white font-bold py-2.5 px-8 rounded-full transition-all shadow-lg active:scale-95">
                    Save Changes
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
