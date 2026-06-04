import { Outlet, useLocation, Navigate, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { Loader2, Bell, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { RecruiterSidebar } from "@/components/dashboard/RecruiterSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function RecruiterLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, userData, loading, signOut } = useAuth();
  useTheme(); // Theme is used for the context, but we don't need the values here
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if user is authenticated
  // Note: Role checking is handled by ProtectedRoute in App.tsx
  // This component is only rendered if the user has the 'recruiter' role
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  // This is a safety check, but ProtectedRoute should have already handled this
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Wait for userData to be loaded before rendering
  // This prevents redirect loops when userData is temporarily null
  if (!userData || !userData.role) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Double-check role to prevent rendering if role changed
  // This is a safety check to prevent showing recruiter dashboard to non-recruiters
  if (userData.role !== 'recruiter') {
    // Don't redirect here - let ProtectedRoute handle it to avoid loops
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Get user initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <RecruiterSidebar />
      
      <div className="flex-1 flex flex-col lg:pl-64">
        {/* Top Navigation */}
        <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center gap-2 sm:gap-4 border-b bg-background px-2 sm:px-4 md:px-6">
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <div className="flex flex-1 items-center gap-4 justify-end">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-full" aria-label="View notifications">
                <Bell className="h-5 w-5" />
                <span className="sr-only">View notifications</span>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userData?.photoURL || ''} alt={userData?.displayName || 'User'} />
                      <AvatarFallback>{getInitials(userData?.displayName || userData?.email)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {userData?.displayName || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {userData?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/recruiter/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/recruiter/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6" role="main">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
