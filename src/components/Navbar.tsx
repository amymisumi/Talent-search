import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Briefcase, LogOut, User, Info, LogIn, UserPlus, ChevronDown, Home } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "./LanguageToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {}

export const Navbar: React.FC<NavbarProps> = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, userData, signOut, loading } = useAuth();
  
  const isActive = useCallback(
    (path: string) => location.pathname === path, 
    [location.pathname]
  );

  const handleLogout = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      try {
        await signOut();
        navigate('/');
      } catch (error) {
        console.error('Error signing out:', error);
      }
    },
    [navigate, signOut]
  );

  // Get the dashboard path based on user role
  const dashboardPath = useMemo(() => 
    userData?.role ? (userData.role === 'youth' ? '/youth-dashboard' : '/recruiter-dashboard') : '/',
    [userData?.role]
  );

  const { t } = useLanguage();

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <Briefcase className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Talent Search Africa
          </span>
        </Link>

        <div className="hidden md:flex items-center space-x-6">
          <Button 
            variant={isActive('/about') ? 'secondary' : 'ghost'} 
            asChild
            className={isActive('/about') ? 'bg-accent/10' : ''}
          >
            <Link to="/about" className="flex items-center">
              <Info className="h-4 w-4 mr-2" />
              {t('about')}
            </Link>
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          {location.pathname !== '/' && (
            <Button 
              variant="ghost" 
              size="sm" 
              asChild
              className="hover:bg-accent/10"
            >
              <Link to="/" className="flex items-center">
                <Home className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          )}
          
          {loading ? (
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" disabled>
              </Button>
            </div>
          ) : currentUser ? (
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                asChild
                className="hover:bg-accent/10"
              >
                <Link to={dashboardPath} className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                type="button"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login" className="flex items-center">
                  <LogIn className="mr-2 h-4 w-4" />
                  {t('login')}
                </Link>
              </Button>
              
              <div className="flex items-center space-x-2">
                <LanguageToggle />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="space-x-1">
                      <UserPlus className="h-4 w-4" />
                      <span>{t('signup')}</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to="/youth-signup" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        As Youth
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/recruiter-signup" className="cursor-pointer">
                        <Briefcase className="mr-2 h-4 w-4" />
                        As Recruiter
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};