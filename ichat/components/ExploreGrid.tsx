import React from 'react';
import { Heart, MessageCircle } from 'lucide-react';

const ExploreGrid: React.FC = () => {
  // Generate random heights for masonry effect simulation
  const items = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    height: i % 3 === 0 ? 'h-96' : 'h-64', // Tall vs Normal
    likes: Math.floor(Math.random() * 1000),
    comments: Math.floor(Math.random() * 100),
    image: `https://picsum.photos/400/${i % 3 === 0 ? '600' : '400'}?random=${i}`
  }));

  return (
    <div className="flex justify-center bg-white dark:bg-black min-h-screen pt-4 pb-4">
      <div className="w-full max-w-[935px] px-4">
        <div className="grid grid-cols-3 gap-1 md:gap-4 auto-rows-[200px]">
          {items.map((item, i) => (
            <div 
                key={item.id} 
                className={`relative group cursor-pointer overflow-hidden ${i % 10 === 1 ? 'row-span-2 col-span-2' : 'row-span-1 col-span-1'} aspect-square`}
            >
              <img 
                src={item.image} 
                alt="Explore" 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center space-x-6 text-white font-bold">
                <div className="flex items-center space-x-1">
                    <Heart fill="white" size={20} />
                    <span>{item.likes}</span>
                </div>
                <div className="flex items-center space-x-1">
                    <MessageCircle fill="white" size={20} />
                    <span>{item.comments}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center py-8 text-gray-500 text-sm">
            Showing all new posts
        </div>
      </div>
    </div>
  );
};

export default ExploreGrid;