import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Award, BarChart3, Bell, Bot, Briefcase, FileText, Home,
  Menu, MessageSquare, Settings, User, Users, X, Star,
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
import { markNotificationAsRead, subscribeToNotifications } from '@/integrations/firebase/services';
import type { Notification } from '@/integrations/firebase/types';

type IconComponent = React.ComponentType<{ className?: string }>;

export type DashboardNavItem = {
  label: string;
  path: string;
  icon: IconComponent;
  badge?: string;
  onClick?: () => void;
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
  notifications, onMarkAsRead, onClose,
}: {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onClose: () => void;
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={dropdownRef} className="absolute right-0 mt-2 w-80 rounded-xl border bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-50">
      <div className="flex items-center justify-between border-b px-4 py-3 dark:border-slate-800">
        <p className="text-sm font-medium">Notifications</p>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>
      <ScrollArea className="max-h-96">
        {notifications.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">You are all caught up!</p>
        ) : (
          <div className="divide-y dark:divide-slate-800">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => onMarkAsRead(n.id)}
                className={cn(
                  'w-full px-4 py-3 text-left transition-colors',
                  n.isRead ? 'bg-transparent hover:bg-muted/50' : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40'
                )}
              >
                <p className="text-sm font-medium">{n.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{n.message}</p>
                <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                </p>
              </button>
            ))}
          </div>
        )}
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
      setNotifications([...data].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    });
    return () => unsubscribe?.();
  }, [currentUser?.uid]);

  // Close sidebar on route change
  useEffect(() => { setIsSidebarOpen(false); }, [location.pathname]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  const activePath = location.pathname;
  const activeTab = new URLSearchParams(location.search).get('tab');

  const initials = useMemo(() => {
    const name = userData?.displayName || currentUser?.displayName || 'U';
    return name.split(' ').map((c) => c.charAt(0)).join('').slice(0, 2).toUpperCase();
  }, [currentUser?.displayName, userData?.displayName]);

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Talent Search</p>
          <p className="text-lg font-bold">{t('dashboard')}</p>
        </div>
        <ThemeToggle />
      </div>

      <ScrollArea className="flex-1">
        <nav className="space-y-1 px-4 py-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const tabMap: Record<string, string> = {
              'Overview': 'overview', 'Users': 'users', 'Verification': 'verification',
              'Reviews': 'reviews', 'Network': 'network', 'Analytics': 'analytics',
              'Reports': 'reports', 'Announcements': 'announcements', 'Settings': 'settings',
            };
            const expectedTab = tabMap[item.label] || item.label.toLowerCase().replace(/\s+/g, '-');
            const isActive = activePath === item.path &&
              (!activeTab || expectedTab === activeTab ||
               (activePath === '/admin-dashboard' && expectedTab === activeTab));

            return (
              <button
                key={item.path + item.label}
                onClick={() => {
                  if (item.onClick) item.onClick();
                  else navigate(item.path);
                  setIsSidebarOpen(false);
                }}
                className={cn(
                  'group flex w-full items-center rounded-2xl px-4 py-3 text-sm font-medium transition-all',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
              >
                <Icon className={cn('mr-3 h-4 w-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t border-border px-4 py-5">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarImage src={currentUser?.photoURL || userData?.photoURL} alt="User avatar" />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {userData?.displayName || currentUser?.displayName || 'Registered talent'}
            </p>
            <Button variant="ghost" size="sm" className="px-0 text-xs text-muted-foreground" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* ✅ Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ✅ Mobile sidebar — slides in from left */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-72 flex-col border-r border-border bg-card/95 backdrop-blur-xl transition-transform duration-300 lg:hidden',
        isSidebarOpen ? 'flex translate-x-0' : 'flex -translate-x-full'
      )}>
        <SidebarContent />
      </aside>

      {/* ✅ Desktop sidebar — always visible on lg+ */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-border lg:bg-card/95 lg:backdrop-blur-xl">
        <SidebarContent />
      </aside>

      <div className="flex w-full flex-col lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
            {/* ✅ Hamburger — mobile only */}
            <button
              className="rounded-full bg-card p-2 shadow border border-border lg:hidden flex-shrink-0"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Heading — truncates on small screens */}
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-widest text-muted-foreground truncate">{heading}</p>
              <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-foreground truncate">{subheading}</h1>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="hidden md:block">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-48 lg:w-64 rounded-full"
                />
              </div>
              <LanguageToggle />
              <div className="relative">
                <Button variant="ghost" size="icon" className="relative" onClick={() => setIsNotificationsOpen((p) => !p)}>
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
                    onMarkAsRead={markNotificationAsRead}
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

        <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
          <div className="rounded-2xl border border-border bg-card/90 p-3 sm:p-6 shadow-lg">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardShell;