import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen w-full bg-cream dark:bg-navy overflow-hidden font-sans">
      {/* Main Content Area - Full width/height since sidebar is removed */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {children}
      </div>
    </div>
  );
};

export default Layout;