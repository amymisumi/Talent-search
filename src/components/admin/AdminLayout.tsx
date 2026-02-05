import React, { useState } from 'react';
import { AdminNavigation } from './AdminNavigation';

interface AdminLayoutProps {
  children: React.ReactNode;
  notificationCount?: number;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  notificationCount = 0
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const handleDarkModeToggle = () => {
    setIsDarkMode(!isDarkMode);
    // In a real implementation, you'd update the theme context or CSS variables
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-slate-900' : 'bg-slate-50'}`}>
      <AdminNavigation
        notificationCount={notificationCount}
        onDarkModeToggle={handleDarkModeToggle}
        isDarkMode={isDarkMode}
      />
      <main className="container mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
};
