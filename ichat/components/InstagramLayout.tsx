import React from 'react';
import { Home, Search, Heart, PlusSquare, MessageCircle, Menu, Film } from 'lucide-react';

interface InstagramLayoutProps {
  children: React.ReactNode;
  onNavigate: (view: string) => void;
  currentView: string;
  currentUser: any;
  unreadCount?: number;
  onOpenSettings: () => void;
}

const InstagramLayout: React.FC<InstagramLayoutProps> = ({ children, onNavigate, currentView, currentUser, unreadCount = 0, onOpenSettings }) => {
  
  return (
    <div className="flex flex-col h-screen w-full bg-cream dark:bg-black font-sans transition-colors duration-300 overflow-hidden">
      
      {/* Top Header Bar */}
      <div className="h-16 flex items-center justify-between px-2 md:px-6 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800 z-40 fixed top-0 left-0 right-0 shadow-sm transition-colors duration-300">
          
          {/* Left: Logo */}
          <div className="flex items-center space-x-2 cursor-pointer flex-shrink-0" onClick={() => onNavigate('home')}>
             <div className="w-8 h-8 bg-gradient-to-tr from-gold via-orange-500 to-red-500 rounded-lg flex items-center justify-center text-white font-serif font-bold text-xl shadow-lg">S</div>
             <h1 className="text-2xl font-serif text-navy dark:text-white tracking-tight hidden md:block">Shadow</h1>
          </div>

          {/* Right: Nav Items - Consolidating everything here */}
          <div className="flex items-center justify-end flex-1 space-x-0 md:space-x-2 overflow-x-auto scrollbar-hide">
              
              <NavButton icon={Home} isActive={currentView === 'home'} onClick={() => onNavigate('home')} />
              
              <NavButton icon={Search} isActive={currentView === 'search'} onClick={() => onNavigate('search')} />
              
              <NavButton icon={Film} isActive={currentView === 'reels'} onClick={() => onNavigate('reels')} />

              <NavButton icon={PlusSquare} isActive={currentView === 'create'} onClick={() => onNavigate('create')} />

              <NavButton icon={MessageCircle} isActive={currentView === 'messages'} onClick={() => onNavigate('messages')} badge={unreadCount} />

              <button 
                onClick={() => onNavigate('notifications')}
                className={`p-2 md:p-3 relative rounded-full transition-all duration-200 group ${currentView === 'notifications' ? 'bg-gray-100 dark:bg-zinc-800 text-gold' : 'text-gray-500 dark:text-gray-400 hover:text-navy dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
              >
                  <Heart size={24} strokeWidth={currentView === 'notifications' ? 2.5 : 2} />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              <button 
                onClick={() => onNavigate('profile')}
                className={`p-1 md:p-1.5 rounded-full transition-all ${currentView === 'profile' ? 'bg-gray-100 dark:bg-zinc-800' : 'hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
              >
                 <div className={`rounded-full p-[2px] ${currentView === 'profile' ? 'bg-gold' : 'bg-transparent'}`}>
                    <img 
                        src={currentUser.avatarUrl} 
                        className="w-7 h-7 rounded-full object-cover" 
                        alt="Profile" 
                    />
                 </div>
              </button>

              <button 
                onClick={onOpenSettings}
                className="p-2 md:p-3 text-gray-500 dark:text-gray-400 hover:text-navy dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                  <Menu size={24} />
              </button>
          </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pt-16 pb-0 scrollbar-hide bg-cream dark:bg-black transition-colors duration-300">
        {children}
      </div>

    </div>
  );
};

const NavButton = ({ icon: Icon, isActive, onClick, className = '', badge = 0 }: any) => (
    <button 
        onClick={onClick}
        className={`p-2 md:p-3 relative rounded-full transition-all duration-200 group ${isActive ? 'bg-gray-100 dark:bg-zinc-800 text-gold' : 'text-gray-500 dark:text-gray-400 hover:text-navy dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-800'} ${className}`}
    >
        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
        {badge > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white ring-2 ring-white dark:ring-navy">
                {badge}
            </span>
        )}
    </button>
);

export default InstagramLayout;