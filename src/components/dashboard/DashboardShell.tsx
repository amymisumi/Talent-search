import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Award,
  BarChart3,
  Bell,
  Bot,
  Briefcase,
  FileText,
  Home,
  Menu,
  MessageSquare,
  Settings,
  User,
  Users,
  X,
  Star,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  markNotificationAsRead,
  subscribeToNotifications,
} from '@/integrations/firebase/services';
import type { Notification } from '@/integrations/firebase/types';

type IconComponent = React.ComponentType<{ className?: string }>;

export type DashboardNavItem = {
  label: string;
  path: string;
  icon: IconComponent;
  badge?: string;
};

interface DashboardShellProps {
  children: ReactNode;
  navItems?: DashboardNavItem[];
  heading?: string;
  subheading?: string;
}

const getDefaultNavItems = (t: (key: string) => string): DashboardNavItem[] => [
  { label: t('overview'), path: '/youth-dashboard', icon: Home },
  { label: t('profile'), path: '/youth/profile', icon: User },
  { label: t('myPortfolio'), path: '/youth/portfolio', icon: Briefcase },
  { label: t('jobMatches'), path: '/youth/jobs', icon: FileText },
  { label: t('messaging'), path: '/youth/messages', icon: MessageSquare },
  { label: t('certificates'), path: '/youth/certificates', icon: Award },
  { label: t('reviewsAndRatings'), path: '/youth/reviews', icon: Star },
  { label: t('aiAssistant'), path: '/youth/ai-assistant', icon: Bot },
  { label: t('analytics'), path: '/youth/analytics', icon: BarChart3 },
  { label: t('network'), path: '/youth/dashboard?tab=network', icon: Users },
  { label: t('settings'), path: '/youth/settings', icon: Settings },
];

const NotificationDropdown = ({
  notifications,
  onMarkAsRead,
  onClose,
}: {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onClose: () => void;
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  if (notifications.length === 0) {
    return (
      <div
        ref={dropdownRef}
        className="absolute right-0 mt-2 w-80 rounded-xl border bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900"
      >
        <p className="text-sm text-muted-foreground">You are all caught up!</p>
      </div>
    );
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-80 rounded-xl border bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center justify-between border-b px-4 py-3 dark:border-slate-800">
        <p className="text-sm font-medium">Notifications</p>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <ScrollArea className="max-h-96">
        <div className="divide-y dark:divide-slate-800">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => onMarkAsRead(notification.id)}
              className={cn(
                'w-full px-4 py-3 text-left transition-colors',
                notification.isRead
                  ? 'bg-transparent hover:bg-muted/50'
                  : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40'
              )}
            >
              <p className="text-sm font-medium">{notification.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{notification.message}</p>
              <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
              </p>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export const DashboardShell = ({
  children,
  navItems: customNavItems,
  heading = 'Talent Search Youth',
  subheading = 'Track your profile, opportunities, and growth',
}: DashboardShellProps) => {
  const { currentUser, userData, signOut } = useAuth();
  const isRecruiter = userData?.role === 'recruiter';
  const { t } = useLanguage();
  const navItems = customNavItems || getDefaultNavItems(t);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsubscribe = subscribeToNotifications(currentUser.uid, (data) => {
      const sorted = [...data].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      setNotifications(sorted);
    });

    return () => unsubscribe?.();
  }, [currentUser?.uid]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
  };

  const activePath = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab');

  const initials = useMemo(() => {
    const name = userData?.displayName || currentUser?.displayName || 'U';
    return name
      .split(' ')
      .map((chunk) => chunk.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [currentUser?.displayName, userData?.displayName]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="relative flex min-h-screen">
        <button
          className="fixed left-4 top-4 z-50 rounded-full bg-white p-2 shadow-lg transition md:hidden dark:bg-slate-900"
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          aria-label="Toggle navigation menu"
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-100 bg-white/90 backdrop-blur-xl transition-transform dark:border-slate-800 dark:bg-slate-900/90 md:translate-x-0',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          )}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b px-6 py-5 dark:border-slate-800">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Talent Search
                </p>
                <p className="text-lg font-bold">{t('dashboard')}</p>
              </div>
              <ThemeToggle />
            </div>

            <ScrollArea className="flex-1">
              <nav className="space-y-1 px-4 py-6">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  // Check if path matches or if it's admin dashboard and tab matches
                  const tabMap: Record<string, string> = {
                    'Overview': 'overview',
                    'Users': 'users',
                    'Verification': 'verification',
                    'Projects': 'projects',
                    'Reviews': 'reviews',
                    'Network': 'network',
                    'Analytics': 'analytics',
                    'Reports': 'reports',
                    'Announcements': 'announcements',
                    'Activity Logs': 'activity',
                    'Settings': 'settings',
                  };
                  const expectedTab = tabMap[item.label] || item.label.toLowerCase().replace(/\s+/g, '-');
                  const isActive = activePath === item.path && 
                    (!activeTab || expectedTab === activeTab || 
                     (activePath === '/admin-dashboard' && expectedTab === activeTab));
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        if (item.onClick) {
                          item.onClick();
                        } else if (item.path.includes('?')) {
                          navigate(item.path);
                        } else {
                          navigate(item.path);
                        }
                        setIsSidebarOpen(false);
                      }}
                      className={cn(
                        'group flex w-full items-center rounded-2xl px-4 py-3 text-sm font-medium transition-all',
                        isActive
                          ? 'bg-primary/10 text-primary shadow-sm'
                          : 'text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800'
                      )}
                    >
                      <Icon
                        className={cn(
                          'mr-3 h-4 w-4',
                          isActive ? 'text-primary' : 'text-muted-foreground'
                        )}
                      />
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </ScrollArea>

            <div className="border-t px-4 py-5 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={currentUser?.photoURL || userData?.photoURL} alt="User avatar" />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">
                    {userData?.displayName || currentUser?.displayName || 'Registered talent'}
                  </p>
                  <Button variant="ghost" size="sm" className="px-0 text-xs text-muted-foreground" onClick={signOut}>
                    Sign out
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex w-full flex-col md:pl-64">
          <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
            <div className="flex flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{heading}</p>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{subheading}</h1>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden md:block">
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search everything..."
                    className="w-64 rounded-full bg-white/70 dark:bg-slate-900/60"
                  />
                </div>
                <LanguageToggle />
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    onClick={() => setIsNotificationsOpen((prev) => !prev)}
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-destructive-foreground">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                  {isNotificationsOpen && (
                    <NotificationDropdown
                      notifications={notifications.slice(0, 10)}
                      onMarkAsRead={handleMarkAsRead}
                      onClose={() => setIsNotificationsOpen(false)}
                    />
                  )}
                </div>
                {!isRecruiter && (
                  <Button asChild className="hidden md:inline-flex rounded-full px-4">
                    <Link to="/youth/cv-builder">Create CV</Link>
                  </Button>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
            <div className="rounded-3xl border border-slate-100/80 bg-white/90 p-4 shadow-xl shadow-slate-200/40 dark:border-slate-800/70 dark:bg-slate-950/70 dark:shadow-slate-900/60 sm:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardShell;

