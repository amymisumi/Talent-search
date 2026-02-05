import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Home, User, Briefcase, MessageSquare, FileText, Award, BookOpen, Settings, Bell, Plus, Globe, Star, UserCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemeToggle } from '@/components/ThemeToggle';

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
};

const getNavItems = (t: (key: string) => string): NavItem[] => [
  { name: t('home'), icon: <Home className="h-5 w-5" />, path: '/youth/dashboard' },
  { name: t('myProfile'), icon: <User className="h-5 w-5" />, path: '/youth/profile' },
  { name: t('myPortfolio'), icon: <Briefcase className="h-5 w-5" />, path: '/youth/portfolio' },
  { name: t('jobs'), icon: <Briefcase className="h-5 w-5" />, path: '/youth/jobs' },
  { name: t('matches'), icon: <MessageSquare className="h-5 w-5" />, path: '/youth/matches' },
  { name: t('messaging'), icon: <MessageSquare className="h-5 w-5" />, path: '/youth/messages' },
  { name: t('applications'), icon: <FileText className="h-5 w-5" />, path: '/youth/applications' },
  { name: t('certificates'), icon: <Award className="h-5 w-5" />, path: '/youth/certificates' },
  { name: t('reviewsAndRatings'), icon: <Star className="h-5 w-5" />, path: '/youth/reviews' },
  { name: t('learning'), icon: <BookOpen className="h-5 w-5" />, path: '/youth/learning' },
  { name: t('settings'), icon: <Settings className="h-5 w-5" />, path: '/youth/settings' },
];

export function YouthLayout() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = getNavItems(t);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Simulate unread notifications count
  useEffect(() => {
    // TODO: Replace with actual notification count from your backend
    setUnreadCount(3);
  }, []);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile menu button */}
      <button
        type="button"
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <span className="sr-only">Open sidebar</span>
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 h-screen border-r border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-64',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b px-4">
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <UserCircle className="h-6 w-6 text-primary" />
                <span className="font-semibold">Youth</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8"
            >
              <UserCircle className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground w-full',
                      isActive && 'bg-accent text-accent-foreground',
                      isCollapsed && 'justify-center px-2'
                    )}
                  >
                    <span className="flex items-center justify-center w-4 h-4 flex-shrink-0">
                      {item.icon}
                    </span>
                    {!isCollapsed && (
                      <span className="truncate">{item.name}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t p-4">
            {!isCollapsed && (
              <div className="space-y-2">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="flex-shrink-0">
                    <img
                      className="h-8 w-8 rounded-full"
                      src={user?.photoURL || '/default-avatar.png'}
                      alt="User profile"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user?.displayName || 'User'}
                    </p>
                    <button
                      onClick={signOut}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
                <ThemeToggle />
              </div>
            )}
            {isCollapsed && (
              <div className="flex flex-col items-center gap-2">
                <img
                  className="h-8 w-8 rounded-full"
                  src={user?.photoURL || '/default-avatar.png'}
                  alt="User profile"
                />
                <ThemeToggle />
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={cn(
        'flex flex-col flex-1 overflow-hidden transition-all duration-300',
        isCollapsed ? 'lg:pl-16' : 'lg:pl-64'
      )}>
        {/* Top navigation */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-gray-900">
                {navItems.find((item) => item.path === location.pathname)?.name || t('dashboard')}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageToggle />
              
              <button
                type="button"
                className="p-1 text-gray-400 rounded-full hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 relative"
              >
                <span className="sr-only">View notifications</span>
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500">
                    <span className="sr-only">{unreadCount} unread notifications</span>
                  </span>
                )}
              </button>
              
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('createCV')}
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
