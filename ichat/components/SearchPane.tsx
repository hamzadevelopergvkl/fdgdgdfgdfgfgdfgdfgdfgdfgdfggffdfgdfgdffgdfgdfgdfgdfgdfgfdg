import React, { useState, useEffect } from 'react';
import { Search, XCircle, User as UserIcon } from 'lucide-react';
import { searchUsers } from '../services/api';
import { User } from '../types';

interface SearchPaneProps {
    onNavigateToProfile?: (userId: string) => void;
}

const SearchPane: React.FC<SearchPaneProps> = ({ onNavigateToProfile }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
      if (query.trim().length > 1) {
          setIsSearching(true);
          const timeout = setTimeout(async () => {
              try {
                  const users = await searchUsers(query);
                  setResults(users);
              } catch (e) {
                  console.error(e);
              } finally {
                  setIsSearching(false);
              }
          }, 500); // 500ms Debounce
          return () => clearTimeout(timeout);
      } else {
          setResults([]);
          setIsSearching(false);
      }
  }, [query]);

  const handleUserClick = (userId: string) => {
      if (onNavigateToProfile) {
          onNavigateToProfile(userId);
      }
  };

  return (
    <div className="flex justify-center bg-white dark:bg-black min-h-screen pt-4 px-4 pb-4">
       <div className="w-full max-w-[600px] flex flex-col">
           {/* Search Input */}
           <div className="relative mb-6">
               <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                   <Search size={18} className="text-gray-400" />
               </div>
               <input 
                  type="text" 
                  className="w-full bg-gray-100 dark:bg-zinc-800 rounded-lg py-3 pl-10 pr-10 text-sm focus:outline-none dark:text-white"
                  placeholder="Search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
               />
               {query && (
                   <button onClick={() => setQuery('')} className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600">
                       <XCircle size={16} fill="currentColor" className="text-gray-300 dark:text-zinc-600" />
                   </button>
               )}
           </div>

           <div className="flex-1">
               {!query && (
                   <div className="flex justify-between items-center mb-4">
                       <h3 className="font-semibold text-base dark:text-white">Recent</h3>
                       <button className="text-blue-500 text-sm font-semibold hover:text-blue-700">Clear all</button>
                   </div>
               )}

               {isSearching && (
                   <div className="text-center py-4 text-gray-500 text-xs">Searching...</div>
               )}

               {/* Results */}
               {results.length > 0 ? (
                   <div className="space-y-4">
                       {results.map(user => (
                           <div 
                                key={user.id} 
                                onClick={() => handleUserClick(user.id)}
                                className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900 p-2 -mx-2 rounded-lg transition-colors"
                            >
                               <div className="flex items-center space-x-3">
                                   <img src={user.avatarUrl || 'https://via.placeholder.com/40'} className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-zinc-700" alt={user.username} />
                                   <div>
                                       <div className="font-semibold text-sm dark:text-white">{user.username}</div>
                                       <div className="text-gray-500 text-xs">{user.displayName}</div>
                                   </div>
                               </div>
                           </div>
                       ))}
                   </div>
               ) : query && !isSearching ? (
                   <div className="text-center py-12 text-gray-500">
                       <p>No results found for "{query}"</p>
                   </div>
               ) : null}
               
               {/* Mock Recents if no query */}
               {!query && results.length === 0 && (
                   <div className="text-center py-12 text-gray-400 text-sm">
                       No recent searches.
                   </div>
               )}
           </div>
       </div>
    </div>
  );
};

export default SearchPane;