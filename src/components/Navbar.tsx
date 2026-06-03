import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Briefcase, LogOut, User, Info, LogIn, UserPlus,
  ChevronDown, Home, Menu, X
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  const handleLogout = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setMobileOpen(false);
      try {
        await signOut();
        navigate('/');
      } catch (error) {
        console.error('Error signing out:', error);
      }
    },
    [navigate, signOut]
  );

  const dashboardPath = useMemo(() =>
    userData?.role
      ? userData.role === 'youth' ? '/youth-dashboard' : '/recruiter-dashboard'
      : '/',
    [userData?.role]
  );

  const { t } = useLanguage();

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2 flex-shrink-0" onClick={closeMobile}>
          <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
          {/* Full name on sm+, short name on xs */}
          <span className="hidden xs:inline text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Talent Search Africa
          </span>
          <span className="xs:hidden text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            TSA
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center space-x-2">
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

          {location.pathname !== '/' && (
            <Button variant="ghost" size="sm" asChild className="hover:bg-accent/10">
              <Link to="/" className="flex items-center">
                <Home className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          )}

          {loading ? (
            <Button variant="ghost" size="sm" disabled />
          ) : currentUser ? (
            <>
              <Button variant="ghost" size="sm" asChild className="hover:bg-accent/10">
                <Link to={dashboardPath} className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout} type="button">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login" className="flex items-center">
                  <LogIn className="mr-2 h-4 w-4" />
                  {t('login')}
                </Link>
              </Button>
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
            </>
          )}
        </div>

        {/* Mobile: language toggle + hamburger */}
        <div className="flex items-center space-x-2 md:hidden">
          {!currentUser && <LanguageToggle />}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="p-2 rounded-md hover:bg-accent/10 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background/98 backdrop-blur px-4 py-4 flex flex-col space-y-2">

          <Link
            to="/about"
            onClick={closeMobile}
            className="flex items-center px-3 py-2 rounded-md hover:bg-accent/10 text-sm font-medium"
          >
            <Info className="h-4 w-4 mr-2" />
            {t('about')}
          </Link>

          {location.pathname !== '/' && (
            <Link
              to="/"
              onClick={closeMobile}
              className="flex items-center px-3 py-2 rounded-md hover:bg-accent/10 text-sm font-medium"
            >
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          )}

          <div className="border-t pt-2 mt-1">
            {loading ? null : currentUser ? (
              <>
                <Link
                  to={dashboardPath}
                  onClick={closeMobile}
                  className="flex items-center px-3 py-2 rounded-md hover:bg-accent/10 text-sm font-medium"
                >
                  <User className="h-4 w-4 mr-2" />
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-3 py-2 rounded-md hover:bg-accent/10 text-sm font-medium text-left"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={closeMobile}
                  className="flex items-center px-3 py-2 rounded-md hover:bg-accent/10 text-sm font-medium"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  {t('login')}
                </Link>
                <Link
                  to="/youth-signup"
                  onClick={closeMobile}
                  className="flex items-center px-3 py-2 rounded-md hover:bg-accent/10 text-sm font-medium"
                >
                  <User className="h-4 w-4 mr-2" />
                  Sign up as Youth
                </Link>
                <Link
                  to="/recruiter-signup"
                  onClick={closeMobile}
                  className="flex items-center px-3 py-2 rounded-md hover:bg-accent/10 text-sm font-medium"
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  Sign up as Recruiter
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
