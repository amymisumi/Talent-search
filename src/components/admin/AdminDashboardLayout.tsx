import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../integrations/firebase/client';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../hooks/use-toast';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Input } from '../ui/input';
import {
  LayoutDashboard, Users, FileCheck, Star, Network, BarChart3,
  Bell, Settings, Shield, LogOut, Menu, X, Search, Moon, Sun,
  ChevronRight, Home, FileText
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface AdminDashboardLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const AdminDashboardLayout: React.FC<AdminDashboardLayoutProps> = ({
  children, activeTab = 'overview', onTabChange
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { currentUser, userData, signOut: authSignOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await authSignOut();
      navigate('/');
      toast({ title: "Logged out", description: "Successfully logged out from admin dashboard" });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to logout" });
    }
  };

  const navItems = [
    { id: 'overview',          label: 'Overview',         icon: LayoutDashboard, color: 'text-blue-500' },
    { id: 'users',             label: 'User Management',  icon: Users,           color: 'text-purple-500' },
    { id: 'verification',      label: 'Verification',     icon: FileCheck,       color: 'text-green-500' },
    { id: 'reviews',           label: 'Reviews',          icon: Star,            color: 'text-yellow-500' },
    { id: 'network',           label: 'Network',          icon: Network,         color: 'text-pink-500' },
    { id: 'analytics',         label: 'Analytics',        icon: BarChart3,       color: 'text-indigo-500' },
    { id: 'reports-generator', label: 'PDF Reports',      icon: FileText,        color: 'text-blue-400' },
    { id: 'announcements',     label: 'Announcements',    icon: Bell,            color: 'text-cyan-500' },
    { id: 'settings',          label: 'Settings',         icon: Settings,        color: 'text-slate-500' },
  ];

  const handleNavClick = (tabId: string) => {
    onTabChange?.(tabId);
    setSidebarOpen(false);
  };

  const SidebarNav = () => (
    <nav className="flex h-full flex-col overflow-y-auto p-4">
      <div className="space-y-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={cn(
                'group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                  : isDark
                    ? 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-white' : item.color)} />
              <span className="flex-1 text-left truncate">{item.label}</span>
              {isActive && <ChevronRight className="h-4 w-4 flex-shrink-0" />}
            </button>
          );
        })}
      </div>
      <div className={cn('mt-4 pt-4 border-t', isDark ? 'border-slate-700/50' : 'border-gray-200')}>
        <Button
          variant="ghost"
          className={cn('w-full justify-start', isDark ? 'text-slate-300 hover:text-white hover:bg-slate-700/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')}
          onClick={() => navigate('/')}
        >
          <Home className="h-5 w-5 mr-3 flex-shrink-0" />
          Back to Site
        </Button>
      </div>
    </nav>
  );

  return (
    <div className={cn('min-h-screen transition-colors duration-300', isDark ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50')}>

      {/* Top Navigation Bar */}
      <header className={cn('sticky top-0 z-50 border-b backdrop-blur-xl transition-colors duration-300', isDark ? 'border-slate-700/50 bg-slate-800/80' : 'border-gray-200 bg-white/80')}>
        <div className="flex h-14 sm:h-16 items-center justify-between px-2 sm:px-4 lg:px-6 gap-2">
          <div className="flex items-center gap-1 sm:gap-4 min-w-0 flex-1">
            {/* Hamburger */}
            <Button
              variant="ghost" size="icon"
              className={cn('lg:hidden flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10', isDark ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>

            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
              <div className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg flex-shrink-0">
                <Shield className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className={cn('text-xs sm:text-lg font-bold truncate', isDark ? 'text-white' : 'text-gray-900')}>Admin</h1>
                <p className={cn('text-[10px] hidden sm:block truncate', isDark ? 'text-slate-400' : 'text-gray-500')}>Talent Search Africa</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 flex-shrink-0">
            <div className="hidden md:block relative">
              <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4', isDark ? 'text-slate-400' : 'text-gray-400')} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className={cn('w-48 lg:w-64 pl-10', isDark ? 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400' : 'bg-gray-100 border-gray-300')}
              />
            </div>

            <Button variant="ghost" size="icon" className={cn(isDark ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100')} onClick={toggleTheme}>
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            <div className={cn('flex items-center gap-2 border-l pl-2 sm:pl-3', isDark ? 'border-slate-700' : 'border-gray-200')}>
              <Avatar className="h-8 w-8 sm:h-9 sm:w-9 ring-2 ring-blue-500/50 flex-shrink-0">
                <AvatarImage src={currentUser?.photoURL || userData?.photoURL} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs">
                  {currentUser?.displayName?.charAt(0)?.toUpperCase() || 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block min-w-0">
                <p className={cn('text-sm font-medium truncate max-w-[100px]', isDark ? 'text-white' : 'text-gray-900')}>
                  {currentUser?.displayName || 'Admin'}
                </p>
                <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-gray-500')}>Administrator</p>
              </div>
              <Button variant="ghost" size="icon" className={cn(isDark ? 'text-slate-300 hover:text-red-400 hover:bg-slate-700' : 'text-gray-600 hover:text-red-600 hover:bg-gray-100')} onClick={handleLogout}>
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 border-r backdrop-blur-xl transition-all duration-300 pt-16',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          isDark ? 'border-slate-700/50 bg-slate-800/95' : 'border-gray-200 bg-white/95'
        )}>
          <SidebarNav />
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 min-w-0">
          <div className="p-3 sm:p-4 lg:p-6">
            <div className={cn(
              'rounded-2xl backdrop-blur-xl border shadow-2xl p-4 sm:p-6 lg:p-8 transition-colors duration-300',
              isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white/80 border-gray-200'
            )}>
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};