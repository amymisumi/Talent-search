import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Briefcase,
  Bell,
  LogOut,
  User,
  Settings,
  Moon,
  Sun,
  Home,
  BarChart3,
  Info,
  Globe
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { auth } from '../../integrations/firebase/client';
import { signOut } from 'firebase/auth';
import { useToast } from '../../hooks/use-toast';

interface AdminNavigationProps {
  notificationCount: number;
  onDarkModeToggle: () => void;
  isDarkMode: boolean;
}

export const AdminNavigation: React.FC<AdminNavigationProps> = ({
  notificationCount,
  onDarkModeToggle,
  isDarkMode
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language, setLanguage, t } = useLanguage();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
      toast({
        title: "Logged out",
        description: "Successfully logged out from admin dashboard"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to logout"
      });
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-slate-200 shadow-sm">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <Link to="/" className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg">
            <Briefcase className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
              Talent Search Africa
            </span>
            <div className="text-xs text-slate-500 -mt-1">Admin Panel</div>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Link to="/" className="flex items-center space-x-2">
              <Home className="h-4 w-4" />
              <span>Home</span>
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Link to="/admin-dashboard" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Link to="/about" className="flex items-center space-x-2">
              <Info className="h-4 w-4" />
              <span>About</span>
            </Link>
          </Button>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-4">
          {/* Language Switcher */}
          <div className="flex items-center space-x-2">
            <Globe className="h-4 w-4 text-slate-500" />
            <Select
              value={language}
              onValueChange={(value: 'en' | 'sw') => setLanguage(value)}
            >
              <SelectTrigger className="w-20 h-8 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">EN</SelectItem>
                <SelectItem value="sw">SW</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onDarkModeToggle}
            className="w-8 h-8 p-0"
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4 text-slate-600" />
            ) : (
              <Moon className="h-4 w-4 text-slate-600" />
            )}
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="relative w-8 h-8 p-0"
          >
            <Bell className="h-4 w-4 text-slate-600" />
            {notificationCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {notificationCount > 99 ? '99+' : notificationCount}
              </Badge>
            )}
          </Button>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" alt="Admin" />
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Admin User</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    admin@talentsearch.africa
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-red-600 focus:text-red-600"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};
